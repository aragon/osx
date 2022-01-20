#!/bin/bash

NETWORK=$1
FILE=$NETWORK'.json'
DATA=manifest/data/$FILE

echo 'Generating manifest from data file: '$DATA
cat $DATA

mustache \
  $DATA \
  manifest/subgraph.placeholder.yaml \
  > subgraph.yaml
