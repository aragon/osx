// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {IDAO} from "../../../../src/common/dao/IDAO.sol";

/// @notice Minimal helper that DELEGATECALLS into a target with caller-supplied
///         calldata, bubbling the target's exact revert data on failure.
/// @dev DO NOT USE IN PRODUCTION! Test-only.
///
///      Exists to drive two execution contexts the real `CrossChainController`
///      cannot produce, because its own public entry points already validate
///      the relevant scenarios away before any `delegatecall` happens:
///
///        1. `BaseAdapter._forwardMessage`'s `DELEGATE_CALL_FORBIDDEN` guard --
///           reached by delegatecalling `ccipReceive` (the RECEIVE path) into
///           an adapter instead of calling it normally, so the adapter's
///           storage-reading receive code runs against a foreign contract's
///           (this one's) storage instead of its own.
///
///        2. `CCIPAdapter.sendMessage`'s `RECEIVER_ADDRESS_ZERO` and
///           `UNEXPECTED_NATIVE_VALUE` checks, which sit behind
///           `onlyDelegatecallFromController` (`address(this) ==
///           CROSS_CHAIN_CONTROLLER`). The real controller's `forwardMessage`
///           always supplies a non-zero receiver and is not `payable`, so both
///           branches are unreachable through that entry point. Deploying an
///           adapter whose `CROSS_CHAIN_CONTROLLER` is set to THIS contract's
///           address lets the guard be satisfied and the checks behind it
///           exercised directly, in isolation.
///
///      Implements `dao()` purely so `BaseAdapter`'s constructor -- which calls
///      `CrossChainController(_crossChainController).dao()` to adopt a
///      permission manager -- succeeds when an adapter is constructed with
///      this contract as its `CROSS_CHAIN_CONTROLLER`. The returned DAO is not
///      otherwise used by the isolation tests.
contract DelegateCallerMock {
    IDAO public immutable dao;

    constructor(IDAO _dao) {
        dao = _dao;
    }

    /// @notice Delegatecalls `_target` with `_data`; on failure, reverts with
    ///         the target's exact revert data instead of swallowing it, so
    ///         callers can use `vm.expectRevert` normally.
    function delegateCall(
        address _target,
        bytes calldata _data
    ) external payable returns (bytes memory returndata) {
        bool success;
        (success, returndata) = _target.delegatecall(_data);
        if (!success) {
            if (returndata.length == 0) revert();
            // solhint-disable-next-line no-inline-assembly
            assembly {
                revert(add(returndata, 32), mload(returndata))
            }
        }
    }
}
