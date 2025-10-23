#!/usr/bin/env bash

# Sync the addresses from osx-commons/configs

usage() {
  echo "Usage: $(basename "$0") <source_directory> <destination_file>" >&2
  echo "  <source_directory>: Path to the directory containing the source JSON files." >&2
  echo "  <destination_file>: Path to the addresses.json file to be created/overwritten." >&2
}

if [[ $# -ne 2 ]]; then
  echo "Error: Expected 2 arguments." >&2
  usage
  exit 1
fi

SOURCE_DIR="$1"
DEST_FILE="$2"

UNSUPPORTED_NETWORKS=(
    # deprecated
    "goerli"
    "baseGoerli"
    # development
    "devSepolia"
    # not upgraded
    "mumbai"
    "lineaSepolia"
)

# Checks

if [[ ! -d "$SOURCE_DIR" ]]; then
    echo "Error: Source directory '$SOURCE_DIR' not found." >&2
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: 'jq' command not found. Please install jq." >&2
    exit 1
fi

if [ "$SOURCE_DIR" == "$(dirname $DEST_FILE)" ]; then
    echo "Error: The destination file cannot be in the same path as the destination file" >&2
    exit 1
fi

# Helpers

containsElement () {
  local seeking=$1; shift
  local in=1 # Default is not found (bash false)
  for element; do
    if [[ "$element" == "$seeking" ]]; then
      in=0 # Found (bash true)
      break
    fi
  done
  return $in
}

networkAlias () {
    local network="$1"

    if [[ "$network" == "baseMainnet" ]]; then printf "base"
    elif [[ "$network" == "bscMainnet" ]]; then printf "bsc"
    elif [[ "$network" == "modeMainnet" ]]; then printf "mode"
    elif [[ "$network" == "zksyncMainnet" ]]; then printf "zksync"
    else printf "$network"
    fi
}

getContractAddrs () {
    local SRC_CONTRACT_NAME="$1"
    local DEST_CONTRACT_NAME="$2"

    # Create a temporary file to store intermediate JSON structures
    # Each line in this file will be a JSON object like: {"DAO": {"network_name": "address"}}
    TEMP_MERGE_FILE=$(mktemp)
    trap 'rm -f "$TEMP_MERGE_FILE"' EXIT

    # List source address files
    find "$SOURCE_DIR" -maxdepth 1 -name '*.json' | sort | while read source_file; do
        filename=$(basename "$source_file")
        network="${filename%.json}"

        if containsElement "$network" "${UNSUPPORTED_NETWORKS[@]}"; then
            echo "Skipping deprecated network: $network" >&2
            continue
        fi

        echo "Processing $filename:" >&2

        # Extract the address
        value=$(jq -er ".[\"v1.4.0\"].$SRC_CONTRACT_NAME.address // .[\"v1.3.0\"].$SRC_CONTRACT_NAME.address // empty" "$source_file")
        jq_exit_code=$?

        if [[ $jq_exit_code -ne 0 || "$value" == "null" ]]; then
            echo "  Warning: Could not find '$SRC_CONTRACT_NAME' under 'v1.4.0' or 'v1.3.0' in '$filename'. Skipping." >&2
            continue
        fi

        echo "  Found $value" >&2
        jq -n --arg contractName "$DEST_CONTRACT_NAME" --arg network "$(networkAlias $network)" --arg address "$value" \
            '{($contractName): {($network): $address}}' >> "$TEMP_MERGE_FILE"
    done

    echo "Merging addresses" >&2

    # Print to the function's stdout
    jq -s "map(.$DEST_CONTRACT_NAME) | add | {$DEST_CONTRACT_NAME: .}" "$TEMP_MERGE_FILE"

    if [[ $? -ne 0 ]]; then
        echo "Error: Failed to merge the values into '$DEST_FILE'" >&2
        exit 1
    fi
}

# Ready

echo "Processing $SOURCE_DIR"

TEMP_OUTPUT=$(mktemp)
DAO_MERGED_ADDRS_FILE=$(mktemp)
DAO_FACTORY_MERGED_ADDRS_FILE=$(mktemp)
DAO_REGISTRY_MERGED_ADDRS_FILE=$(mktemp)
PLUGIN_REPO_FACTORY_MERGED_ADDRS_FILE=$(mktemp)
PLUGIN_REPO_REGISTRY_MERGED_ADDRS_FILE=$(mktemp)
PLUGIN_SETUP_PROCESSOR_MERGED_ADDRS_FILE=$(mktemp)
EXECUTOR_MERGED_ADDRS_FILE=$(mktemp)

trap 'rm -f "$TEMP_OUTPUT"' EXIT
trap 'rm -f "$DAO_MERGED_ADDRS_FILE"' EXIT
trap 'rm -f "$DAO_FACTORY_MERGED_ADDRS_FILE"' EXIT
trap 'rm -f "$DAO_REGISTRY_MERGED_ADDRS_FILE"' EXIT
trap 'rm -f "$PLUGIN_REPO_FACTORY_MERGED_ADDRS_FILE"' EXIT
trap 'rm -f "$PLUGIN_REPO_REGISTRY_MERGED_ADDRS_FILE"' EXIT
trap 'rm -f "$PLUGIN_SETUP_PROCESSOR_MERGED_ADDRS_FILE"' EXIT

# Read
getContractAddrs "DAOBase" "dao" > $DAO_MERGED_ADDRS_FILE
getContractAddrs "DAOFactory" "daoFactory" > $DAO_FACTORY_MERGED_ADDRS_FILE
getContractAddrs "DAORegistryProxy" "daoRegistry" > $DAO_REGISTRY_MERGED_ADDRS_FILE
getContractAddrs "PluginRepoFactory" "pluginRepoFactory" > $PLUGIN_REPO_FACTORY_MERGED_ADDRS_FILE
getContractAddrs "PluginRepoRegistryProxy" "pluginRepoRegistry" > $PLUGIN_REPO_REGISTRY_MERGED_ADDRS_FILE
getContractAddrs "PluginSetupProcessor" "pluginSetupProcessor" > $PLUGIN_SETUP_PROCESSOR_MERGED_ADDRS_FILE
getContractAddrs "Executor" "executor" > $EXECUTOR_MERGED_ADDRS_FILE

# Ensure destination
touch "$DEST_FILE"
if [ ! -s "$DEST_FILE" ]; then echo '{}' > "$DEST_FILE"; fi

# Final merge
jq \
    --slurpfile addrs1 "$DAO_MERGED_ADDRS_FILE" \
    --slurpfile addrs2 "$DAO_FACTORY_MERGED_ADDRS_FILE" \
    --slurpfile addrs3 "$DAO_REGISTRY_MERGED_ADDRS_FILE" \
    --slurpfile addrs4 "$PLUGIN_REPO_FACTORY_MERGED_ADDRS_FILE" \
    --slurpfile addrs5 "$PLUGIN_REPO_REGISTRY_MERGED_ADDRS_FILE" \
    --slurpfile addrs6 "$PLUGIN_SETUP_PROCESSOR_MERGED_ADDRS_FILE" \
    --slurpfile addrs7 "$EXECUTOR_MERGED_ADDRS_FILE" \
    --arg key1 "dao" \
    --arg key2 "daoFactory" \
    --arg key3 "daoRegistry" \
    --arg key4 "pluginRepoFactory" \
    --arg key5 "pluginRepoRegistry" \
    --arg key6 "pluginSetupProcessor" \
    --arg key7 "executor" \
    '. + { ($key1): ( $addrs1 | map(.[$key1] // {}) | add ) }
       + { ($key2): ( $addrs2 | map(.[$key2] // {}) | add ) }
       + { ($key3): ( $addrs3 | map(.[$key3] // {}) | add ) }
       + { ($key4): ( $addrs4 | map(.[$key4] // {}) | add ) }
       + { ($key5): ( $addrs5 | map(.[$key5] // {}) | add ) }
       + { ($key6): ( $addrs6 | map(.[$key6] // {}) | add ) }
       + { ($key7): ( $addrs7 | map(.[$key7] // {}) | add ) }' \
    "$DEST_FILE" > "$TEMP_OUTPUT"

if [[ $? -ne 0 ]]; then
    echo "Error: Failed to merge the values into '$DEST_FILE'" >&2
    exit 1
fi

mv "$TEMP_OUTPUT" "$DEST_FILE"

echo "Addresses written to '$DEST_FILE'"
exit 0
