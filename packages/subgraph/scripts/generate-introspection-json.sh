#!/usr/bin/env bash

if [ -f .env ]
then
  export $(cat .env | sed 's/#.*//g' | xargs)
fi

if [ -z "$NETWORK_NAME" ] || [ -z "$SUBGRAPH_NAME" ]
then
    echo "env variables are not set properly, exiting..."
    exit -1
fi

# Exit script as soon as a command fails.
set -o errexit
# Up docker
docker compose -f docker/docker-compose.yml up -d
# Wait for containers to start
# Get the docker id of the graph-node container
GRAPH_NODE_CONTAINER_ID=$(docker ps -qf "name=graph-node")
# Infinite loop to wait for the graph-node to be ready
while true; do
    # check logs
    if docker logs $GRAPH_NODE_CONTAINER_ID 2>&1 | grep -q "Started all assigned subgraphs"; then
        echo "Graph Node is ready"
        break
    fi
    # wait for 1 second
    echo "Waiting for Graph Node to be ready"
    sleep 1
done
# create subgraph
graph create $SUBGRAPH_NAME-$NETWORK_NAME --node http://localhost:8020
# deploy subgraph
LOCAL=true ./scripts/deploy-subgraph.sh
# make introspection json
FILENAME="docs/schema-introspection.json"
GRAPH_URL="http://localhost:8000/subgraphs/name/$SUBGRAPH_NAME-$NETWORK_NAME"
echo "Fetching introspection query from $GRAPH_URL"
node ./scripts/fetch-introspection-query.js $GRAPH_URL $FILENAME
prettier $FILENAME --write
# down docker
docker compose -f docker/docker-compose.yml down
