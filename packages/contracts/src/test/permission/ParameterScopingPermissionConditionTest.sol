// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {IPermissionCondition} from "../../core/permission/IPermissionCondition.sol";
import {TestPlugin} from "../plugin/PluginTest.sol";

contract TestParameterScopingPermissionCondition is IPermissionCondition {
    bytes4 public constant ADD_PERMISSIONED_SELECTOR = TestPlugin.addPermissioned.selector;

    function getSelector(bytes memory _data) public pure returns (bytes4 sig) {
        assembly {
            sig := mload(add(_data, 32))
        }
    }

    function isGranted(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes calldata _data
    ) external pure returns (bool) {
        (_where, _who, _permissionId);

        // Require the function selector to match
        require(getSelector(_data) == ADD_PERMISSIONED_SELECTOR);

        // Decode the parameters
        (uint256 p1, uint256 p2) = abi.decode(_data[4:], (uint256, uint256));

        // The function will perform, if the first parameter is larger than the second
        return p1 > p2;
    }
}
