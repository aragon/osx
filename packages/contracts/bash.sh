#!/bin/bash

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
    "PLUGIN_REPO_FACTORY"
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
mkdir repos
cd repos


# Loop through each item in the 'repos' array
for index in $(echo "$content" | yq 'keys | .[]'); do
    isTurnedOn=$(echo "$content" | yq ".[$index].turned_on")

    if [ "$isTurnedOn" = false ] ; then
        continue
    fi

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
    git clone --branch $branch $github_repo_uri
    cd $id 

    env_location=$(pwd)/$(echo "$content" | yq ".[$index].env_location")/.env
    echo "# Generated .env file " > "$env_location"

    yarn
    cd $root_path
    yarn
    yarn link @aragon/osx-commons-contracts

    
    if [ "$env" != null ] ; then
        echo "great hahaha"
        echo "$env" | yq 'to_entries | .[] | "\(.key)=\(.value)"' -r >> "$env_location"
    fi

    echo "$private_key_name=$PRIVATE_KEY" >> "$env_location"
    echo "ETHERSCAN_API_KEY=$ETHERSCAN_API_KEY" >> "$env_location"
    echo "ALCHEMY_API_KEY=$ALCHEMY_API_KEY" >> "$env_location"

    echo "NETWORK_RPC_URL=$NETWORK_RPC_URL" >> "$env_location"
    echo "CHAIN=$CHAIN" >> "$env_location"
    echo "VERIFIER=$VERIFIER" >> "$env_location"
    echo "NETWORK_NAME=$NETWORK_NAME" >> "$env_location"
    echo "PROTOCOL_VERSION=$PROTOCOL_VERSION" >> "$env_location"
    echo "PLUGIN_REPO_FACTORY=$PLUGIN_REPO_FACTORY" >> "$env_location"

    ### If the plugin is written on foundry, we need to remap.
    if [[ "$project_type" = "foundry" ]] ; then
        forge remappings
        yarn link @aragon/osx
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
        if yarn $deploy_command --network sepolia --tags $deploy_tags ; then
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