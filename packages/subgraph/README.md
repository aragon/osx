# Zaragoza Subgraph

## Quick Start

Ensure the monorepo’s dependencies are installed:

```console
yarn
```

## Build Contracts

make sure the Contracts package is compiled:

```console
cd packages/contracts
yarn compile
```

## Build & deploy the subgraph

Make sure proper env variables are provided as explained bellow:

- `<GRAPH_KEY>`: The Graph key (this is only needed when deploying on The Graph).
- `<THEGRAPH_USERNAME>`: username of your subgraph (usually your GitHub username).
- `<SUBGRAPH_NAME>`: name of the subgraph.
- `<NETWORK_NAME>`: one of the supported networks by subgraph.

You can build and deploy the subgraph using a single `yarn deploy` command:

```console
yarn deploy
```

## Build only

Generate the `subgraph.yaml` file corresponding to your network:

```console
yarn manifest
```

You can now run the `build` command, which will generate the types and compile the subgraph:

```console
yarn build
```

You are now ready to deploy the subgraph using [the `graph deploy` command](https://thegraph.com/docs/deploy-a-subgraph).

### Test the subgraph

Build the the contracts as explained above.
Build the subgraph as explained above

run tests:

```console
yarn test
```

### Deploy the subgraph locally

You have the option to deploy your subgraph locally, this is how you can do it.

Make sure u set the env variable `<NETWORK_NAME>` to 'localhost'.

to start:

```console
yarn start:dev
```

to stop:

```console
yarn stop:dev
```
