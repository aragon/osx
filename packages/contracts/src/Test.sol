// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

contract Sec1 {
    uint public x = 1;
}

contract Sec3 {
    uint public x = 2;
}

contract Sec2 {
    address public fuck;

    bytes32 public oeblll = 0x626c756500000000000000000000000000000000000000000000000000000000;

    constructor() public {
        fuck = address(new Sec3{salt: oeblll}());
    }
}

contract Test {
    address public ss1;
    address public ss2;
    uint public x = 2702;

    event giorgi(address, uint256);

    constructor(uint z) {
        ss1 = address(new Sec1());
        ss2 = address(new Sec2());
    }
}
