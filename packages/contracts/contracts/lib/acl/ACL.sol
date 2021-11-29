/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity ^0.8.0;

// import "../initializable/Initializable.sol";
import "./IACLOracle.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

library ACLData {
    enum BulkOp { Grant, Revoke, Freeze }

    struct BulkItem {
        BulkOp op;
        bytes4 role;
        address who;
    }
}

contract ACL is Initializable {
    bytes32 public constant ROOT_ROLE =
        this.grant.selector
        ^ this.revoke.selector
        ^ this.freeze.selector
        ^ this.bulk.selector
    ;

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

    event Granted(bytes32 indexed role, address indexed actor, address indexed who, address where, IACLOracle oracle);
    event Revoked(bytes32 indexed role, address indexed actor, address indexed who, address where);
    event Frozen(bytes32 indexed role, address indexed actor, address where);

    modifier auth(address _where, bytes32 _role) {
        require(willPerform(_where, msg.sender, _role, msg.data), "acl: auth");
        _;
    }

    constructor() initializer {}

    function initACL(address _who) internal initializer {
        _initializeACL(address(this),  _who);
    }
    
    function grant(address _where, address _who, bytes32 _role) external auth(_where, ROOT_ROLE) {
        _grant(_where, _who, _role);
    }

    function grantWithOracle(address _where, address _who, bytes32 _role, IACLOracle _oracle) external auth(_where, ROOT_ROLE) {
        _grantWithOracle(_where, _who, _role, _oracle);
    }

    function revoke(address _where, address _who, bytes32 _role) external auth(_where, ROOT_ROLE) {
        _revoke(_where, _who, _role);
    }

    function freeze(address _where, bytes32 _role) external auth(_where, ROOT_ROLE) {
        _freeze(_where, _role);
    }

    function bulk(address _where, ACLData.BulkItem[] calldata items) external auth(_where, ROOT_ROLE) {
        for (uint256 i = 0; i < items.length; i++) {
            ACLData.BulkItem memory item = items[i];

            if (item.op == ACLData.BulkOp.Grant) _grant(_where, item.who, item.role);
            else if (item.op == ACLData.BulkOp.Revoke) _revoke(_where, item.who, item.role);
            else if (item.op == ACLData.BulkOp.Freeze) _freeze(_where, item.role);
        }
    }

    function willPerform(address _where, address _who, bytes32 _role, bytes memory _data) internal returns (bool) {
        return _checkRole(_where, _who, _role, _data) // check if _who is eligible for _role on _where
            || _checkRole(_where, ANY_ADDR, _role, _data) // check if anyone is eligible for _role on _where
            || _checkRole(ANY_ADDR, _who, _role, _data); // check if _who is eligible for _role on any contract.
    }

    function isFrozen(address _where, bytes32 _role) public view returns (bool) {
        return freezePermissions[freezeHash(_where, _role)];
    }

    function _initializeACL(address _where, address _who) internal {
        _grant(_where, _who, ROOT_ROLE);
    }

    function _grant(address _where, address _who, bytes32 _role) internal {
        _grantWithOracle(_where, _who, _role, IACLOracle(ALLOW_FLAG));
    }

    function _grantWithOracle(address _where, address _who, bytes32 _role, IACLOracle _oracle) internal {
        require(!isFrozen(_where, _role), "acl: frozen");

        bytes32 permission = permissionHash(_where, _who, _role);
        require(authPermissions[permission] == UNSET_ROLE, "acl: role already granted");
        authPermissions[permission] = address(_oracle);

        emit Granted(_role, msg.sender, _who, _where, _oracle);
    }

    function _revoke(address _where, address _who, bytes32 _role) internal {
        require(!isFrozen(_where, _role), "acl: frozen");

        bytes32 permission = permissionHash(_where, _who, _role);
        require(authPermissions[permission] != UNSET_ROLE, "acl: role already revoked");
        authPermissions[permission] = UNSET_ROLE;

        emit Revoked(_role, msg.sender, _who, _where);
    }

    function _freeze(address _where, bytes32 _role) internal {
        require(!isFrozen(_where,_role), "acl: frozen");

        bytes32 permission = freezeHash(_where, _role);
        require(!freezePermissions[permission], "acl: role already freeze");
        freezePermissions[freezeHash(_where, _role)] = true;

        emit Frozen(_role, msg.sender, _where);
    }

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

    function permissionHash(address _where, address _who, bytes32 _role) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("PERMISSION", _who, _where, _role));
    }

    function freezeHash(address _where, bytes32 _role) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("FREEZE", _where, _role));
    }
}

