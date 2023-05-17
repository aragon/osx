---
title: How-to Guides
---

## Welcome to our How To Guides on Using the Aragon OSx Protocol!

With a few lines of code, the Aragon OSx protocol allows you create, manage, and change your on-chain organizations, through extending functionality for DAOs through the installation and uninstallation of plugins.

The organizations that survive the longest are the ones that easily adapt to changing circumstances. DAOs too need a way to adapt and evolve, even if they’re governed on an immutable blockchain.

This is where Plugins come in!

### DAO Plugins

DAO Plugins are smart contracts extending the functionality for DAOs

Some examples of DAO Plugins are:

- 💰 Treasury management tools (i.e. staking, yield distributions, etc),
- 👩🏾‍⚖️ Governance mechanisms for collective decision-making (i.e. NFT voting, multi-sig voting, etc)
- 🔌 Integrations with other ecosystem projects (i.e. Snapshot off-chain voting with Aragon on-chain execution, AI-enabled decision-makers, etc)
- …. basically anything you’d like your DAO to do!

In the Aragon OSx protocol, everything a DAO does is decided and implemented through plugins.

Technically speaking, Aragon DAOs are:

- 💳 A treasury: holding all of the DAO’s assets, and
- 🤝 A permission management system: protecting the assets, through checking that only addresses with x permissions can execute actions on behalf of the DAO.

All other functionality is enabled through plugins. This allows DAOs to be extremely flexible and modular as they mature, through installing and uninstalling these plugins as needs arise.

![Aragon DAO](https://res.cloudinary.com/dacofvu8m/image/upload/v1683224604/Screen_Shot_2023-05-04_at_14.21.52_uuogzr.png)

On the technical level, plugins are composed of two key contracts:

- ⚡️ The Plugin implementation contract: containing all of the logic and functionality for your DAO, and
- 👩🏻‍🏫 The Plugin Setup contract: containing the installation, uninstallation and upgrade instructions for your plugin.

![Aragon OSx Plugins](https://res.cloudinary.com/dacofvu8m/image/upload/v1683225098/Screen_Shot_2023-05-04_at_14.31.25_r0qqut.png)

Through plugins, we provide a secure, flexible way for on-chain organizations to iterate as they grow.

We enable everyone to experiment with governance at the speed of software!

Check out our How-To-Guides on:

- [How to Develop your own Plugin](./02-plugin-development/index.md)
- [How to Operate your DAO](./01-dao/index.md)
