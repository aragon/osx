---
title: Upgradeable Plugins
---

## Developing a Upgradeable Plugin

As outlined in the previous section about the different [plugin types](../02-plugin-types.md), upgradeable contracts offer advantages because you can cheaply change or fix the logic of your contract without losing the storage of your contract.
The drawbacks are that

- there are plenty of ways to make a mistake
- the changeable logic poses a new attack surface

In any case, writing an upgradeable contract is an advanced topic. This also applies to writing upgradeable Aragon OSx plugins although we abstracted most of the complications of the upgrade process away for you.

### Prerequisites

- You have read about the different [plugin types](../02-plugin-types.md) and decided to develop an upgradeable plugin being deployed via the [UUPS pattern (ERC-1822)](https://eips.ethereum.org/EIPS/eip-1822).
- You know how to write [non-upgradeable plugin](../03-non-upgradeable-plugin/index.md)
- You know about the difficulties and pitfalls of ["Writing Upgradeable Contracts"](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable) that come with
  - modifiying the storage layout
  - initialization
  - inheritance
  - leaving storage gaps
