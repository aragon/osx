// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

contract ERC1271Mock {
    function isValidSignature(bytes32, bytes memory) public pure returns (bytes4) {
        return 0x41424344;
    }
}
