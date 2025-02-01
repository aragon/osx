#!/bin/bash
set -e

root_dir=$(pwd)
fork=$1

echo 
echo "📝 Reading deployed-contracts.json to fetch plugin repo factory address and placeholder setup.."
echo 

PLUGIN_REPO_FACTORY_ADDRESS=$(jq -r '.PluginRepoFactory.address' deployed-contracts.json)
PLACEHOLDER_SETUP=$(jq -r '.PlaceholderSetup.address' deployed-contracts.json)
MANAGEMENT_DAO=$(jq -r '.ManagementDAOProxy.address' deployed-contracts.json)

echo
echo "🔹 PluginRepoFactory Address:"
echo "   ➤ $PLUGIN_REPO_FACTORY_ADDRESS"
echo "🔹 PlaceholderSetup Address:"
echo "   ➤ $PLACEHOLDER_SETUP"
echo "🔹 Management DAO Address:"
echo "   ➤ $MANAGEMENT_DAO"
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
    "PUB_PINATA_JWT"
    "VERIFIER_URL"
)

### Fail if one of the .env is not present
for var in "${required_vars[@]}"; do
  # Dynamically assign the value from .env to the variable
  # Strip the single/double quotes.
  declare "$var=$(grep "^$var=" .env | cut -d '=' -f2 | sed "s/[\"']//g")"

  # Check if the variable is empty
  if [ -z "${!var}" ]; then
    echo "Error: $var is missing or empty."
    exit 1
  fi
done

merge_json() {
    local target=$1
    local src=$2

    ### Merge deployed_contract.json's content that is 
    ### inside the specific plugin repository into
    ### main deployed-contracts.json
    jq -s '.[0] + .[1]' "$target" $src > "$target.tmp" && \
    mv "$target.tmp" "$target"
}

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
    yarn link @aragon/osx-commons-sdk
    
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
    echo "MANAGEMENT_DAO_ADDRESS=$MANAGEMENT_DAO" >> "$env_location"

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
    if [[ "$project_type" = "hardhat" ]]; then
        yarn $deploy_command --network $NETWORK_NAME --tags $deploy_tags || exit
    fi

    if [[ "$project_type" = "foundry" ]]; then 
       broadcast=true yarn $deploy_command || exit
    fi

    echo "Deploy command succeeded"
    ### see merge_json's description
    merge_json $root_dir/deployed-contracts.json deployed-contracts.json

done
