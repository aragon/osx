// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "../../core/permission/PermissionConditionBase.sol";

contract PermissionConditionMock is PermissionConditionBase {
    bool internal _hasPermissionsResult = true;

    function isGranted(
        address /* _where */,
        address /* _who */,
        bytes32 /* _permissionId */,
        bytes memory /* _data */
    ) external view returns (bool) {
        return _hasPermissionsResult;
    }

    function setWillPerform(bool _result) external {
        _hasPermissionsResult = _result;
    }
}
