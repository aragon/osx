// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

/// @title IProtocolVersion
/// @author Aragon Association - 2022-2023
/// @notice An interface defining the semantic OSx protocol version.
interface IProtocolVersion {
    /// @notice Returns the protocol version at which the current contract was built. Use it to check for future upgrades that might be applicable.
    /// @return _version Returns the semantic OSx protocol version.
    function protocolVersion() external view returns (uint8[3] memory _version);
}
