// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../core/permission/IPermissionOracle.sol";

contract PermissionOracleMock is IPermissionOracle {
    bool internal _hasPermissionsResult = true;

    function hasPermissions(
        address, /* _where */
        address, /* _who */
        bytes32, /* _permissionID */
        bytes memory /* _data */
    ) external view returns (bool) {
        return _hasPermissionsResult;
    }

    function setWillPerform(bool _result) external {
        _hasPermissionsResult = _result;
    }
}
