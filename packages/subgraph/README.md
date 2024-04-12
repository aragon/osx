# Aragon OSx Subgraph

## Quick Start

Ensure the monorepo’s dependencies are installed:

```console
yarn
```

## Build Contracts

make sure the Contracts package is compiled:

```console
cd packages/contracts
yarn build
```

## Build & deploy the subgraph

Make sure proper env variables are provided as explained bellow:

- `<GRAPH_KEY>`: The Graph key (this is only needed when deploying on The Graph).
- `<SUBGRAPH_NAME>`: name of the subgraph.
- `<NETWORK_NAME>`: one of the supported networks by subgraph.

You can build and deploy the subgraph using a single `yarn deploy` command:

```console
yarn deploy
```

## Deploy the subgraph via Github actions

- Bump the subgraph version in package.json.
- Create a PR.
- Add label `subgraph:deploy`.

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

Build the contracts as explained above.
Build the subgraph as explained above

run tests:

```console
yarn test
```

### Deploy the subgraph locally

You have the option to deploy your subgraph locally, this is how you can do it.

Make sure u set the env variable `<NETWORK_NAME>` to 'localhost' and `<SUBGRAPH_NAME>` to 'aragon/aragon-core'.

To update the local manifest after the contracts have been compiled,

```console
yarn updateLocalManifest
```

To start:

```console
yarn start:dev
```

When there are changes in the contract's package, run

```console
yarn buildAndStart:dev
```

to force build the hardhat docker image containing the contracts.

Ideally in the future, the docker image should be part of the contract's CI/CD flow. Each time a new version of contracts is released, a new docker image should also be released, and the version number should be changed on the docker-compose in the subgraph directory.

To stop:

```console
yarn stop:dev
```

### Writing the tests

In the tests, most of the time, one needs to do:

- Create an event object.
- Call the handler with this event object.
- Check whether the handler successfully created an entity with the values that came from the event.

The simple code could look like:

```js
let event = createNewProposalCreatedEvent(
  PLUGIN_PROPOSAL_ID,
  ADDRESS_ONE,
  START_DATE,
  END_DATE,
  STRING_DATA,
  [],
  ALLOW_FAILURE_MAP,
  CONTRACT_ADDRESS
);

_handleProposalCreated(event, daoEntityId, STRING_DATA);

assert.fieldEquals('AddresslistVotingProposal', PROPOSAL_ENTITY_ID, 'id', PROPOSAL_ENTITY_ID);
assert.fieldEquals('AddresslistVotingProposal', PROPOSAL_ENTITY_ID, 'dao', daoEntityId);
// ...more fieldEqual calls
```

As one can see, most of the time, event object would be created with some default values, such as in the example. i.e
ADDRESS_ONE, START_DATE, END_DATE,.... So prior to extended class approach, we ended up having default values in the tests themselves, and then calling `assert.fieldEquals` multiple times to check all the fields were stored successfully on the entity. Not only this caused code to become larger and larger, but default values were scattered throughout the whole test codebase. Even though, these default values could be hidden/abstracted away from the main test files, they still have to live somewhere and there's no appropriate files for them to be included in.

Aragon currently uses extended class approach where we dynamically and programatically create extended class that extends from the actual entity classes and append `Extended` to the name. For example: if the entity is called `TokenVotingProposal`, our script generates a class `ExtendedTokenVotingProposal` that extends from `TokenVotingProposal` and adds a couple of helper functions into this class. Most importantly, default values are included in such classes and are not scattered around, ensuring that they only live in their own respective places. Not only that, script also adds `assertEntity` to the class that loops through all the properties and checks whether the entity with those values are included in the database.

