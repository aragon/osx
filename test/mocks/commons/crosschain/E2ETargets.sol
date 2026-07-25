// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

/// @notice Stand-in for the remote contract a cross-chain governance action
///         operates on, with a switch that makes it fail on demand.
/// @dev DO NOT USE IN PRODUCTION!
///      Used to drive the failure-then-retry path: lock it so the delivered
///      message fails and is stored, unlock it, then retry.
contract GuardedTarget {
    /// @notice Number of successful `cancelRootUpdate` calls.
    uint256 public cancellations;

    /// @notice The last caller that successfully cancelled. On the destination
    ///         chain this must be the DAO, never the controller or the adapter.
    address public lastCaller;

    /// @notice When true, `cancelRootUpdate` reverts.
    bool public locked;

    /// @notice Thrown while `locked`.
    error Locked();

    /// @notice Locks or unlocks the target.
    function setLocked(bool _locked) external {
        locked = _locked;
    }

    /// @notice The action a cross-chain proposal is meant to perform.
    function cancelRootUpdate() external {
        if (locked) revert Locked();

        cancellations++;
        lastCaller = msg.sender;
    }
}

/// @notice Accepts native currency and records what it received.
/// @dev DO NOT USE IN PRODUCTION!
contract ValueSink {
    /// @notice Total native currency received.
    uint256 public received;

    /// @notice Number of transfers received.
    uint256 public transfers;

    receive() external payable {
        received += msg.value;
        transfers++;
    }
}

/// @notice Refuses every native transfer.
/// @dev DO NOT USE IN PRODUCTION!
///      Used to drive `CrossChainController.sweep`'s `NATIVE_TRANSFER_FAILED`.
contract RejectingReceiver {
    /// @notice Thrown on every incoming transfer.
    error Rejected();

    receive() external payable {
        revert Rejected();
    }
}

/// @notice An adapter whose send path returns FEWER than the two words
///         `CrossChainController._dispatch` expects.
/// @dev DO NOT USE IN PRODUCTION!
///      Stands in for a wrong or malicious adapter registered on a lane. The
///      controller must reject the short return rather than `abi.decode` past
///      the end of it.
contract ShortReturnAdapterMock {
    /// @notice Mirrors `IBaseAdapter.sendMessage`'s selector but returns a
    ///         single word instead of `(bytes32, uint256)`.
    function sendMessage(
        address,
        uint256,
        uint256,
        bytes calldata
    ) external payable returns (bytes32) {
        return bytes32(uint256(1));
    }
}

/// @notice Makes an arbitrary call and SWALLOWS its failure, recording the
///         outcome instead.
/// @dev DO NOT USE IN PRODUCTION!
///      Lets a test assert the exact revert reason of a call made from inside a
///      delivered message, without that revert aborting the delivery itself.
contract CallProbe {
    /// @notice Whether the last probed call succeeded.
    bool public lastSuccess;

    /// @notice The return (or revert) data of the last probed call.
    bytes public lastReturnData;

    /// @notice Number of probes performed.
    uint256 public probes;

    /// @notice Calls `_target` with `_data` and records the result.
    /// @param _target The contract to call.
    /// @param _data The calldata to send.
    function probe(address _target, bytes calldata _data) external {
        probes++;

        // solhint-disable-next-line avoid-low-level-calls
        (lastSuccess, lastReturnData) = _target.call(_data);
    }
}
