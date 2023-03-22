// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

/// @notice This contract is used for testing to consume gas.
contract GasConsumer {
    mapping(uint256 => uint256) public store;

    function consumeGas(uint256 count) external {
        for (uint256 i = 0; i < count; i++) {
            store[i] = 1;
        }
    }
}
