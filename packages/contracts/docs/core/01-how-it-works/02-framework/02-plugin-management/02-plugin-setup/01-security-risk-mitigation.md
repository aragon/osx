---
title: Security
---

## Risks and Their Mitigation

With the freedom to

### Risks

If a plugin has a bug or vulnerability that can be exploited, this can result in loss of funds or compromise the DAO.

Besides, standard vulnerabilities such as

- re-entrancy
- default function visibility
- leaving contracts uninitialized
- time or oracle manipulation attacks
- integer overflow & underflow

that might be carelessly or intentionally caused, a malicious plugins can hide **backdoors** in its code or request **elevated permissions** in the installation, upgrade, or uninstallation process to the attacker.

#### Backdoors

- [metamorpic contracts](https://a16zcrypto.com/metamorphic-smart-contract-detector-tool/) (contracts, that can be redeployed with new code to the same address)
- malicious repurposing of storage in an update of an upgradeable plugin contract

<!-- Add statement that Aragon will provide / collaborate with 3rd parties to create tools to check for this-->

#### Permissions

Examples for elevated permissions, are the [permissions native to the DAO contract](../../../01-core/02-permissions/index.md/#permissions-native-to-the-dao-contract) such as

- `ROOT_PERMISSION_ID`
- `EXECUTE_PERMISSION_ID`
- `UPGRADE_DAO_PERMISSION_ID`

That should never be granted to untrusted addresses as they can be used to take control over your DAO.

Likewise, one must be careful to not lock your DAO accidentally by

- uninstalling the last governance plugin with `EXECUTE_PERMISSION_ID` permission
- revoking the `ROOT_PERMISSION_ID` permission from itself or
- choosing governance settings and execution criteria that most likely can never be met (e.g., requiring 100% participation for a token vote to pass)

:::note
To Do: This is a draft.
:::

### Mitigation

To mitigate the risks mentioned above, proposals requesting the setup of one or multiple plugins must be carefully examined and reviewed by inspecting

- the implementation contract
- the setup contract, i.e.,
  - the installation and deployment logic
  - the requested permission
  - the helper contracts accompanying the plugin
- the UI components, i.e.,
  - misleading (re-)naming of input fields, buttons, or other elements

Generally, we recommend only installing plugins from trusted, verified sources such as those verified by Aragon.
