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
/// @dev  SEND is `delegatecall`ed by the `CrossChainController`; RECEIVE is a
///       normal call from the CCIP Router. The two halves of this contract
///       therefore run in different contexts and obey different rules.
///
///       Send half (`sendMessage`, `quoteFee`) — STORAGE-FREE BY CONSTRUCTION.
///       `CCIP_ROUTER` and `FEE_TOKEN` are `immutable`, so they live in this
///       contract's deployed bytecode and resolve identically whether the code
///       runs here or in the controller's context. The destination chain
///       selector is not looked up at all: the controller passes it in as
///       `_bridgeChainId`. There is consequently no storage slot for the send
///       path to collide with.
///
///       Trade-off, accepted deliberately: THE FEE TOKEN CANNOT BE CHANGED.
///       Rotating it means deploying a new `CCIPAdapter` with the new
///       `FEE_TOKEN` and pointing the affected lanes at it with
///       `CrossChainController.updateConfig`. `updateConfig` already handles
///       adapter rotation correctly (refcounted local-adapter registry), and
///       the new adapter must be seeded with the same trusted remotes and
///       selector map. Same applies to changing the router.
///
///       Receive half (`ccipReceive`) — the Router calls this contract
///       directly, so `_trustedRemotes` and the selector maps are this
///       contract's own storage and are updatable under
///       `UPDATE_ADAPTER_CONFIG_PERMISSION`.
///
///       `_trustedRemotes[chainId]` HOLDS THE REMOTE **CONTROLLER**. Under
///       `delegatecall` the account calling `ccipSend` on the source chain is
///       the source CONTROLLER, so that is the sender CCIP reports here. The
///       remote ADAPTER address is what the source controller stores as
///       `chainToAdapter[].remoteAdapter` (the CCIP `receiver`). Do not
///       conflate them.
///
///       Fee handling: the controller pays. Under `delegatecall`, `msg.sender`
///       towards the Router and `address(this)` are the controller, so
///       `ccipSend{value: fee}` spends the controller's native balance and
///       `forceApprove` grants the Router an allowance over the CONTROLLER's
///       ERC20 balance. This adapter never custodies funds.
/// @custom:security-contact sirt@aragon.org
contract CCIPAdapter is IERC165, IAny2EVMMessageReceiver, BaseAdapter {
    using SafeERC20 for IERC20;

    /// @notice The CCIP Router address.
    /// @dev `immutable`: read on the `delegatecall`ed send path.
    IRouterClient public immutable CCIP_ROUTER;

    /// @notice The fee token used to pay bridge fees. `address(0)` means the
    ///         chain's native currency.
    /// @dev `immutable` by necessity, not by preference: a storage read here
    ///      would resolve against the controller's slots under `delegatecall`.
    ///      Changing the fee token requires a new adapter deployment plus
    ///      `CrossChainController.updateConfig`.
    address public immutable FEE_TOKEN;

    /// @notice standard chain id -> CCIP chain selector.
    /// @dev RECEIVE-SIDE / OPERATIONAL ONLY. The send path does NOT read this;
    ///      the controller carries the selector in its lane config. Kept so the
    ///      reverse map can be maintained coherently and so
    ///      `assertChainSelectorsMatchController` can detect a desync between
    ///      the two copies.
    mapping(uint256 => uint64) internal _chainIdToSelector;

    /// @notice CCIP chain selector -> standard chain id. Used by `ccipReceive`.
    mapping(uint64 => uint256) internal _selectorToChainId;

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
    /// @param _feeToken The fee token, or `address(0)` for native. IMMUTABLE.
    /// @param _chainIds The standard chain ids of the configured lanes.
    /// @param _trustedRemoteSenders The remote CONTROLLER address per lane.
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
        FEE_TOKEN = _feeToken;

        _setChainSelectors(_selectorChainIds, _chainSelectors);
    }

    // -------------------------------------------------------------------------
    // Configuration (receive side only)
    // -------------------------------------------------------------------------

    /// @notice Sets or clears standard chain id <-> CCIP selector pairs.
    /// @dev New CCIP lanes appear over time, so the RECEIVE side must be
    ///      updatable without redeploying the adapter. The SEND side is
    ///      configured on the controller (`ChainConfig.bridgeChainId`); after
    ///      changing either, run `assertChainSelectorsMatchController`.
    ///      Pass selector `0` to clear a mapping.
    /// @param _chainIds The standard chain ids.
    /// @param _chainSelectors The CCIP chain selectors.
    function setChainSelectors(
        uint256[] memory _chainIds,
        uint64[] memory _chainSelectors
    ) public auth(UPDATE_ADAPTER_CONFIG_PERMISSION_ID) {
        _setChainSelectors(_chainIds, _chainSelectors);
    }

    // -------------------------------------------------------------------------
    // Sending -- MUST NOT TOUCH STORAGE
    // -------------------------------------------------------------------------

    /// @inheritdoc IBaseAdapter
    function quoteFee(
        address _receiver,
        uint64 _bridgeChainId,
        uint256 _gasLimit,
        bytes calldata _message
    ) public view override returns (address, uint256) {
        if (_receiver == address(0)) revert Errors.RECEIVER_ADDRESS_ZERO();
        if (_bridgeChainId == 0) revert Errors.UNKNOWN_CHAIN_ID(0);

        return (
            FEE_TOKEN,
            CCIP_ROUTER.getFee(
                _bridgeChainId,
                _buildMessage(_receiver, _gasLimit, _message, FEE_TOKEN)
            )
        );
    }

    /// @inheritdoc IBaseAdapter
    /// @dev Every value used here is an `immutable` or an argument. Adding a
    ///      storage read to this function would corrupt the controller.
    ///
    ///      REACHABILITY NOTE, so a reviewer does not have to derive it: two of
    ///      the guards below are UNREACHABLE from the only production entry
    ///      point today, and are kept deliberately.
    ///      - `RECEIVER_ADDRESS_ZERO`: `CrossChainController._validatedConfig`
    ///        already rejects a zero `remoteAdapter` before it will
    ///        `delegatecall` at all, so `_receiver` cannot be zero in practice.
    ///      - `UNEXPECTED_NATIVE_VALUE`: `forwardMessage` is not `payable`, so
    ///        the `msg.value` inherited by this frame is always `0`.
    ///      Both are retained so that making `forwardMessage` payable, or
    ///      relaxing the lane validation, cannot silently turn a stranded-funds
    ///      or wrong-receiver bug into a live one. They are cheap. Do not
    ///      delete them without re-checking those two call-site invariants.
    function sendMessage(
        address _receiver,
        uint64 _bridgeChainId,
        uint256 _gasLimit,
        bytes calldata _message
    )
        public
        payable
        override
        onlyDelegatecallFromController
        returns (bytes32 messageId, address feeToken, uint256 fee)
    {
        if (_receiver == address(0)) revert Errors.RECEIVER_ADDRESS_ZERO();
        // Defence in depth: the controller already rejects an unset lane, but
        // selector 0 must never reach the Router.
        if (_bridgeChainId == 0) revert Errors.UNKNOWN_CHAIN_ID(0);

        feeToken = FEE_TOKEN;

        Client.EVM2AnyMessage memory ccipMessage = _buildMessage(
            _receiver,
            _gasLimit,
            _message,
            feeToken
        );

        // CCIP does not refund overpayment, so quote and pay exactly.
        fee = CCIP_ROUTER.getFee(_bridgeChainId, ccipMessage);

        // `address(this)` is the CONTROLLER here: it is the fee payer.
        if (feeToken == address(0)) {
            uint256 balance = address(this).balance;
            if (balance < fee) {
                revert Errors.INSUFFICIENT_FEE_BALANCE(
                    address(0),
                    fee,
                    balance
                );
            }

            messageId = CCIP_ROUTER.ccipSend{value: fee}(
                _bridgeChainId,
                ccipMessage
            );
        } else {
            // Native value would be stranded in the controller's balance while
            // an ERC20 fee is due; surface the mistake instead.
            if (msg.value != 0) revert Errors.UNEXPECTED_NATIVE_VALUE();

            uint256 balance = IERC20(feeToken).balanceOf(address(this));
            if (balance < fee) {
                revert Errors.INSUFFICIENT_FEE_BALANCE(feeToken, fee, balance);
            }

            // The Router pulls the fee via `transferFrom` from the CONTROLLER,
            // which is the account granting the allowance under `delegatecall`.
            IERC20(feeToken).forceApprove(address(CCIP_ROUTER), fee);

            messageId = CCIP_ROUTER.ccipSend(_bridgeChainId, ccipMessage);

            // Leave no standing allowance on the controller.
            IERC20(feeToken).forceApprove(address(CCIP_ROUTER), 0);
        }
    }

    // -------------------------------------------------------------------------
    // Receiving -- normal call, this contract's own storage
    // -------------------------------------------------------------------------

    /// @inheritdoc IAny2EVMMessageReceiver
    /// @dev `message.sender` is the remote CONTROLLER (it `delegatecall`ed its
    ///      adapter's send code, so it is the account that called the remote
    ///      Router), which is what `_trustedRemotes` stores.
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
    /// @dev CCIP addresses lanes by chain SELECTOR, not by EVM chain id. Not
    ///      consulted when sending (the controller supplies the selector);
    ///      exposed for operations and for the consistency assertion.
    ///      Unknown ids revert rather than returning `0`.
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
