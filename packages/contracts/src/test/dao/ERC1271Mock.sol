// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

contract ERC1271Mock {
    event Called(uint);

    bytes4 private magicValue;

    function setMagicValue(bytes4 _magicValue) public {
        magicValue = _magicValue;
    }

    function isValidSignature(bytes32, bytes memory) public view returns (bytes4) {
        return magicValue;
    }
}
