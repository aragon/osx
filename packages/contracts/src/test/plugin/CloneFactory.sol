// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

contract CloneFactory {
    using Clones for address;

    address private immutable implementation;

    constructor(address _implementation) {
        implementation = _implementation;
    }

    function deployClone() external returns (address clone) {
        return implementation.clone();
    }
}
