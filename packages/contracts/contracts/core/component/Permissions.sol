/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./../IDAO.sol";

/// @title Abstract implementation of the DAO permissions
/// @author Samuel Furter - Aragon Association - 2022
/// @notice This contract can be used to include the modifier logic(so contracts don't repeat the same code) that checks permissions on the dao.
/// @dev When your contract inherits from this, it's important to call __Initialize_DAO_Permission with the dao address.
abstract contract Permissions is Initializable {
    
    /// @dev Every component needs DAO at least for the permission management. See 'auth' modifier.
    IDAO internal dao;
    
    /// @dev Auth modifier used in all components of a DAO to check the permissions.
    /// @param _role The hash of the role identifier
    modifier auth(bytes32 _role)  {
        require(dao.hasPermission(address(this), msg.sender, _role, msg.data), "component: auth");
        _;
    }

    function initialize(IDAO _dao) public virtual initializer {
        dao = _dao;
    }
}
