#!/bin/bash
## Read the .env file if PROTOCOL_VERSION is not set
if [[ -z "$PROTOCOL_VERSION" ]] && [[ -f .env ]]
then
  echo "Reading .env file"
  export $(cat .env | sed 's/#.*//g' | xargs)
fi
## Check if the env is set
if [ -z "$PROTOCOL_VERSION" ]
then
    echo "env is not set, exiting..."
    exit -1
else
    echo "env PROTOCOL_VERSION is set to: $PROTOCOL_VERSION"
fi
## Delete previous ABI files
rimraf ./abi
## Generate the ABI files
wagmi generate -c wagmi.config.ts
## Generate index.ts file
echo "export * from './abi/$PROTOCOL_VERSION.ts'" > './index.ts'
echo "ABI files generated successfully"