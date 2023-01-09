// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

function getIndex(uint256 allowFailureMap, uint256 index) pure returns (bool) {
    uint256 bitIndex = allowFailureMap & (1 << (index & 0xff));
    return bitIndex > 0;
}

function setIndex(uint256 allowFailureMap, uint256 index) pure returns (uint256) {
    return allowFailureMap ^ (1 << (index & 0xff));
}
