---
title: Meta Transactions
---

## Supporting Meta Transactions

Our plugins are compatible with the [ERC-2771 (Meta Transaction)](https://eips.ethereum.org/EIPS/eip-2771) standard, which allows users to send gasless transactions, also known as meta transactions.
This is possible because we use `_msgSender` and `_msgData` context from OpenZepplin's `Context` and `ContextUpgradeable` in our `Plugin`, `PluginCloneable`, and `PluginUUPSUpgradeable` classes.

To support meta transactions, your implementation contract must inherit and override the `Context` implementation with the `_msgSender` and `_msgData` functions provided in OpenGSN's `BaseRelayRecipient`, and use the [DAO's trusted forwarder](../../01-how-it-works/01-core/01-dao/index.md#6-meta-transaction-compatibility).

Below we show for the example of the `TokenVoting` plugin how you can make an existing plugin contract meta-transaction compatible.

```solidity
import {ContextUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol';
import {BaseRelayRecipient} from '@opengsn/contracts/src/BaseRelayRecipient.sol';

contract MyPlugin is PluginUUPSUpgradeable, BaseRelayRecipient {
  function initialize(IDAO _dao) external initializer {
    __PluginUUPSUpgradeable_init(_dao);
    _setTrustedForwarder(dao.getTrustedForwarder());
  }

  // ... the implementation

  function _msgSender()
    internal
    view
    virtual
    override(ContextUpgradeable, BaseRelayRecipient)
    returns (address)
  {
    return BaseRelayRecipient._msgSender();
  }

  function _msgData()
    internal
    view
    virtual
    override(ContextUpgradeable, BaseRelayRecipient)
    returns (bytes calldata)
  {
    return BaseRelayRecipient._msgData();
  }
}
```
