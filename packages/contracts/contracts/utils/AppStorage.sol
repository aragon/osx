// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/StorageSlot.sol";
import "../core/IDAO.sol";

/// @notice Core storage that stores information at very specific slots.
contract AppStorage {    
    
    /// @notice The position in storage in which the contract address fulfilling the `IDAO` interface is stored
    /// @dev bytes32 internal constant DAO_POSITION = keccak256("core.storage.dao");
    bytes32 internal constant DAO_POSITION = 0xd69e81f6042b963e91c7595979ec7bb19d41b99e5a44a91c85e5cd5861e49998;
    
    /// @notice Gets the`IDAO` contract being stored in the `DAO_POSITION` storage slot.
    /// @return The `IDAO` contract.
    function dao() public view returns (IDAO) {
        return IDAO(StorageSlot.getAddressSlot(DAO_POSITION).value);
    }

    /// @notice Stores the`IDAO` contract in the `DAO_POSITION` storage slot.
    /// @param _dao The address of the `IDAO` contract to be stored.
    function setDAO(address _dao) internal {
        StorageSlot.getAddressSlot(DAO_POSITION).value = _dao;
    }

}
