// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IBaseAdapter} from "../../../../src/common/crosschain/adapters/IBaseAdapter.sol";
import {Errors} from "../../../../src/common/crosschain/lib/Errors.sol";

/// @notice A bridge-less `IBaseAdapter` implementation used to drive
///         `CrossChainController`'s send path in isolation.
/// @dev DO NOT USE IN PRODUCTION!
///
///      This mock is deliberately built the way a REAL Option-1 adapter must
///      be built: its send path touches NO storage. Every knob is an
///      `immutable` set at construction, and the call is recorded by EMITTING
///      an event rather than by writing state — writing state would land in
///      the controller's slots, which is exactly the bug this design exists to
///      avoid. Tests configure behaviour by deploying a differently
///      parameterised mock, not by calling a setter.
contract AdapterMock is IBaseAdapter {
    address private immutable _controller;
    address private immutable _feeToken;
    uint256 private immutable _fee;
    bytes32 private immutable _messageId;
    address private immutable _feeSink;
    bool private immutable _revertOnSend;
    bool private immutable _revertOnQuote;

    /// @notice Emitted by `sendMessage`; the only record this mock keeps.
    /// @param context `address(this)` at execution time — the CONTROLLER when
    ///        the mock is reached by `delegatecall`, as it must be.
    event SendMessageCalled(
        address context,
        address receiver,
        uint256 destinationChainId,
        uint256 gasLimit,
        bytes message,
        uint256 value
    );

    /// @param controller_ The owning `CrossChainController`.
    /// @param feeToken_ The fee token to report/charge; `address(0)` native.
    /// @param fee_ The fee amount to report/charge.
    /// @param messageId_ The bridge message id `sendMessage` returns.
    /// @param feeSink_ Where the charged fee is sent, standing in for the
    ///        bridge router pulling payment from the fee payer.
    /// @param revertOnSend_ Make `sendMessage` revert.
    /// @param revertOnQuote_ Make `quoteFee` revert.
    constructor(
        address controller_,
        address feeToken_,
        uint256 fee_,
        bytes32 messageId_,
        address feeSink_,
        bool revertOnSend_,
        bool revertOnQuote_
    ) {
        _controller = controller_;
        _feeToken = feeToken_;
        _fee = fee_;
        _messageId = messageId_;
        _feeSink = feeSink_;
        _revertOnSend = revertOnSend_;
        _revertOnQuote = revertOnQuote_;
    }

    // -------------------------------------------------------------------------
    // IBaseAdapter
    // -------------------------------------------------------------------------

    function CROSS_CHAIN_CONTROLLER() external view override returns (address) {
        return _controller;
    }

    function toNativeChainId(
        uint256 _chainId
    ) external pure override returns (uint256) {
        return _chainId;
    }

    function fromNativeChainId(
        uint256 _chainId
    ) external pure override returns (uint256) {
        return _chainId;
    }

    function quoteFee(
        address _receiver,
        uint256 _destinationChainId,
        uint256 _gasLimit,
        bytes calldata _message
    ) external view override returns (address, uint256) {
        (_receiver, _destinationChainId, _gasLimit, _message);
        // solhint-disable-next-line custom-errors, reason-string
        if (_revertOnQuote) revert("AdapterMock: quoteFee reverted");
        return (_feeToken, _fee);
    }

    /// @dev Mirrors a real adapter: guards the execution context, checks the
    ///      FEE PAYER's balance (which under `delegatecall` is the controller's)
    ///      and moves the fee out of it.
    function sendMessage(
        address _receiver,
        uint256 _destinationChainId,
        uint256 _gasLimit,
        bytes calldata _message
    ) external payable override returns (bytes32 messageId, uint256 fee) {
        if (address(this) != _controller) {
            revert Errors.SEND_PATH_NOT_DELEGATECALLED(address(this));
        }
        // solhint-disable-next-line custom-errors, reason-string
        if (_revertOnSend) revert("AdapterMock: sendMessage reverted");

        address feeToken = _feeToken;
        fee = _fee;

        if (feeToken == address(0)) {
            uint256 balance = address(this).balance;
            if (balance < fee) {
                revert Errors.INSUFFICIENT_FEE_BALANCE(
                    address(0),
                    fee,
                    balance
                );
            }
            if (fee != 0) {
                // solhint-disable-next-line avoid-low-level-calls
                (bool ok, ) = _feeSink.call{value: fee}("");
                if (!ok) revert Errors.NATIVE_TRANSFER_FAILED(_feeSink, fee);
            }
        } else {
            if (msg.value != 0) revert Errors.UNEXPECTED_NATIVE_VALUE();

            uint256 balance = IERC20(feeToken).balanceOf(address(this));
            if (balance < fee) {
                revert Errors.INSUFFICIENT_FEE_BALANCE(feeToken, fee, balance);
            }
            if (fee != 0) {
                // solhint-disable-next-line custom-errors, reason-string
                require(
                    IERC20(feeToken).transfer(_feeSink, fee),
                    "AdapterMock: fee transfer failed"
                );
            }
        }

        emit SendMessageCalled(
            address(this),
            _receiver,
            _destinationChainId,
            _gasLimit,
            _message,
            msg.value
        );

        messageId = _messageId;
    }
}
