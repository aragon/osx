/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "./UnstructuredStorage.sol";
import "../../core/IDAO.sol";

contract AppStorage {
    using UnstructuredStorage for bytes32;

    bool notAllowed;

    /* Hardcoded constants to save gas
    bytes32 internal constant KERNEL_POSITION = keccak256("aragonOS.appStorage.dao");
    bytes32 internal constant UPDATE_ALLOW_POSITION = keccak256("aragonOS.appStorage.update_allowed)
    */
    bytes32 internal constant DAO_POSITION =
        0x4172f0f7d2289153072b0a6ca36959e0cbe2efc3afe50fc81636caa96338137b;
    bytes32 internal constant UPDATE_ALLOW_POSITION =
        0xc50adcaa9fce1895845cce9728abd15a18525584e6d613a998988cb9ad5d3c9b;

    function dao() public view returns (IDAO) {
        return IDAO(DAO_POSITION.getStorageAddress());
    }

    function setDAO(address _dao) internal {
        DAO_POSITION.setStorageAddress(_dao);
    }

    function updateNotAllowed() public view returns (bool) {
        return UPDATE_ALLOW_POSITION.getStorageBool();
    }

    function setUpdateNotAllowed(bool _data) internal {
        UPDATE_ALLOW_POSITION.setStorageBool(_data);
    }
}
