// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "./Uint256Helpers.sol";

contract TimeHelpers {
    using Uint256Helpers for uint256;

    /// @notice Getter for the block number
    /// @return The block number
    /// @dev Using a function rather than `block.number` allows us to easily mock the block number in tests
    function getBlockNumber() internal view virtual returns (uint256) {
        return block.number;
    }

    /// @notice Getter for the block number converted to `uint64`
    /// @return The block number converted to `uint64`
    /// @dev Using a function rather than `block.number` allows us to easily mock the block number in tests
    function getBlockNumber64() internal view virtual returns (uint64) {
        return getBlockNumber().toUint64();
    }

    /// @notice Getter for the timestamp
    /// @return The timestamp
    /// @dev Using a function rather than `block.timestamp` allows us to easily mock it in tests
    function getTimestamp() internal view virtual returns (uint256) {
        return block.timestamp; // solium-disable-line security/no-block-members
    }

    /// @notice Getter for the timestamp converted to `uint64`
    /// @return The timestamp converted to `uint64`
    /// @dev Using a function rather than `block.timestamp` allows us to easily mock it in tests
    function getTimestamp64() internal view virtual returns (uint64) {
        return getTimestamp().toUint64();
    }
}
