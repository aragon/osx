/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
//import "./Permissions.sol";
import "../erc165/AdaptiveERC165.sol";
import "./../IDAO.sol";
import "./../acl/ACL.sol";

// component => permissions => BaseRelayRecipient, AdaptiveERC165, UUPSUpgradable, Initializable

/// @title The base component in the Aragon DAO framework
/// @author Samuel Furter - Aragon Association - 2021
/// @notice The component any component within the Aragon DAO framework has to inherit from the leverage the architecture existing.
abstract contract Component is UUPSUpgradeable, AdaptiveERC165 /*, Permissions*/ {
    /// @dev Every component needs DAO at least for the permission management. See 'auth' modifier.
    IDAO internal dao;
    
    /// @notice Role identifier to upgrade a component 
    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");

    event SetTrustedForwarder(address _newForwarder);

    /// @dev Used for UUPS upgradability pattern
    function __Component_init(IDAO _dao, address _trustedForwarder) internal virtual {
        //__Permission_init(_dao);

        _registerStandard(type(Component).interfaceId);
    }

    function msgSender() internal virtual view returns (address) {
        return msg.sender;
    }

    function msgData() internal virtual view returns (bytes) {
        return msg.data;
    }

    /// @dev Auth modifier used in all components of a DAO to check the permissions.
    /// @param _role The hash of the role identifier
    modifier auth(bytes32 _role)  {
        if(!dao.hasPermission(address(this), msgSender(), _role, msgData()))
            revert ACLData.ACLAuth({here: address(this), where: address(this), who: msgSender(), role: _role});

        _;
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_ROLE) { }

    /// @dev Fallback to handle future versions of the ERC165 standard.
    fallback () external {
        _handleCallback(msg.sig, msgData()); // WARN: does a low-level return, any code below would be unreacheable
    }
}
