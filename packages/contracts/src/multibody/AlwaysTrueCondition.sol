// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {PermissionCondition} from "../core/permission/PermissionCondition.sol";

contract AlwaysTrueCondition is PermissionCondition {

    function isGranted(address _where, address _who, bytes32 _permissionId, bytes calldata _data) public view override returns(bool) {
        return true;
    }
}