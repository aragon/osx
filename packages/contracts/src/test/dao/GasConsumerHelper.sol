// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

contract GasConsumer {
    mapping(uint256 => uint256) public store;

    function consumeGas(uint256 count) external {
        for (uint i = 0; i < count; i++) {
            store[i] = 1;
        }
    }
}
