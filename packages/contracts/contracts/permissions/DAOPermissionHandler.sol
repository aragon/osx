/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./../core/component/Component.sol";
import "../core/acl/IACLOracle.sol";

/// @title Abstract implementation of the DAO permission handler
/// @author Giorgi Lagidze - Aragon Association - 2022
/// @notice This contract can be used to include the modifier logic(so contracts don't repeat the same code) that checks permissions on the dao.
/// @dev When your contract inherits from this, it's important to call __Initialize_DAO_Permission with the dao address.
abstract contract DAOPermissionHandler is Initializable {
    
    IDAO internal dao;

    modifier auth(bytes32 _role)  {
        require(dao.hasPermission(address(this), msg.sender, _role, msg.data), "component: auth");
        _;
    }

    function __Initialize_DAO_Permission(IDAO _dao) internal initializer {
        dao = _dao;
    }
}
