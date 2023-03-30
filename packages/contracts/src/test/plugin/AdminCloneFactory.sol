// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity >=0.8.0 <0.9.0;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {Admin} from "../../plugins/governance/admin/Admin.sol";

contract AdminCloneFactory {
    using Clones for address;

    address private immutable implementation;

    constructor() {
        implementation = address(new Admin());
    }

    function deployClone() external returns (address clone) {
        return implementation.clone();
    }
}
