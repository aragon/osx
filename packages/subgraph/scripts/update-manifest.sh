#!/usr/bin/env bash

echo ''
echo '> Building manifest file subgraph.yaml'

set -o errexit
# networks=$(ls -l ../../contracts/deployments | awk '$1 ~ /^d/ {print $9}')
#   echo "$networks"
  
#   for network in $networks; do
#     if [ -d "../../contracts/deployments/$network" ]; then
#       networkName="$network"
#       networkPath="../../contracts/deployments/$networkName/$networkName"
#       echo "$networkName"
#       echo "$networkPath"
#     fi
#   done
