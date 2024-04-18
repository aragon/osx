# SemVer Classification of OSx Contract Changes

## Semantic Versioning

We use the semver notation to version the OSx Protocol smart contract and to classify changes into MAJOR, MINOR, or PATCH.

> Given a version number MAJOR.MINOR.PATCH, increment the:
>
> 1. MAJOR version when you make incompatible API changes
> 2. MINOR version when you add functionality in a backwards compatible manner
> 3. PATCH version when you make backwards compatible bug fixes

## Change Classifications

We now classify [smart contract changes](01-systems.md#smart-contracts) according to SemVer and how they affect the [the subgraph](01-systems.md#the-subgraph), consumers of the contracts and the subgraph such as the [the SDK or 3rd party projects](01-systems.md#sdk-3rd-party-projects-contract--subgraph-consumers), and [the App](01-systems.md#app).

| SemVer Classification | Change in                                    | Affected contracts    | Action                    | Contract Implication (OSx or 3rd party)                                | Subgraph                                                     | SDK                                                          | App                                                          |
| --------------------- | -------------------------------------------- | --------------------- | ------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| major                 | [storage](#storage) change                   | stateful              | change, removal           | adaptation needed, potential exploits, unexpected behavior             | reverting calls, wrong values                                | reverting calls, wrong values                                | reverting calls, wrong values                                |
| major                 | [inheritance](#inheritance)                  | stateful, upgradeable | addition, change, removal | adaptation needed, storage corruption                                  |                                                              |                                                              |                                                              |
| major                 | [event](#event) change                       | logging               | change, removal           |                                                                        | adaptation needed, errors                                    | adaptation needed, reverting calls                           | reverting calls                                              |
| major                 | [external function](#external) header change | interface reliant     | change, removal           | adaptation needed, reverting calls                                     | errors                                                       | errors, reverting calls                                      | adaptation needed, errors                                    |
| major                 | [external function](#external) removal       | interface reliant     | removal                   | adaptation needed, fallback triggering, reverting calls                | errors                                                       | adaptation needed, errors                                    | adaptation needed, errors                                    |
| major                 | [enum](#enum) change                         |                       | change, removal           | potential exploits, reverting calls, unexpected behavior, wrong values | unexpected behavior, wrong values                            | unexpected behavior, wrong values                            | unexpected behavior, wrong values                            |
| minor                 | [storage](#storage) addition                 | stateful, upgradeable | addition                  |                                                                        |                                                              |                                                              |                                                              |
| minor                 | [event](#event) addition                     |                       | addition                  |                                                                        | adaptation needed                                            | adaptation needed                                            |                                                              |
| minor                 | [external function](#external) addition      |                       | addition                  | feature addition                                                       |                                                              | feature addition                                             | feature addition                                             |
| major, minor, patch   | [external function](#external) body change   |                       | change                    | feature addition                                                       |                                                              |                                                              |                                                              |
| minor, patch          | [internal function](#internal)               |                       | addition, change, removal |                                                                        |                                                              |                                                              |                                                              |
| minor, patch          | [enum](#enum) addition                       |                       | addition                  |                                                                        | adaptation needed, errors, fallback triggering, wrong values | adaptation needed, errors, fallback triggering, wrong values | adaptation needed, errors, fallback triggering, wrong values |
| patch                 | [custom error](#custom-error)                |                       | addition, change, removal | adaptation needed                                                      |                                                              | adaptation needed                                            |                                                              |
| patch                 | [constant/immutable](#constant-or-immutable) |                       | addition, change, removal |                                                                        |                                                              |                                                              |                                                              |
| UNCLEAR               | [compiler version](#compiler-version)        |                       | change                    | adaptation needed                                                      |                                                              |                                                              |                                                              |
|                       |                                              |                       |                           |                                                                        |                                                              |                                                              |                                                              |
| patch                 | [file path](#file-path)                      | all                   | change                    | adaptation needed                                                      | adaptation needed                                            | adaptation needed                                            |                                                              |
|                       |                                              |                       |                           |                                                                        |                                                              |                                                              |                                                              |

### Storage

- Addition
  Be aware that public constatns/immutables affect the `interfaceId`.
  Implementation

  - **IF** contract is **NOT** upgradeable
    - no action required
  - **IF** contract is upgradeable

    - [ ] the storage slot must be strictly appended
      - it must be added after all previously declared storage
        - **IF** struct in a mapping, the new field must be appended at the end of the struct
        - **IF** array, this can break storage **(discovery needed**)
    - [ ] the storage gap at the bottom must be reduced
    - [ ] double-checked that inheriting contracts are not affected
    - [ ] Add default value (if not 0) to initializer

      - [ ] increase the initializer version counter by 1
      - [ ] Double-check that initializer is called by deploy script/update actions

  Testing

  - [ ] write unit tests checking that the storage is set and initialized correctly
  - **IF** contract is upgradeable

  - [ ] write regression tests
    - [ ] test the storage is not corrupted in the upgrade
  - [ ] write integration tests
    - [ ] Apply the update on a fork and check that nothing breaks (e.g., use the managing DAO as a testing DAO)

- Change

  - should be avoided
    - exceptions can be in repurposing in controlled scenarios
      - e.g., if an `address` variable is used for another purpose after an upgrade is happened, it must be made sure that the variable is brought into a controlled state, e.g. is immediately initialized with `initializeFrom`/`upgradeToAndCall`

- Removal

  - must never happen

    - this will shift down the storage layout and can lead to unexpected behavior and potential exploits

  - exception is explicit deprecation

The reordering / removal of fields in structs being stored in dynamic arrays or mappings (that are stored as a hashtable) corrupt the hash table entries, not subsequent storage in the contract slot. More discovery is needed here.

### Inheritance

- not easily possible if the base class introduces storage and therefore needs a storage gap itself, which is likely the case
  - new contract needs to inherit from the previous implementation
  - methods affected must be virtual to be overriden
  - initialization gets convoluted
    - the double initialization problem must be avoided

See the [OpenZepplin article on multiple inheritance](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance).

### Function

#### External

- Addition

  - **IF** used by SDK

    - [ ] adapt SDK

  - **IF** used by App
    - [ ] adapt App

- Change

  - Body
    A change to a function body can change the behaviour of the function requiring dependent contracts or software systems to change

    - **IF** used by SDK

      - [ ] adapt SDK

    - **IF** used by App
      - [ ] adapt App

    Behavioural changes that can be **major** / breaking

    - additional checks that result in external contracts reverting
    - making different internal or external calls
    - different execution or storing logic

    Behavioural changes that can be **minor**

    - storing new values

    Non-behavioural changes that classify as **patch**

    - gas optimizations

    - logic simplification

  - Header
    - this changes the function signature
    - this changes the interface of the contract and its `interfaceId`
      - if the contract supports ERC-165, the new version will not be recognized anymore
        - every contract that needs to detect it must adapt and be upgraded / redeployed

- Removal

  - this changes the interface of the contract and its `interfaceId`
  - if an external contract uses this external function, it breaks
  - if the contract supports ERC-165, the new version will not be recognized anymore

    - every contract that needs to detect it must adapt and be upgraded / redeployed

  - changes in depending software systems
  - other, relying or managing OSx contracts
    - SDK
    - subgraph
    - App

#### Internal

Similar to an [external function body change](#external) change, a change to a function body can alter the behavior of the function.
Inheriting contracts or depending software systems must adapt.

### Event

- Addition

  - [ ] adapt subgraph handler function
  - [ ] write subgraph tests
  - **IF** the contracts is upgradable

- Change

  - [ ] add the new fields / entities and listen to the same address
  - [ ] adapt depending software so that it can handle entities in which the field is not set yet

  - **IF** the contract is **NOT** upgradeable
  - a new contract must be deployed
    - old instances still in use will still emit the old event
  - the subgraph needs to listen to both contracts
  - **IF** used by SDK
  - [ ] adapt SDK

- Renaming
  This can happen when we find a typo in the name or have to rename it for standardization purposes
  - [ ] adapt subgraph to handle new function name
  - [ ] change SDK to parse with the correct ABI

### Enum

- Addition

  - enum declarations do NOT affect the interface

  - **IF** used by SDK

    - [ ] adapt SDK

  - **IF** used by App
    - [ ] adapt App

- Change
  - enum declarations do NOT affect the interface
  - depending code logic might change / break if:
  - the enum items order is changed or items are removed
    - Enum order changes can open vulnerabilities because values set represent a different value/meaning
  - Enums used as keys in mappings or arrays shouldn’t be allowed to be changed
  - the enum is deleted

### Custom Error

**IF** these errors affect the behavior or the SDK / App handles these errors, the respective components must adapt.

### Constant or Immutable

Logic using the constants / immutable variables must be adapted

Be aware that public constatns/immutables change the `interfaceId`.

### Compiler Version

This can be caused by vulnerability being detected in an earlier version https://docs.soliditylang.org/en/latest/bugs.html or new features being introduced.

- the contracts affected by the vulnerability must be redeployed
- depending on the pragma change, this can cause incompatibilities with other internal or external contracts

### File Path

Inheriting contracts must use the new file path.
