// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {
    SafeCast
} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import {
    IRouterClient
} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {
    IAny2EVMMessageReceiver
} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";

import {Errors} from "../../lib/Errors.sol";

import {BaseAdapter} from "../BaseAdapter.sol";
import {IBaseAdapter} from "../IBaseAdapter.sol";

/// @title CCIPAdapter
/// @notice Chainlink CCIP implementation of `IBaseAdapter`.
/// @dev Called (never `delegatecall`ed) by the `CrossChainController`, so this
///      contract's storage is its own and CCIP sees THIS ADAPTER as the sender.
///      The remote side must therefore trust this adapter's address, and
///      `_trustedRemotes[chainId]` here must hold the remote ADAPTER address.
///
///      Fee handling: the controller custodies the funds and hands this adapter
///      exactly the quoted fee per send (native as `msg.value`, ERC20 by
///      transfer immediately before the call). Any remainder is returned to the
///      controller in the same transaction. CCIP does NOT refund overpayment,
///      so the fee is quoted with `getFee` and paid exactly.
/// @custom:security-contact sirt@aragon.org
contract CCIPAdapter is IERC165, IAny2EVMMessageReceiver, BaseAdapter {
    using SafeERC20 for IERC20;

    /// @notice The CCIP Router address.
    IRouterClient public immutable CCIP_ROUTER;

    /// @notice The fee token that will be used to pay for bridge fees.
    ///         `address(0)` means the chain's native currency.
    address public feeToken;

    /// @notice standard chain id -> CCIP chain selector.
    mapping(uint256 => uint64) internal _chainIdToSelector;

    /// @notice CCIP chain selector -> standard chain id.
    mapping(uint64 => uint256) internal _selectorToChainId;

    /// @notice Emitted when the fee token is changed.
    event FeeTokenSet(address feeToken);

    /// @notice Emitted when a chain-id <-> selector pair is set or cleared.
    event ChainSelectorSet(uint256 indexed chainId, uint64 chainSelector);

    /// @notice The receive function must only allow CCIP router.
    modifier onlyRouter() {
        if (msg.sender != address(CCIP_ROUTER)) {
            revert Errors.CALLER_NOT_CCIP_ROUTER();
        }

        _;
    }

    /// @param _crosschainController The owning controller.
    /// @param _ccipRouter The CCIP router on this chain.
    /// @param _feeToken The fee token, or `address(0)` for native.
    /// @param _chainIds The standard chain ids of the configured lanes.
    /// @param _trustedRemoteSenders The remote ADAPTER address per lane.
    /// @param _selectorChainIds The standard chain ids of the selector mapping.
    /// @param _chainSelectors The CCIP selector per entry of `_selectorChainIds`.
    constructor(
        address _crosschainController,
        address _ccipRouter,
        address _feeToken,
        uint256[] memory _chainIds,
        address[] memory _trustedRemoteSenders,
        uint256[] memory _selectorChainIds,
        uint64[] memory _chainSelectors
    ) BaseAdapter(_crosschainController, _chainIds, _trustedRemoteSenders) {
        if (_ccipRouter == address(0)) revert Errors.ZERO_ADDRESS();

        CCIP_ROUTER = IRouterClient(_ccipRouter);
        feeToken = _feeToken;

        _setChainSelectors(_selectorChainIds, _chainSelectors);
    }

    /// @notice Accepts the native fee handed over by the controller.
    receive() external payable {}

    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    /// @notice Sets the fee token used for subsequent sends.
    /// @param _feeToken The new fee token, or `address(0)` for native.
    function setFeeToken(
        address _feeToken
    ) public auth(UPDATE_ADAPTER_CONFIG_PERMISSION_ID) {
        feeToken = _feeToken;

        emit FeeTokenSet(_feeToken);
    }

    /// @notice Sets or clears standard chain id <-> CCIP selector pairs.
    /// @dev New CCIP lanes appear over time, so this must be updatable without
    ///      redeploying the adapter. Pass selector `0` to clear a mapping.
    /// @param _chainIds The standard chain ids.
    /// @param _chainSelectors The CCIP chain selectors.
    function setChainSelectors(
        uint256[] memory _chainIds,
        uint64[] memory _chainSelectors
    ) public auth(UPDATE_ADAPTER_CONFIG_PERMISSION_ID) {
        _setChainSelectors(_chainIds, _chainSelectors);
    }

    // -------------------------------------------------------------------------
    // Sending
    // -------------------------------------------------------------------------

    /// @inheritdoc IBaseAdapter
    function quoteFee(
        address _receiver,
        uint256 _gasLimit,
        uint256 _destinationChainId,
        bytes calldata _message
    ) public view override returns (address, uint256) {
        if (_receiver == address(0)) revert Errors.RECEIVER_ADDRESS_ZERO();

        uint64 destChainSelector = SafeCast.toUint64(
            toNativeChainId(_destinationChainId)
        );

        address currentFeeToken = feeToken;

        return (
            currentFeeToken,
            CCIP_ROUTER.getFee(
                destChainSelector,
                _buildMessage(_receiver, _gasLimit, _message, currentFeeToken)
            )
        );
    }

    /// @inheritdoc IBaseAdapter
    function sendMessage(
        address _receiver,
        uint256 _gasLimit,
        uint256 _destinationChainId,
        bytes calldata _message
    ) public payable override onlyCrossChainController returns (bytes32) {
        if (_receiver == address(0)) revert Errors.RECEIVER_ADDRESS_ZERO();

        // Transform standard chain id into chainlink's chain selector.
        uint64 destChainSelector = SafeCast.toUint64(
            toNativeChainId(_destinationChainId)
        );

        address currentFeeToken = feeToken;

        Client.EVM2AnyMessage memory ccipMessage = _buildMessage(
            _receiver,
            _gasLimit,
            _message,
            currentFeeToken
        );

        // CCIP does not refund overpayment, so quote and pay exactly.
        uint256 fees = CCIP_ROUTER.getFee(destChainSelector, ccipMessage);

        bytes32 messageId;

        if (currentFeeToken == address(0)) {
            uint256 balance = address(this).balance;
            if (balance < fees) {
                revert Errors.INSUFFICIENT_FEE_BALANCE(
                    address(0),
                    fees,
                    balance
                );
            }

            messageId = CCIP_ROUTER.ccipSend{value: fees}(
                destChainSelector,
                ccipMessage
            );
        } else {
            // Native value would be stranded here; the controller custodies it.
            if (msg.value != 0) revert Errors.UNEXPECTED_NATIVE_VALUE();

            uint256 balance = IERC20(currentFeeToken).balanceOf(address(this));
            if (balance < fees) {
                revert Errors.INSUFFICIENT_FEE_BALANCE(
                    currentFeeToken,
                    fees,
                    balance
                );
            }

            // The Router pulls the fee via `transferFrom`.
            IERC20(currentFeeToken).forceApprove(address(CCIP_ROUTER), fees);

            messageId = CCIP_ROUTER.ccipSend(destChainSelector, ccipMessage);

            // Leave no standing allowance.
            IERC20(currentFeeToken).forceApprove(address(CCIP_ROUTER), 0);
        }

        _returnRemainder(currentFeeToken);

        return messageId;
    }

    // -------------------------------------------------------------------------
    // Receiving
    // -------------------------------------------------------------------------

    /// @inheritdoc IAny2EVMMessageReceiver
    function ccipReceive(
        Client.Any2EVMMessage calldata message
    ) external onlyRouter {
        address srcAddress = abi.decode(message.sender, (address));

        // Transform CCIP's chain selector into the standard chain Id.
        uint256 originChainId = fromNativeChainId(message.sourceChainSelector);

        if (
            srcAddress == address(0) ||
            _trustedRemotes[originChainId] != srcAddress
        ) {
            revert Errors.REMOTE_NOT_TRUSTED();
        }

        _forwardMessage(message.messageId, message.data, originChainId);
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return
            interfaceId == type(IAny2EVMMessageReceiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    // -------------------------------------------------------------------------
    // Chain id mapping
    // -------------------------------------------------------------------------

    /// @inheritdoc IBaseAdapter
    /// @dev CCIP addresses lanes by chain SELECTOR, not by EVM chain id, so
    ///      this is a real lookup. Unknown ids revert rather than returning `0`
    ///      (which would target a nonexistent lane).
    function toNativeChainId(
        uint256 _chainId
    ) public view virtual override returns (uint256) {
        uint64 selector = _chainIdToSelector[_chainId];
        if (selector == 0) revert Errors.UNKNOWN_CHAIN_ID(_chainId);
        return selector;
    }

    /// @inheritdoc IBaseAdapter
    function fromNativeChainId(
        uint256 _chainId
    ) public view virtual override returns (uint256) {
        uint256 chainId = _selectorToChainId[SafeCast.toUint64(_chainId)];
        if (chainId == 0) revert Errors.UNKNOWN_NATIVE_CHAIN_ID(_chainId);
        return chainId;
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    function _buildMessage(
        address _receiver,
        uint256 _gasLimit,
        bytes memory _message,
        address _feeToken
    ) internal pure returns (Client.EVM2AnyMessage memory) {
        bytes memory extraArgs = Client._argsToBytes(
            Client.GenericExtraArgsV2({
                gasLimit: _gasLimit,
                allowOutOfOrderExecution: true
            })
        );

        return
            Client.EVM2AnyMessage({
                receiver: abi.encode(_receiver),
                data: _message,
                tokenAmounts: new Client.EVMTokenAmount[](0),
                extraArgs: extraArgs,
                feeToken: _feeToken
            });
    }

    /// @dev Returns anything left over after paying the bridge to the
    ///      controller, so the adapter never accumulates custody.
    function _returnRemainder(address _feeToken) internal {
        if (_feeToken == address(0)) {
            uint256 remainder = address(this).balance;
            if (remainder != 0) {
                (bool ok, ) = CROSS_CHAIN_CONTROLLER.call{value: remainder}("");
                if (!ok) {
                    revert Errors.NATIVE_TRANSFER_FAILED(
                        CROSS_CHAIN_CONTROLLER,
                        remainder
                    );
                }
            }
        } else {
            uint256 remainder = IERC20(_feeToken).balanceOf(address(this));
            if (remainder != 0) {
                IERC20(_feeToken).safeTransfer(
                    CROSS_CHAIN_CONTROLLER,
                    remainder
                );
            }
        }
    }

    function _setChainSelectors(
        uint256[] memory _chainIds,
        uint64[] memory _chainSelectors
    ) internal {
        if (_chainIds.length != _chainSelectors.length) {
            revert Errors.INVALID_LENGTH_MISMATCH();
        }

        for (uint256 i = 0; i < _chainIds.length; i++) {
            uint256 chainId = _chainIds[i];
            if (chainId == 0) revert Errors.INVALID_CHAIN_ID();

            uint64 previousSelector = _chainIdToSelector[chainId];
            if (previousSelector != 0) {
                delete _selectorToChainId[previousSelector];
            }

            uint64 selector = _chainSelectors[i];
            _chainIdToSelector[chainId] = selector;
            if (selector != 0) {
                _selectorToChainId[selector] = chainId;
            }

            emit ChainSelectorSet(chainId, selector);
        }
    }
}