```js
export class ExtendedTokenVotingProposal extends TokenVotingProposal {
  withDefaultValues(): ExtendedTokenVotingProposal {
    this.id = PROPOSAL_ENTITY_ID;
    this.dao = DAO_ADDRESS;
    this.plugin = Address.fromHexString(CONTRACT_ADDRESS).toHexString();
    this.pluginProposalId = BigInt.fromString(PLUGIN_PROPOSAL_ID);
    this.creator = Address.fromHexString(ADDRESS_ONE);
    this.open = true;
    this.executed = false;
    this.votingMode = VOTING_MODE;
    /// some more properties
  }

  createEvent_ProposalCreated(
    actions: ethereum.Tuple[],
    description: string = STRING_DATA
  ): ProposalCreated {
    let event = createNewProposalCreatedEvent(
      this.pluginProposalId.toString(),
      this.creator.toHexString(),
      this.startDate.toString(),
      this.endDate.toString(),
      description,
      actions,
      this.allowFailureMap.toString(),
      this.plugin
    );
    return event;
  }

  assertEntity(debug: boolean = false): void {
    let entity = TokenVotingProposal.load(this.id);
    if (!entity) throw new Error('Entity not found');
    let entries = entity.entries;
    for (let i = 0; i < entries.length; i++) {
      let key = entries[i].key;

      let value = this.get(key);

      assert.fieldEquals('TokenVotingProposal', this.id, key, value.displayData());
    }
  }
}
```

There're a couple of things we achieved:

- The default values are not scattered anymore and only live in their appropire extended entity classes.
- There's no need to call `fieldEquals` multiple times for each field in the tests. Simply calling `assertEntity` is enough.
- Creating the events is much simpler, because it uses the same default values that live in the same class which brings much more safety.
- We can easily test to see if the saved entity in the database (fetched by the `id` field) matches the fields _currently_ on the Extended Entity. These will be the default values unless you overwrite them (see below for an example)

Usage of the extended class is the following:

```js
let proposal = new ExtendedTokenVotingProposal().withDefaultValues();
let event = proposal.createEvent_ProposalCreated(actions, STRING_DATA);
_handleProposalCreated(event, proposal.dao, STRING_DATA);
// If the event uses non-default values for a couple of fields
// Update the proposal's fields with those values
proposal.creationBlockNumber = BigInt.fromString(ONE);
proposal.votingMode = VOTING_MODES.get(parseInt(VOTING_MODE)) as string;
// assert
proposal.assertEntity();
```

**How it works behind the hood**

When you have a new entity in the schema, go to `/helpers/method-classes.ts` and add a new class that extends from that entity. Then add the functions that you want this extended class to have.

After running `yarn test`, our script('schema-extender.ts') loops through the classes in method-classes and cleverly generates the `helpers/extended-schema.ts` which can be used in the tests to use Extended classes instead of the original entity classes.

Setting properties on the extended entity (before saving) will allow you to run `assertEntity` to check that the properties _fetched from the database_ match the properties you've just set, else it will use the default values.

In the above example we are asserting that the `creationsBlockNumber` and `votingMode` are set to specific values, while the rest of the entity will be checked against the defaults.

## Github Labels / Workflows

### Workflows

| Filename            | Description                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| subgraph-deploy.yml | Deploys the subgraph on a push to `main` or `develop` or when a pull request is merged. It also updates the changelog if the proper label is set (see below) |
| subgraph-tests.yml  | Runs on each push to any branch and runs the tests                                                                                                           |

### Labels

| Label          | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| subgraph:patch | Applies a patch version bump for the changelog and package.json |
| subgraph:minor | Applies a minor version bump for the changelog and package.json |
| subgraph:major | Applies a major version bump for the changelog and package.json |

## Contributing

If you like what we're doing and would love to support, please review our `CONTRIBUTING_GUIDE.md` [here](https://github.com/aragon/osx/blob/develop/CONTRIBUTION_GUIDE.md). We'd love to build with you.

## Security

If you believe you've found a security issue, we encourage you to notify us. We welcome working with you to resolve the issue promptly.

Security Contact Email: sirt@aragon.org

Please do not use the issue tracker for security issues.
