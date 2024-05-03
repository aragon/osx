// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";

address constant NO_CONDITION = address(0);

error ConflictingValues();

function mockPermissions(
    uint160 start,
    uint160 end,
    PermissionLib.Operation op
) pure returns (PermissionLib.MultiTargetPermission[] memory permissions) {
    if (start > end) revert ConflictingValues();

    permissions = new PermissionLib.MultiTargetPermission[](end - start);

    for (uint160 i = start; i < end; i++) {
        permissions[i - start] = PermissionLib.MultiTargetPermission({
            operation: op,
            where: address(i),
            who: address(i),
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("MOCK_PERMISSION")
        });
    }
}

function mockHelpers(uint160 amount) pure returns (address[] memory helpers) {
    helpers = new address[](amount);

    for (uint160 i = 0; i < amount; i++) {
        helpers[i] = address(i);
    }
}

function mockPluginProxy(address _pluginBase, address _dao) returns (address) {
    return
        ProxyLib.deployUUPSProxy(
            _pluginBase,
            abi.encodeWithSelector(bytes4(keccak256("initialize(address)")), _dao)
        );
}
