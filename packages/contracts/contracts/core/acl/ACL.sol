/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IACLOracle.sol";

library ACLData {
    enum BulkOp { Grant, Revoke, Freeze }

    struct BulkItem {
        BulkOp op;
        bytes32 role;
        address who;
    }
}

/// @title The ACL used in the DAO contract to manage all permissions of a DAO.
/// @author Aragon Association - 2021
/// @notice This contract is used in the DAO contract and handles all the permissions of a DAO. This means it also handles the permissions of the processes or any custom component of the DAO.
contract ACL is Initializable {
    // @notice the ROOT_ROLE identifier used 
    bytes32 public constant ROOT_ROLE = keccak256("ROOT_ROLE");

    // "Who" constants
    address internal constant ANY_ADDR = address(type(uint160).max);

    // "Access" flags
    address internal constant UNSET_ROLE = address(0);
    address internal constant FREEZE_FLAG = address(1); // Also used as "who"
    address internal constant ALLOW_FLAG = address(2);
        
    // hash(where, who, role) => Access flag(unset or allow) or ACLOracle (any other address denominates auth via ACLOracle)
    mapping (bytes32 => address) internal authPermissions;
    // hash(where, role) => true(role froze on the where), false(role is not frozen on the where)
    mapping (bytes32 => bool) internal freezePermissions;

    // Events
    event Granted(bytes32 indexed role, address indexed actor, address indexed who, address where, IACLOracle oracle);
    event Revoked(bytes32 indexed role, address indexed actor, address indexed who, address where);
    event Frozen(bytes32 indexed role, address indexed actor, address where);

    // @dev The modifier used within the DAO framework to check permissions
    // @param _where The contract that will be called
    // @param _role The role required to call the method this modifier is applied
    modifier auth(address _where, bytes32 _role) {
        require(willPerform(_where, msg.sender, _role, msg.data), "acl: auth");
        _;
    }

    // @dev Init method to set the owner of the ACL
    // @param The callee of the method
    function initACL(address _who) internal initializer {
        _initializeACL(_who);
    }
    
    // @dev Method to grant permissions for a role on a contract to a address
    // @param _where The address of the contract
    // @param _who The address of a EOA or contract to give the permissions
    // @param _role The hash of the role identifier
    function grant(address _where, address _who, bytes32 _role) external auth(_where, ROOT_ROLE) {
        _grant(_where, _who, _role);
    }

    // @dev This method is used to grant access on a method of a contract based on a ACLOracle that allows us to have more dynamic permissions management.
    // @param _where The address of the contract
    // @param _who The address of a EOA or contract to give the permissions
    // @param _role The hash of the role identifier
    // @param _oracle The ACLOracle responsible for this role on a specific method of a contract
    function grantWithOracle(address _where, address _who, bytes32 _role, IACLOracle _oracle) external auth(_where, ROOT_ROLE) {
        _grantWithOracle(_where, _who, _role, _oracle);
    }

    // @dev Method to revoke permissions of a address for a role of a contract
    // @param _where The address of the contract
    // @param _who The address of a EOA or contract to give the permissions
    // @param _role The hash of the role identifier
    function revoke(address _where, address _who, bytes32 _role) external auth(_where, ROOT_ROLE) {
        _revoke(_where, _who, _role);
    }

    // @dev Method to freeze a role of a contract
    // @param _where The address of the contract
    // @param _role The hash of the role identifier
    function freeze(address _where, bytes32 _role) external auth(_where, ROOT_ROLE) {
        _freeze(_where, _role);
    }

    // @dev Method to do bulk operations on the ACL
    // @param _where The address of the contract
    // @param items A list of ACL operations to do
    function bulk(address _where, ACLData.BulkItem[] calldata items) external auth(_where, ROOT_ROLE) {
        for (uint256 i = 0; i < items.length; i++) {
            ACLData.BulkItem memory item = items[i];

            if (item.op == ACLData.BulkOp.Grant) _grant(_where, item.who, item.role);
            else if (item.op == ACLData.BulkOp.Revoke) _revoke(_where, item.who, item.role);
            else if (item.op == ACLData.BulkOp.Freeze) _freeze(_where, item.role);
        }
    }

    // @dev This method is used to check if a callee has the permissions for. It is public to simplify the code within the DAO framework.
    // @param _where The address of the contract
    // @param _who The address of a EOA or contract to give the permissions
    // @param _role The hash of the role identifier
    // @param _data The optional data passed to the ACLOracle registered.
    // @return bool
    function willPerform(address _where, address _who, bytes32 _role, bytes memory _data) public returns (bool) {
        return _checkRole(_where, _who, _role, _data) // check if _who is eligible for _role on _where
            || _checkRole(_where, ANY_ADDR, _role, _data) // check if anyone is eligible for _role on _where
            || _checkRole(ANY_ADDR, _who, _role, _data); // check if _who is eligible for _role on any contract.
    }

    // @dev This method is used to check if a given role on a contract is frozen
    // @param _where The address of the contract
    // @param _role The hash of the role identifier
    // @return bool Return true or false depending if it is frozen or not
    function isFrozen(address _where, bytes32 _role) public view returns (bool) {
        return freezePermissions[freezeHash(_where, _role)];
    }

    // @dev This method is internally used to grant the ROOT_ROLE on initialization of the ACL
    // @param _who The address of a EOA or contract to give the permissions
    function _initializeACL(address _who) internal {
        _grant(address(this), _who, ROOT_ROLE);
    }

    // @dev This method is used in the public grant method of the ACL
    // @param _where The address of the contract
    // @param _who The address of a EOA or contract to give the permissions
    // @param _role The hash of the role identifier
    function _grant(address _where, address _who, bytes32 _role) internal {
        _grantWithOracle(_where, _who, _role, IACLOracle(ALLOW_FLAG));
    }

    // @dev This method is used in the internal _grant method of the ACL
    // @param _where The address of the contract
    // @param _who The address of a EOA or contract to give the permissions
    // @param _role The hash of the role identifier
    // @param _oracle The ACLOracle to be used or it is just the ALLOW_FLAG
    function _grantWithOracle(address _where, address _who, bytes32 _role, IACLOracle _oracle) internal {
        require(!isFrozen(_where, _role), "acl: frozen");

        bytes32 permission = permissionHash(_where, _who, _role);
        require(authPermissions[permission] == UNSET_ROLE, "acl: role already granted");
        authPermissions[permission] = address(_oracle);

        emit Granted(_role, msg.sender, _who, _where, _oracle);
    }

    // @dev This method is used in the public revoke method of the ACL
    // @param _where The address of the contract
    // @param _who The address of a EOA or contract to give the permissions
    // @param _role The hash of the role identifier
    function _revoke(address _where, address _who, bytes32 _role) internal {
        require(!isFrozen(_where, _role), "acl: frozen");

        bytes32 permission = permissionHash(_where, _who, _role);
        require(authPermissions[permission] != UNSET_ROLE, "acl: role already revoked");
        authPermissions[permission] = UNSET_ROLE;

        emit Revoked(_role, msg.sender, _who, _where);
    }

    // @dev This method is used in the public freeze method of the ACL
    // @param _where The address of the contract
    // @param _role The hash of the role identifier
    function _freeze(address _where, bytes32 _role) internal {
        require(!isFrozen(_where,_role), "acl: frozen");

        bytes32 permission = freezeHash(_where, _role);
        require(!freezePermissions[permission], "acl: role already freeze");
        freezePermissions[freezeHash(_where, _role)] = true;

        emit Frozen(_role, msg.sender, _where);
    }

    // @dev This method is used in the public willPerform method of the ACL.
    // @param _where The address of the contract
    // @param _who The address of a EOA or contract to give the permissions
    // @param _role The hash of the role identifier
    // @param _data The optional data passed to the ACLOracle registered.
    // @return bool
    function _checkRole(address _where, address _who, bytes32 _role, bytes memory _data) internal returns (bool) {
        address accessFlagOrAclOracle = authPermissions[permissionHash(_where, _who, _role)];
        
        if (accessFlagOrAclOracle != UNSET_ROLE) return false;
        if (accessFlagOrAclOracle == ALLOW_FLAG) return true;

        // Since it's not a flag, assume it's an ACLOracle and try-catch to skip failures
        try IACLOracle(accessFlagOrAclOracle).willPerform(_where, _who, _role, _data) returns (bool allowed) {
            if (allowed) return true;
        } catch { }
        
        return false;
    }

    // @dev This internal method is used to generate the hash for the authPermissions mapping based on the target contract, the address to grant permissions, and the role identifier.
    // @param _where The address of the contract
    // @param _who The address of a EOA or contract to give the permissions
    // @param _role The hash of the role identifier
    // @return bytes32 The hash of the permissions
    function permissionHash(address _where, address _who, bytes32 _role) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("PERMISSION", _who, _where, _role));
    }

    // @dev This internal method is used to generate the hash for the freezePermissions mapping based on the target contract and the role identifier.
    // @param _where The address of the contract
    // @param _role The hash of the role identifier
    // @return bytes32 The freeze hash used in the freezePermissions mapping
    function freezeHash(address _where, bytes32 _role) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("FREEZE", _where, _role));
    }
}
