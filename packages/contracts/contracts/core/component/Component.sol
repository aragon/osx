/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";

import "./Permissions.sol";
import "../erc165/AdaptiveERC165.sol";
import "./../IDAO.sol";

// component => permissions => BaseRelayRecipient, AdaptiveERC165, UUPSUpgradable, Initializable

/// @title The base component in the Aragon DAO framework
/// @author Samuel Furter - Aragon Association - 2021
/// @notice The component any component within the Aragon DAO framework has to inherit from the leverage the architecture existing.
abstract contract Component is UUPSUpgradeable, AdaptiveERC165, Permissions {
    /// @notice Role identifier to upgrade a component 
    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");
    /// @notice Role identifer to change the GSN forwarder
    bytes32 public constant MODIFY_FORWARDER = keccak256("MODIFY_TRUSTED_FORWARDER");

    /// @dev Used for UUPS upgradability pattern
    function initialize(
        IDAO _dao, 
        address _gsnForwarder
    ) public virtual {
        Permissions.initialize(_dao);

        _setTrustedForwarder(_gsnForwarder);
        _registerStandard(type(Component).interfaceId);
    }

    /// @dev used to update the trusted forwarder.
    function setTrustedForwarder(address _forwarder) public virtual auth(MODIFY_FORWARDER) {
        _setTrustedForwarder(_forwarder);
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_ROLE) { }

    /// @dev Fallback to handle future versions of the ERC165 standard.
    fallback () external {
        _handleCallback(msg.sig, _msgData()); // WARN: does a low-level return, any code below would be unreacheable
    }
}
