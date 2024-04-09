#!/usr/bin/env bash

if [ -f .env ]
then
  export $(cat .env | sed 's/#.*//g' | xargs)
fi

if [ -z "$NETWORK_NAME" ] || [ -z "$SUBGRAPH_NAME" ] || [ -z "$GRAPH_KEY" ] || [ -z "$SUBGRAPH_VERSION" ]
then
    echo "env variables are not set properly, exiting..."
    exit -1
fi

# Exit script as soon as a command fails.
set -o errexit
# Up docker
docker-compose -f docker/docker-compose.yml up -d
# Wait for containers to start
sleep 10
# create subgraph
graph create $SUBGRAPH_NAME-$NETWORK_NAME --node http://localhost:8020
# deploy subgraph
LOCAL=true ./scripts/deploy-subgraph.sh
# make introspection json
FILENAME="docs/schema-introspection.json"
GRAPH_URL="http://localhost:8000/subgraphs/name/$SUBGRAPH_NAME-$NETWORK_NAME"
node ./scripts/fetch-introspection-query.js $GRAPH_URL $FILENAME
prettier $FILENAME --write
# down docker
docker-compose -f docker/docker-compose.yml down