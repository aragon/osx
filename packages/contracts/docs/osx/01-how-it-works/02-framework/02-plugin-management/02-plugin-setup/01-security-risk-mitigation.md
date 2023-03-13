---
title: Security
---

## Risks and Their Mitigation

Adding code to your DAO in the form of plugins can introduce risks, particularly, if this code comes from unaudited and untrusted sources.

### Risks

If a plugin has a bug or vulnerability that can be exploited, this can result in loss of funds or compromise the DAO.

Besides, standard vulnerabilities such as

- Re-entrancy
- Default function visibility
- Leaving contracts uninitialized
- Time or oracle manipulation attacks
- Integer overflow & underflow

that might be carelessly or intentionally caused, a malicious plugin can hide **backdoors** in its code or request **elevated permissions** in the installation, upgrade, or uninstallation process to the attacker.

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

### Mitigation

To mitigate the risks mentioned above, proposals requesting the setup of one or multiple plugins must be carefully examined and reviewed by inspecting

- The implementation contract
- The setup contract, i.e.,
  - The installation and deployment logic
  - The requested permission
  - The helper contracts accompanying the plugin
- The UI components, i.e.,
  - Misleading (re-)naming of input fields, buttons, or other elements

Generally, we recommend only installing plugins from trusted, verified sources such as those verified by Aragon.

More information can be found in the How-to guides

- [Operating your DAO](../../../../02-how-to-guides/01-dao/index.md)
- [Developing a Plugin](../../../../02-how-to-guides/02-plugin-development/index.md)
