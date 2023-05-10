// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

/// @title IProtocolVersion
/// @author Aragon Association - 2022-2023
/// @notice An interface defining protocol version
interface IProtocolVersion {
    /// @notice Retrieves the protocol version.
    /// @return _version Returns a uint8 array with three elements representing the protocol version.
    function protocolVersion() external view returns (uint8[3] memory _version);
}
