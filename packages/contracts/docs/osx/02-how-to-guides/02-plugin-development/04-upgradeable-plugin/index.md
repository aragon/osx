---
title: What are Upgradeable Plugins?
---

## Developing an Upgradeable Plugin

Upgradeable contracts offer advantages because you can cheaply change or fix the logic of your contract without losing the storage of your contract. If you want to review plugin types in depth, check out our [guide on plugin types here](../02-plugin-types.md).

The drawbacks however, are that:

- there are plenty of ways to make a mistake, and
- the changeable logic poses a new attack surface.

Although we've abstracted mot of the complications of the upgrade process away fro you through our Upgradeable Base Template, please know that writing an upgradeable contract is an advanced topic.

## Prerequisites

- You have read about the different [plugin types](../02-plugin-types.md) and decided to develop an upgradeable plugin being deployed via the [UUPS pattern (ERC-1822)](https://eips.ethereum.org/EIPS/eip-1822).
- You know how to write [non-upgradeable plugin](../03-non-upgradeable-plugin/index.md).
- You know about the difficulties and pitfalls of ["Writing Upgradeable Contracts"](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable) that come with
  - modifiying the storage layout
  - initialization
  - inheritance
  - leaving storage gaps
