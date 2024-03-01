#!/bin/sh

API_KEY="E7WHCR4BRTF2W4YPZQMFJZKBEHB6788QN3"

# Deploy and capture the output
cmd=$(yarn deploy --network optimismSepolia --tags VerifyProxies)
echo "Deployment command output:"
echo "$cmd"

# Extract GUIDs based on the new phrase
echo "Extracted GUIDs:"
guids=$(echo "$cmd" | grep -oP 'To check the request status, use \K\S+')
echo "$guids"

if [ -z "$guids" ]; then
  echo "No GUIDs found. Exiting."
  exit 1
fi

# Make API calls for each GUID
echo "API call results:"
echo "$guids" | while read -r guid; do
  if [ -n "$guid" ]; then
    url="https://api-sepolia-optimistic.etherscan.io/api?module=contract&action=checkproxyverification&guid=${guid}&apikey=$API_KEY"
    echo "Calling: $url"
    response=$(curl -s "$url")
    echo "Response: $response"
    echo # Print a newline for readability
  else
    echo "Empty GUID, skipping..."
  fi
done
