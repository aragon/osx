// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../core/permission/PermissionManager.sol";

contract PermissionManagerTest is PermissionManager {
    function init(address _who) public initializer {
        super.__PermissionManager_init(_who);
    }

    function getAuthPermission(
        address _where,
        address _who,
        bytes32 _permissionId
    ) public view returns (address) {
        return permissionsHashed[permissionHash(_where, _who, _permissionId)];
    }

    function getPermissionHash(
        address _where,
        address _who,
        bytes32 _permissionId
    ) public pure returns (bytes32) {
        return permissionHash(_where, _who, _permissionId);
    }

    function getFrozenPermissionHash(address _where, bytes32 _permissionId)
        public
        pure
        returns (bytes32)
    {
        return frozenPermissionHash(_where, _permissionId);
    }

    function getAnyAddr() public pure returns (address) {
        return ANY_ADDR;
    }

    function hasPermission(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes memory _data
    ) public view returns (bool) {
        return _isGranted(_where, _who, _permissionId, _data);
    }
}
