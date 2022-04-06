/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "./../IDAO.sol";
import "./../acl/ACL.sol";


/// @title Abstract implementation of the DAO permissions
/// @author Samuel Furter - Aragon Association - 2022
/// @notice This contract can be used to include the modifier logic(so contracts don't repeat the same code) that checks permissions on the dao.
/// @dev When your contract inherits from this, it is important to call __Permission_init with the associated DAO address.
abstract contract Permissions is Initializable, ContextUpgradeable {
    
    /// @dev Every component needs DAO at least for the permission management. See 'auth' modifier.
    IDAO internal dao;

    /// @notice Initializes the contract
    /// @param _dao the associated DAO address
    function __Permissions_init(IDAO _dao) internal virtual onlyInitializing {
        dao = _dao;
    }

    /// @dev Auth modifier used in all components of a DAO to check the permissions.
    /// @param _role The hash of the role identifier
    modifier auth(bytes32 _role)  {
        if(!dao.hasPermission(address(this), _msgSender(), _role, _msgData()))
            revert ACLData.ACLAuth({here: address(this), where: address(this), who: _msgSender(), role: _role});

        _;
    }
}
