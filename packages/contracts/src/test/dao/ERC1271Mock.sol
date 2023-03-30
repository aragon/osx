// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity >=0.8.0 <0.9.0;

contract ERC1271Mock {
    function isValidSignature(bytes32, bytes memory) public pure returns (bytes4) {
        return 0x41424344;
    }
}
