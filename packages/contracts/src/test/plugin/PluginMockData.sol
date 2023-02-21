// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {createERC1967Proxy} from "../../utils/Proxy.sol";

address constant NO_CONDITION = address(0);

function mockPermissions(
    uint160 start,
    uint160 end,
    PermissionLib.Operation op
) pure returns (PermissionLib.MultiTargetPermission[] memory permissions) {
    require(end > start);
    permissions = new PermissionLib.MultiTargetPermission[](end - start);

    for (uint160 i = start; i < end; i++) {
        permissions[i - start] = PermissionLib.MultiTargetPermission(
            op,
            address(i),
            address(i),
            PermissionLib.NO_CONDITION,
            keccak256("MOCK_PERMISSION")
        );
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
        createERC1967Proxy(
            _pluginBase,
            abi.encodeWithSelector(bytes4(keccak256("initialize(address)")), _dao)
        );
}
