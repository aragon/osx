// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {Errors} from "../lib/Errors.sol";
import {CrossChainController} from "../CrossChainController.sol";
import {DaoAuthorizable} from "../../permission/auth/DaoAuthorizable.sol";
import {IBaseAdapter} from "./IBaseAdapter.sol";

/// @title BaseAdapter
/// @notice Shared logic for bridge adapters owned by a `CrossChainController`.
/// @dev  TWO EXECUTION CONTEXTS. Read this before touching anything here.
///
///       1. SEND — `delegatecall` from the controller. `address(this)` is the
///          CONTROLLER. Any `SLOAD`/`SSTORE` executed here reads or writes the
///          CONTROLLER's storage, so the send path MUST be storage-free:
///          `immutable`s only (they are baked into the adapter's bytecode and
///          therefore resolve correctly under `delegatecall`) plus arguments
///          passed in by the controller. `onlyDelegatecallFromController`
///          enforces the context.
///
///       2. RECEIVE — a NORMAL call from the bridge router into the adapter.
///          `address(this)` is the adapter, so the adapter's own storage
///          applies and mutable, permissioned configuration is fine. That is
///          where `_trustedRemotes` and the chain-id maps live.
///
///       TRUSTED REMOTE == REMOTE **CONTROLLER**. Because the send is a
///       `delegatecall`, the account that calls the bridge router is the
///       controller, and the sender address delivered on the far side is the
///       remote chain's CONTROLLER. `_trustedRemotes[chainId]` must therefore
///       hold the remote CONTROLLER address, while the controller's
///       `chainToAdapter[chainId].remoteAdapter` holds the remote ADAPTER
///       address (the bridge-level receiver). These are two DIFFERENT
///       addresses; setting the remote adapter as the trusted remote is a
///       silent, total loss of inbound liveness. See
///       `assertTrustedRemotesMatchControllers`.
///
///       Adapter administration is authorized through the same DAO that owns
///       the controller, so no separate ownership system is introduced. Note
///       that `auth()` MUST NOT be used on the send path: `DaoAuthorizable`
///       holds the DAO as an `immutable` (fine) but permission lookups are
///       keyed on `address(this)`, which differs between the two contexts.
/// @custom:security-contact sirt@aragon.org
abstract contract BaseAdapter is IBaseAdapter, DaoAuthorizable {
    /// @notice Permission to change adapter configuration (trusted remotes,
    ///         chain-id mappings). Receive-path configuration only; the send
    ///         path is configured on the controller.
    bytes32 public constant UPDATE_ADAPTER_CONFIG_PERMISSION_ID =
        keccak256("UPDATE_ADAPTER_CONFIG_PERMISSION");

    /// @notice The address of crosschain controller.
    /// @dev `immutable`, so it is readable both from the adapter's own context
    ///      and from the controller's context under `delegatecall`.
    address public immutable override CROSS_CHAIN_CONTROLLER;

    /// @notice This adapter's own address, captured at construction.
    /// @dev `immutable`, so it is baked into the bytecode and keeps its value
    ///      even when that bytecode is executed in someone else's context.
    ///      Comparing it to `address(this)` is how the receive path detects
    ///      that it is running under `delegatecall`.
    address private immutable _selfAddress;

    /// @notice standard chain id -> remote CONTROLLER address allowed to
    ///         originate messages for that chain.
    /// @dev NOT the remote adapter. See the contract-level docs.
    mapping(uint256 => address) internal _trustedRemotes;

    /// @notice Emitted when a trusted remote is set or cleared.
    event TrustedRemoteSet(uint256 indexed chainId, address trustedRemote);

    /// @notice Restricts a function to the owning `CrossChainController`
    ///         (receive-side / administrative direction: a real call).
    modifier onlyCrossChainController() {
        if (msg.sender != CROSS_CHAIN_CONTROLLER) {
            revert Errors.CALLER_NOT_CROSS_CHAIN_CONTROLLER(msg.sender);
        }
        _;
    }

    /// @notice Restricts a function to being `delegatecall`ed by the owning
    ///         `CrossChainController`.
    /// @dev Under `delegatecall` from the controller, `address(this)` IS the
    ///      controller. A direct call to the adapter fails this check. This is
    ///      the mirror image of `onlyCrossChainController`: `msg.sender` is
    ///      whoever called `forwardMessage` and carries no meaning here, so the
    ///      *context* is what must be asserted. Authorization of the send
    ///      itself is `FORWARD_MESSAGE_PERMISSION` on the controller.
    modifier onlyDelegatecallFromController() {
        if (address(this) != CROSS_CHAIN_CONTROLLER) {
            revert Errors.SEND_PATH_NOT_DELEGATECALLED(address(this));
        }
        _;
    }

    /// @param _crossChainController The controller that owns this adapter. Its
    ///        DAO is adopted as the adapter's permission manager.
    /// @param _remoteChainIds The standard chain ids of the remote lanes.
    /// @param _remoteTrustedSenders The remote CONTROLLER address per lane.
    constructor(
        address _crossChainController,
        uint256[] memory _remoteChainIds,
        address[] memory _remoteTrustedSenders
    ) DaoAuthorizable(CrossChainController(payable(_crossChainController)).dao()) {
        CROSS_CHAIN_CONTROLLER = _crossChainController;
        _selfAddress = address(this);

        _setTrustedRemotes(_remoteChainIds, _remoteTrustedSenders);
    }

    /// @inheritdoc IBaseAdapter
    /// @dev Redeclared as `public` so the consistency helpers below can call it
    ///      internally; implemented by the concrete adapter.
    function toNativeChainId(
        uint256 _chainId
    ) public view virtual override returns (uint256);

    /// @notice The remote CONTROLLER trusted to originate messages for a chain.
    /// @param _chainId The standard chain id.
    /// @return The trusted remote controller address, or zero if unset.
    function trustedRemote(uint256 _chainId) public view returns (address) {
        return _trustedRemotes[_chainId];
    }

    /// @notice Sets or clears trusted remotes.
    /// @dev Pass `address(0)` for a sender to clear a lane. The values are
    ///      remote CONTROLLER addresses, NOT remote adapter addresses.
    /// @param _remoteChainIds The standard chain ids.
    /// @param _remoteTrustedSenders The remote controller addresses.
    function setTrustedRemotes(
        uint256[] memory _remoteChainIds,
        address[] memory _remoteTrustedSenders
    ) public auth(UPDATE_ADAPTER_CONFIG_PERMISSION_ID) {
        _setTrustedRemotes(_remoteChainIds, _remoteTrustedSenders);
    }

    /// @notice Deployment-time check that this adapter's trusted remotes are
    ///         the expected remote CONTROLLER addresses, and specifically that
    ///         they are NOT the remote ADAPTER addresses the controller has
    ///         configured as bridge receivers.
    /// @dev The expected values must be supplied by the deployer: the local
    ///      controller stores the remote ADAPTER (the bridge receiver), not the
    ///      remote controller, so there is nothing on-chain to cross-check
    ///      against. What CAN be checked mechanically — and is — is that the
    ///      two were not confused for one another.
    /// @param _chainIds The standard chain ids to check.
    /// @param _expectedRemoteControllers The remote CONTROLLER per chain id.
    function assertTrustedRemotesMatchControllers(
        uint256[] memory _chainIds,
        address[] memory _expectedRemoteControllers
    ) public view {
        if (_chainIds.length != _expectedRemoteControllers.length) {
            revert Errors.INVALID_LENGTH_MISMATCH();
        }

        for (uint256 i = 0; i < _chainIds.length; i++) {
            uint256 chainId = _chainIds[i];
            address trusted = _trustedRemotes[chainId];

            if (trusted == address(0) || trusted != _expectedRemoteControllers[i]) {
                revert Errors.TRUSTED_REMOTE_MISMATCH(
                    chainId,
                    trusted,
                    _expectedRemoteControllers[i]
                );
            }

            (, address remoteAdapter, ) = CrossChainController(
                payable(CROSS_CHAIN_CONTROLLER)
            ).chainToAdapter(chainId);

            if (remoteAdapter != address(0) && trusted == remoteAdapter) {
                revert Errors.TRUSTED_REMOTE_IS_REMOTE_ADAPTER(
                    chainId,
                    trusted
                );
            }
        }
    }

    /// @notice Deployment-time check that the controller's send-side
    ///         `bridgeChainId` agrees with this adapter's receive-side
    ///         chain-id map for the same chains.
    /// @dev The same mapping necessarily exists twice: the send path may not
    ///      read storage, so the controller carries chainId -> bridge id in its
    ///      lane config, while the receive path needs bridge id -> chainId in
    ///      adapter storage. A desync silently sends to the wrong lane (or to
    ///      a lane whose inbound messages the far side cannot attribute), so
    ///      run this after every `updateConfig`/`setChainSelectors`.
    /// @param _chainIds The standard chain ids to check.
    function assertChainSelectorsMatchController(
        uint256[] memory _chainIds
    ) public view {
        for (uint256 i = 0; i < _chainIds.length; i++) {
            uint256 chainId = _chainIds[i];

            (, , uint64 controllerBridgeChainId) = CrossChainController(
                payable(CROSS_CHAIN_CONTROLLER)
            ).chainToAdapter(chainId);

            if (controllerBridgeChainId == 0) {
                revert Errors.ADAPTER_NOT_CONFIGURED(chainId);
            }

            // Reverts `UNKNOWN_CHAIN_ID` if the adapter has no entry at all.
            uint64 adapterBridgeChainId = uint64(toNativeChainId(chainId));

            if (controllerBridgeChainId != adapterBridgeChainId) {
                revert Errors.CHAIN_ID_DESYNC(
                    chainId,
                    controllerBridgeChainId,
                    adapterBridgeChainId
                );
            }
        }
    }

    /// @notice The address this adapter was deployed at.
    /// @return The adapter's own address, from bytecode.
    function selfAddress() public view returns (address) {
        return _selfAddress;
    }

    /// @notice Once adapter receives a message, this must be called
    ///         to redirect/forward it to CrossChainController.
    /// @dev MUST stay `internal`: it is the unauthenticated side of the receive
    ///      path, reachable only after the bridge-specific caller and
    ///      trusted-remote checks have passed.
    ///
    ///      GUARDS THE SEND/RECEIVE ASYMMETRY. This is the last common point of
    ///      the receive path, and everything upstream of it (trusted remotes,
    ///      chain-id maps) is STORAGE — which is only meaningful when this code
    ///      runs in the adapter's own context. If it were ever reached under
    ///      `delegatecall` (from the controller's send path, or from anything
    ///      else), those reads would resolve against foreign slots and the
    ///      authentication they perform would be meaningless. `address(this)`
    ///      is compared against the `immutable` `_selfAddress` to make that
    ///      impossible rather than merely unlikely.
    /// @param _messageId The bridge-level message identifier.
    /// @param _payload The encoded Action[] message.
    /// @param _originChainId The standard chain id the message came from.
    function _forwardMessage(
        bytes32 _messageId,
        bytes memory _payload,
        uint256 _originChainId
    ) internal {
        if (address(this) != _selfAddress) {
            revert Errors.DELEGATE_CALL_FORBIDDEN(address(this), _selfAddress);
        }

        CrossChainController(payable(CROSS_CHAIN_CONTROLLER)).receiveMessage(
            _messageId,
            _payload,
            _originChainId
        );
    }

    function _setTrustedRemotes(
        uint256[] memory _remoteChainIds,
        address[] memory _remoteTrustedSenders
    ) internal {
        if (_remoteChainIds.length != _remoteTrustedSenders.length) {
            revert Errors.INVALID_LENGTH_MISMATCH();
        }

        for (uint256 i = 0; i < _remoteChainIds.length; i++) {
            uint256 chainId = _remoteChainIds[i];
            if (chainId == 0) revert Errors.INVALID_CHAIN_ID();

            _trustedRemotes[chainId] = _remoteTrustedSenders[i];

            emit TrustedRemoteSet(chainId, _remoteTrustedSenders[i]);
        }
    }
}
