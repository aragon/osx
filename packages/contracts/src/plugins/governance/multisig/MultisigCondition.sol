// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {MultisigV2} from "./MultisigV2.sol";

import {PermissionCondition} from "../../../core/permission/PermissionCondition.sol";

contract MultisigCondition is PermissionCondition {

    MultisigV2 private immutable multisig;

    constructor(address _multisig) {
        multisig = MultisigV2(_multisig);
    }

    function isGranted(
        address _where, 
        address _who,
        bytes32 _permissionId, 
        bytes calldata _data
    ) public view override returns(bool) {
        (bool onlyListed, ) = multisig.multisigSettings();
        if (onlyListed && !multisig.isListed(_who)) {
            return false;
        }

        return true;
    }
}
