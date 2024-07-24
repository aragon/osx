// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

contract PluginB {
    uint256 public ss = 30;

    bytes32 public UPDATE_METADATA_PERMISSION_ID = keccak256("UPDATE_METADATA_PERMISSION");

    function updateMetadata() public auth(UPDATE_METADATA_PERMISSION_ID) {
        uint256 k = 20;
    }
}
