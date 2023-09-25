# Software Systems Running the Aragon OSx

## Smart Contracts

Ethereum smart contracts are created at compile time

- with bytecode constituted by
  - the constructor and its arguments
  - functions with
    - modifiers (in place substitution)
      - visibility ( public, external, internal, private)
      - mutability (pure, view)
      - funds access (payable)
  - constants
  - storage slot definitions
  - struct definitions
  - event definitions
  - custom errors
  - enums

During run time, the successful execution of transactions

- alters storage slots
- produces receipts containing event logs

with construction / initialization constituting a special.

## The Subgraph

The subgraph is composed of

- entities
- event handlers listening to certain contracts and populating the entities

OSx contract changes being relevant are:

- addition of an event
- change of an event by
  - addition,
  - rearrangement
  - deletion of fields
- removal of an event

Addition of an event is a compatible change, whereas all other changes are incompatible and force the subgraph to adapt.

## SDK, 3rd-Party Projects (Contract & Subgraph Consumers)

The SDK (as well as 3rd-party projects) queries the subgraph and interacts with the deployed contract’s ABI.

OSx contract changes being relevant are:

- addition of external functions
- change of function signatures
  - input, output, expected usage
  - visibility
  - storage mutability
- change of function bodies
  - storage writes
  - event changes
  - changes in error handling
    - different error messages

If these changes happen on plugin-related components, i.e.,

- `IPlugin`, `Plugin`, `PluginUUPSUpgradeable`, `PluginCloneable`
- `IPluginSetup`, `PluginSetup` `PluginSetupProcessor`
- `IPluginRepo`, `PluginRepo`, `PluginRepoFactory`, `PluginRepoFactory`

this affects integrators of the protocol.

## App

The App queries the subgraph and uses the SDK to interact with the contracts.
In some cases, it makes direct calls to contracts provided by us or third parties.
