// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";

/// @title MultiplyHelper
/// @author Aragon Association - 2022-2023
/// @notice A helper contract providing a multiply function for the `CounterV1` and `CounterV2` example contracts.
contract MultiplyHelper is PluginUUPSUpgradeable {
    /// @notice The ID of the permission required to call the `multiply` function.
    bytes32 public constant MULTIPLY_PERMISSION_ID = keccak256("MULTIPLY_PERMISSION");

    /// @notice Multiplies the count with a number.
    /// @param _a The number to multiply the coun with.
    function multiply(
        uint256 _a,
        uint256 _b
    ) external view auth(MULTIPLY_PERMISSION_ID) returns (uint256) {
        return _a * _b;
    }
}
