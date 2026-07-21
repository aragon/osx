// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {Errors} from "../lib/Errors.sol";
import {CrossChainController} from "../CrossChainController.sol";
import {DaoAuthorizable} from "../../permission/auth/DaoAuthorizable.sol";
import {IBaseAdapter} from "./IBaseAdapter.sol";

/// @title BaseAdapter
/// @notice Shared logic for bridge adapters owned by a `CrossChainController`.
/// @dev The controller invokes adapters with a plain `call`, so:
///      - adapter storage is the adapter's own (no `delegatecall` collisions);
///      - the sender address the bridge reports on the destination chain is
///        THIS ADAPTER. Consequently `_trustedRemotes[chainId]` must hold the
///        REMOTE ADAPTER address, which is exactly what the controller stores
///        as `chainToAdapter[chainId].remoteAdapter`. Use
///        `assertTrustedRemotesMatchController` to verify both sides agree.
///      Adapter administration is authorized through the same DAO that owns the
///      controller, so no separate ownership system is introduced.
/// @custom:security-contact sirt@aragon.org
abstract contract BaseAdapter is IBaseAdapter, DaoAuthorizable {
    /// @notice Permission to change adapter configuration (trusted remotes,
    ///         fee token, chain-id mappings).
    bytes32 public constant UPDATE_ADAPTER_CONFIG_PERMISSION_ID =
        keccak256("UPDATE_ADAPTER_CONFIG_PERMISSION");

    /// @notice The address of crosschain controller.
    address public immutable override CROSS_CHAIN_CONTROLLER;

    /// @notice standard chain id -> remote adapter address allowed to originate
    ///         messages for that chain.
    mapping(uint256 => address) internal _trustedRemotes;

    /// @notice Emitted when a trusted remote is set or cleared.
    event TrustedRemoteSet(uint256 indexed chainId, address trustedRemote);

    /// @notice Restricts a function to the owning `CrossChainController`.
    modifier onlyCrossChainController() {
        if (msg.sender != CROSS_CHAIN_CONTROLLER) {
            revert Errors.CALLER_NOT_CROSS_CHAIN_CONTROLLER(msg.sender);
        }
        _;
    }

    /// @param _crossChainController The controller that owns this adapter. Its
    ///        DAO is adopted as the adapter's permission manager.
    /// @param _remoteChainIds The standard chain ids of the remote lanes.
    /// @param _remoteTrustedSenders The remote ADAPTER address per lane.
    constructor(
        address _crossChainController,
        uint256[] memory _remoteChainIds,
        address[] memory _remoteTrustedSenders
    ) DaoAuthorizable(CrossChainController(payable(_crossChainController)).dao()) {
        CROSS_CHAIN_CONTROLLER = _crossChainController;

        _setTrustedRemotes(_remoteChainIds, _remoteTrustedSenders);
    }

    /// @notice The remote adapter trusted to originate messages for a chain.
    /// @param _chainId The standard chain id.
    /// @return The trusted remote adapter address, or zero if unset.
    function trustedRemote(uint256 _chainId) public view returns (address) {
        return _trustedRemotes[_chainId];
    }

    /// @notice Sets or clears trusted remotes.
    /// @dev Pass `address(0)` for a sender to clear a lane.
    /// @param _remoteChainIds The standard chain ids.
    /// @param _remoteTrustedSenders The remote adapter addresses.
    function setTrustedRemotes(
        uint256[] memory _remoteChainIds,
        address[] memory _remoteTrustedSenders
    ) public auth(UPDATE_ADAPTER_CONFIG_PERMISSION_ID) {
        _setTrustedRemotes(_remoteChainIds, _remoteTrustedSenders);
    }

    /// @notice Reverts unless, for every given chain, this adapter's trusted
    ///         remote equals the controller's configured `remoteAdapter`.
    /// @dev Deployment-time sanity check for the easily-misconfigured pair
    ///      described in the contract-level docs.
    /// @param _chainIds The standard chain ids to check.
    function assertTrustedRemotesMatchController(
        uint256[] memory _chainIds
    ) public view {
        for (uint256 i = 0; i < _chainIds.length; i++) {
            uint256 chainId = _chainIds[i];

            (, address remoteAdapter) = CrossChainController(
                payable(CROSS_CHAIN_CONTROLLER)
            ).chainToAdapter(chainId);

            address trusted = _trustedRemotes[chainId];

            if (trusted == address(0) || trusted != remoteAdapter) {
                revert Errors.TRUSTED_REMOTE_MISMATCH(
                    chainId,
                    trusted,
                    remoteAdapter
                );
            }
        }
    }

    /// @notice Once adapter receives a message, this must be called
    ///         to redirect/forward it to CrossChainController.
    /// @dev MUST stay `internal`: it is the unauthenticated side of the receive
    ///      path, reachable only after the bridge-specific caller and
    ///      trusted-remote checks have passed.
    /// @param _messageId The bridge-level message identifier.
    /// @param _payload The encoded Action[] message.
    /// @param _originChainId The standard chain id the message came from.
    function _forwardMessage(
        bytes32 _messageId,
        bytes memory _payload,
        uint256 _originChainId
    ) internal {
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
