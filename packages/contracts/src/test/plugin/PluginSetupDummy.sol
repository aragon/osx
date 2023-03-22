// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {PluginSetup, IPluginSetup} from "../../framework/plugin/setup/PluginSetup.sol";

/// @title PluginSetupDummy
/// @author Aragon Association - 2023
/// @notice The setup contract acting as a placeholder.
contract PluginSetupDummy is PluginSetup {
    /// @notice Thrown if the dummy is used.
    error DummyCannotBeUsed();

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address /*_dao*/,
        bytes calldata /*_data*/
    ) external pure returns (address /*plugin*/, PreparedSetupData memory /*preparedSetupData*/) {
        revert DummyCannotBeUsed();
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address /*_dao*/,
        SetupPayload calldata /*_payload*/
    ) external pure returns (PermissionLib.MultiTargetPermission[] memory /*permissions*/) {
        revert DummyCannotBeUsed();
    }

    /// @inheritdoc IPluginSetup
    function implementation() external pure returns (address) {
        revert DummyCannotBeUsed();
    }
}
