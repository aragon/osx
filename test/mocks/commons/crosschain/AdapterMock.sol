// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IBaseAdapter} from "../../../../src/common/crosschain/adapters/IBaseAdapter.sol";

/// @notice A fully configurable mock implementing `IBaseAdapter`, used to drive
///         `CrossChainController`'s sending and receiving paths in isolation
///         from any real bridge.
/// @dev DO NOT USE IN PRODUCTION!
contract AdapterMock is IBaseAdapter {
    address private immutable _controller;

    /// @notice The fee token/amount `quoteFee` and `sendMessage` will honor.
    address public feeToken;
    uint256 public fee;

    /// @notice The messageId `sendMessage` will return.
    bytes32 public messageIdToReturn;

    /// @notice When true, `sendMessage` reverts instead of recording the call.
    bool public revertOnSend;

    /// @notice When true, `quoteFee` reverts instead of returning `(feeToken, fee)`.
    bool public revertOnQuote;

    /// @notice Number of times `sendMessage` was successfully called.
    uint256 public sendMessageCallCount;

    // Args recorded from the last successful `sendMessage` call.
    address public lastReceiver;
    uint256 public lastGasLimit;
    uint256 public lastDestinationChainId;
    bytes public lastMessage;
    uint256 public lastValueReceived;

    constructor(address _controllerAddr) {
        _controller = _controllerAddr;
    }

    // -------------------------------------------------------------------------
    // Test configuration
    // -------------------------------------------------------------------------

    function setFee(address _feeToken, uint256 _fee) external {
        feeToken = _feeToken;
        fee = _fee;
    }

    function setMessageId(bytes32 _messageId) external {
        messageIdToReturn = _messageId;
    }

    function setRevertOnSend(bool _revert) external {
        revertOnSend = _revert;
    }

    function setRevertOnQuote(bool _revert) external {
        revertOnQuote = _revert;
    }

    /// @notice Convenience for tests: the ERC20 balance this mock currently
    ///         holds of `_token`, i.e. what the controller transferred to it.
    function tokenBalance(address _token) external view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    // -------------------------------------------------------------------------
    // IBaseAdapter
    // -------------------------------------------------------------------------

    function CROSS_CHAIN_CONTROLLER() external view override returns (address) {
        return _controller;
    }

    function toNativeChainId(uint256 _chainId) external pure override returns (uint256) {
        return _chainId;
    }

    function fromNativeChainId(uint256 _chainId) external pure override returns (uint256) {
        return _chainId;
    }

    function quoteFee(
        address _receiver,
        uint256 _gasLimit,
        uint256 _destinationChainId,
        bytes calldata _message
    ) external view override returns (address, uint256) {
        (_receiver, _gasLimit, _destinationChainId, _message);
        if (revertOnQuote) revert("AdapterMock: quoteFee reverted");
        return (feeToken, fee);
    }

    function sendMessage(
        address _receiver,
        uint256 _gasLimit,
        uint256 _destinationChainId,
        bytes calldata _message
    ) external payable override returns (bytes32) {
        if (revertOnSend) revert("AdapterMock: sendMessage reverted");

        lastReceiver = _receiver;
        lastGasLimit = _gasLimit;
        lastDestinationChainId = _destinationChainId;
        lastMessage = _message;
        lastValueReceived = msg.value;
        sendMessageCallCount++;

        return messageIdToReturn;
    }
}
