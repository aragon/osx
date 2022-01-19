/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import '../core/acl/ACL.sol';

contract ACLTest is ACL {
    function init(address _who) public {
        super.initACL(_who);
    }

    function getAuthPermission(
        address _where,
        address _who,
        bytes32 _role
    ) public view returns (address) {
        return authPermissions[permissionHash(_where, _who, _role)];
    }

    function getFreezePermission(address _where, bytes32 _role)
        public
        view
        returns (bool)
    {
        return freezePermissions[freezeHash(_where, _role)];
    }

    function getPermissionHash(
        address _where,
        address _who,
        bytes32 _role
    ) public pure returns (bytes32) {
        return permissionHash(_where, _who, _role);
    }

    function getFreezeHash(address _where, bytes32 _role)
        public
        pure
        returns (bytes32)
    {
        return freezeHash(_where, _role);
    }

    function getAnyAddr() public pure returns (address) {
        return ANY_ADDR;
    }

    function checkRole(
        address _where,
        address _who,
        bytes32 _role,
        bytes memory _data
    ) public returns (bool) {
        return _checkRole(_where, _who, _role, _data);
    }
}
