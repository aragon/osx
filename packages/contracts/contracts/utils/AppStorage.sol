// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "./UnstructuredStorage.sol";
import "../core/IDAO.sol";

contract AppStorage {
    using UnstructuredStorage for bytes32;
    
    /* Hardcoded constants to save gas
    bytes32 internal constant DAO_POSITION = keccak256("aragonCore.appStorage.dao");
    */
    bytes32 internal constant DAO_POSITION = 0xcc4b1e6cefe3fef82eb08a6a678aa17d9aaa5a1bf67e55309e9d2b3bbd029b0c;

    function dao() public view returns (IDAO) {
        return IDAO(DAO_POSITION.getStorageAddress());
    }

    function setDAO(address _dao) internal {
        DAO_POSITION.setStorageAddress(_dao);
    }

}
