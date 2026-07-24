// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {Errors} from "../lib/Errors.sol";
import {CrossChainController} from "../CrossChainController.sol";
import {DaoAuthorizable} from "../../permission/auth/DaoAuthorizable.sol";
import {IBaseAdapter} from "./IBaseAdapter.sol";

/// @title BaseAdapter
/// @notice Shared logic for bridge adapters owned by a `CrossChainController`.
/// @custom:security-contact sirt@aragon.org
abstract contract BaseAdapter is IBaseAdapter {
    /// @notice Permission to change adapter configuration (trusted remotes,
    ///         chain-id mappings). Receive-path configuration only; the send
    ///         path is configured on the controller.
    bytes32 public constant UPDATE_ADAPTER_CONFIG_PERMISSION_ID =
        keccak256("UPDATE_ADAPTER_CONFIG_PERMISSION");

    /// @notice The address of crosschain controller.
    address public immutable override CROSS_CHAIN_CONTROLLER;

    /// @notice This adapter's own address, captured at construction.
    address private immutable _selfAddress;

    /// @notice A standard chain id paired with the remote trusted sender.
    /// @param standardChainId The standard chain id of remote chain.
    /// @param trustedRemote The remote trusted address(i.e origin forwarder)
    struct TrustedRemoteConfig {
        uint256 standardChainId;
        address trustedRemote;
    }

    /// @notice standard chain id -> remote trusted address allowed
    ///         to originate messages for that chain.
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
    /// @param _trustedRemoteConfigs The remote trusted config.
    constructor(
        address _crossChainController,
        TrustedRemoteConfig[] memory _trustedRemoteConfigs
    ) {
        CROSS_CHAIN_CONTROLLER = _crossChainController;
        _selfAddress = address(this);

        _setTrustedRemotes(_trustedRemoteConfigs);
    }

    /// @inheritdoc IBaseAdapter
    function toNativeChainId(
        uint256 _chainId
    ) public view virtual override returns (uint256);

    /// @notice The remote CONTROLLER trusted to originate messages for a chain.
    /// @param _chainId The standard chain id.
    /// @return The trusted remote controller address, or zero if unset.
    function trustedRemote(uint256 _chainId) public view returns (address) {
        return _trustedRemotes[_chainId];
    }

    /// @notice The address this adapter was deployed at.
    /// @return The adapter's own address, from bytecode.
    function selfAddress() public view returns (address) {
        return _selfAddress;
    }

    /// @notice Once adapter receives a message, this forwards it to the CrossChainController.
    /// @param _messageId The bridge-level message identifier.
    /// @param _payload The encoded payload message.
    /// @param _originChainId The standard chain id the message came from.
    function _forwardMessage(
        bytes32 _messageId,
        bytes memory _payload,
        uint256 _originChainId
    ) internal {
        // Extra defense to ensure that caller on controller will always be
        // Adapter and not the contract that called adapter with delegatecall.
        if (address(this) != _selfAddress) {
            revert Errors.DELEGATE_CALL_FORBIDDEN(address(this), _selfAddress);
        }

        CrossChainController(payable(CROSS_CHAIN_CONTROLLER)).receiveMessage(
            _messageId,
            _payload,
            _originChainId
        );
    }

    /// @notice Sets the trusted remotes for receiving messages.
    ///        Generally, it should be the cross chain controller
    ///        of source chain.
    function _setTrustedRemotes(
        TrustedRemoteConfig[] memory _trustedRemoteConfigs
    ) internal {
        for (uint256 i = 0; i < _trustedRemoteConfigs.length; i++) {
            uint256 chainId = _trustedRemoteConfigs[i].standardChainId;
            if (chainId == 0) revert Errors.INVALID_CHAIN_ID();

            address trustedRemote_ = _trustedRemoteConfigs[i].trustedRemote;
            _trustedRemotes[chainId] = trustedRemote_;

            emit TrustedRemoteSet(chainId, trustedRemote_);
        }
    }
}
