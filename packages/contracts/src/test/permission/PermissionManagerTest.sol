// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../../core/permission/PermissionManager.sol";

contract PermissionManagerTest is PermissionManager {
    // Restricted permissionIds that shouldn't be allowed to grant for who = ANY_ADDR or where = ANY_ADDR
    bytes32 public constant TEST_PERMISSION_1_ID = keccak256("TEST_PERMISSION_1");
    bytes32 public constant TEST_PERMISSION_2_ID = keccak256("TEST_PERMISSION_2");

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

    function isPermissionRestrictedForAnyAddr(
        bytes32 _permissionId
    ) internal view virtual override returns (bool) {
        return _permissionId == TEST_PERMISSION_1_ID || _permissionId == TEST_PERMISSION_2_ID;
    }
}
