// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    IRouterClient
} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

/// @notice Minimal CCIP Router mock used to regression-test `CCIPAdapter`.
/// @dev DO NOT USE IN PRODUCTION!
///      Deliberately pulls the ERC20 fee via `transferFrom` — exactly like the
///      real Router does — instead of trusting a pre-existing balance. The old
///      `CCIPAdapter` never approved the router, so a mock that trusted the
///      balance instead of pulling it would silently pass on a broken adapter.
///      This is the regression test for the missing-`forceApprove` bug.
contract CCIPRouterMock is IRouterClient {
    /// @notice The fee returned by `getFee` and required by `ccipSend`.
    uint256 public fee;

    /// @notice Toggle for `isChainSupported`.
    bool public chainSupported = true;

    /// @notice The `messageId` returned by the next `ccipSend` call.
    bytes32 public nextMessageId = keccak256("CCIPRouterMock: default-message-id");

    /// @notice Number of times `ccipSend` was called.
    uint256 public ccipSendCallCount;

    // -- Recorded data of the most recent `ccipSend` call --------------------
    uint64 public lastDestChainSelector;
    bytes public lastReceiver;
    bytes public lastData;
    address public lastFeeToken;
    bytes public lastExtraArgs;
    uint256 public lastMsgValue;
    address public lastCaller;

    /// @notice Sets the fee quoted by `getFee` / required by `ccipSend`.
    function setFee(uint256 _fee) external {
        fee = _fee;
    }

    /// @notice Sets whether `isChainSupported` reports a chain as supported.
    function setChainSupported(bool _supported) external {
        chainSupported = _supported;
    }

    /// @notice Sets the `messageId` the next `ccipSend` call will return.
    function setNextMessageId(bytes32 _id) external {
        nextMessageId = _id;
    }

    /// @inheritdoc IRouterClient
    function isChainSupported(uint64) external view returns (bool) {
        return chainSupported;
    }

    /// @inheritdoc IRouterClient
    function getFee(
        uint64,
        Client.EVM2AnyMessage memory
    ) external view returns (uint256) {
        return fee;
    }

    /// @inheritdoc IRouterClient
    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage calldata message
    ) external payable returns (bytes32) {
        lastDestChainSelector = destinationChainSelector;
        lastReceiver = message.receiver;
        lastData = message.data;
        lastFeeToken = message.feeToken;
        lastExtraArgs = message.extraArgs;
        lastMsgValue = msg.value;
        lastCaller = msg.sender;
        ccipSendCallCount++;

        if (message.feeToken == address(0)) {
            require(msg.value == fee, "CCIPRouterMock: bad native fee");
        } else {
            require(msg.value == 0, "CCIPRouterMock: unexpected native value");
            // Pull the fee exactly like the real Router. Reverts if the
            // caller never approved this contract for at least `fee`.
            require(
                IERC20(message.feeToken).transferFrom(
                    msg.sender,
                    address(this),
                    fee
                ),
                "CCIPRouterMock: transferFrom failed"
            );
        }

        return nextMessageId;
    }
}
