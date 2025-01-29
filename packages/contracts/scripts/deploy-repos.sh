#!/bin/bash
set -e

fork=$1

echo 
echo "📝 Reading deployed_contracts.json to fetch plugin repo factory address and placeholder setup.."
echo 

PLUGIN_REPO_FACTORY_ADDRESS=$(jq -r '.PluginRepoFactory.address' deployed_contracts.json)
PLACEHOLDER_SETUP=$(jq -r '.PlaceholderSetup.address' deployed_contracts.json)


echo
echo "🔹 PluginRepoFactory Address:"
echo "   ➤ $PLUGIN_REPO_FACTORY_ADDRESS"
echo "🔹 PlaceholderSetup Address:"
echo "   ➤ $PLACEHOLDER_SETUP"
echo "⚠️  Make sure it corresponds to the correct chain and deployment."
echo

# Ask for confirmation
read -p "❓ Do you want to continue? (Y/n) " choice

# Normalize input to lowercase
choice=$(echo "$choice" | tr '[:upper:]' '[:lower:]')

if [[ "$choice" != "y" || -z "$choice" ]]; then
  echo "Aborted."
  exit 0
fi

# Sanity check: Validate if the argument is a valid Ethereum address
if ! [[ "$PLUGIN_REPO_FACTORY_ADDRESS" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "Error: The plugin repo factory is not a valid Ethereum address."
  exit 1
fi

# Sanity check: Validate if the argument is a valid Ethereum address
if ! [[ "$PLACEHOLDER_SETUP" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "Error: The placeholder setup is not a valid Ethereum address."
  exit 1
fi

### The env values that must be available in .env
required_vars=(
    "PRIVATE_KEY" 
    "ETHERSCAN_API_KEY" 
    "ALCHEMY_API_KEY" 
    "NETWORK_RPC_URL" 
    "CHAIN" 
    "VERIFIER" 
    "NETWORK_NAME" 
    "PROTOCOL_VERSION"
)

### Fail if one of the .env is not present
for var in "${required_vars[@]}"; do
  # Dynamically assign the value from .env to the variable
  declare "$var=$(grep "^$var=" .env | cut -d '=' -f2)"

  # Check if the variable is empty
  if [ -z "${!var}" ]; then
    echo "Error: $var is missing or empty."
    exit 1
  fi
done


# Read the entire YAML file into a variable
content=$(yq '.repos' repos.yml)
mkdir repos || true
cd repos

repos_dir=$(pwd)

# Loop through each item in the 'repos' array
for index in $(echo "$content" | yq 'keys | .[]'); do
    cd $repos_dir

    # Extract fields for the current item from the in-memory content
    name=$(echo "$content" | yq ".[$index].name")
    github_repo_uri=$(echo "$content" | yq ".[$index].github_repo_uri")
    branch=$(echo "$content" | yq ".[$index].branch")
    root_path=$(echo "$content" | yq ".[$index].root_path")
    id=$(echo "$content" | yq ".[$index].id")
    build_command=$(echo "$content" | yq ".[$index].build_command")
    env=$(echo "$content" | yq ".[$index].env")
    deploy_command=$(echo "$content" | yq ".[$index].deploy_command")
    private_key_name=$(echo "$content" | yq ".[$index].private_key_name")
    project_type=$(echo "$content" | yq ".[$index].project_type")
    deploy_tags=$(echo "$content" | yq ".[$index].deploy_tags")
    
    ### 1. clone the plugin github 
    ### 2. generate .env file in it according to the location provided in repos.yml
    ### 3. run yarn in it and also in the root url(where actual contracts reside).
    ### 4. fill .env file with the values above + any other .env values provided in repo.yml
    ### 5. compile the contracts
    ### 6. deploy the contracts
    git clone --branch $branch $github_repo_uri || true
    cd ${github_repo_uri##*/}

    ## If any updates occured on the branch... 
    git fetch origin $branch
    git reset --hard origin/$branch

    env_location=$(pwd)/$(echo "$content" | yq ".[$index].env_location")/.env
    echo "# Generated .env file " > "$env_location"

    yarn
    cd $root_path
    yarn
    yarn link @aragon/osx-commons-contracts
    yarn link @aragon/osx
    
    if [ "$env" != null ] ; then
        echo "$env" | yq 'to_entries | .[] | "\(.key)=\(.value)"' -r >> "$env_location"
    fi
    
    ### Loop through the env variables and write them in the plugin's .env file.
    for var in "${required_vars[@]}"; do
        echo "$var=${!var}" >> "$env_location"
    done

    echo "$private_key_name=$PRIVATE_KEY" >> "$env_location"
    echo "PLUGIN_REPO_FACTORY_ADDRESS=$PLUGIN_REPO_FACTORY_ADDRESS" >> "$env_location"
    echo "PLACEHOLDER_SETUP=$PLACEHOLDER_SETUP" >> "$env_location"

    if [ "$fork" == true ] ; then
       echo "FORKING_RPC_URL=$NETWORK_RPC_URL" >> "$env_location"
    fi

    ### If the plugin is written on foundry, we need to remap.
    if [[ "$project_type" = "foundry" ]] ; then
        forge remappings
    fi

    ### build
    ### If command fails, better to exit to not cause inconsistency
    if yarn $build_command ; then
        echo "Build command succeeded"
    else
        exit 
    fi


    ### Deploy
    if [[ "$project_type" = "hardhat" ]] ; then 
        if yarn $deploy_command --network $NETWORK_NAME --tags $deploy_tags ; then
            echo "Deploy command succeeded"
        else 
            exit
        fi
    fi

    if [[ "$project_type" = "foundry" ]] ; then 
        if yarn $deploy_command ; then
            echo "Deploy command succeeded"
        else 
            exit
        fi
    fi

done