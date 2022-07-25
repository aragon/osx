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
        bytes32 _permissionID
    ) public view returns (address) {
        return permissionsHashed[permissionHash(_where, _who, _permissionID)];
    }

    function getPermissionHash(
        address _where,
        address _who,
        bytes32 _permissionID
    ) public pure returns (bytes32) {
        return permissionHash(_where, _who, _permissionID);
    }

    function getImmutablePermissionHash(address _where, bytes32 _permissionID)
        public
        pure
        returns (bytes32)
    {
        return immutablePermissionHash(_where, _permissionID);
    }

    function getAnyAddr() public pure returns (address) {
        return ANY_ADDR;
    }

    function hasPermission(
        address _where,
        address _who,
        bytes32 _permissionID,
        bytes memory _data
    ) public returns (bool) {
        return _hasPermission(_where, _who, _permissionID, _data);
    }
}
