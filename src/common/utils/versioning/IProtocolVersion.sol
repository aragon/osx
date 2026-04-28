// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

/// @title IProtocolVersion
/// @author Aragon X - 2022-2023
/// @notice An interface defining the semantic Aragon OSx protocol version number.
/// @custom:security-contact sirt@aragon.org
interface IProtocolVersion {
    /// @notice Returns the semantic Aragon OSx protocol version number that the implementing contract is associated with.
    /// @return _version Returns the semantic Aragon OSx protocol version number.
    /// @dev This version number is not to be confused with the `release` and `build` numbers found in the `Version.Tag` struct inside the `PluginRepo` contract being used to version plugin setup and associated plugin implementation contracts.
    function protocolVersion() external view returns (uint8[3] memory _version);
}
