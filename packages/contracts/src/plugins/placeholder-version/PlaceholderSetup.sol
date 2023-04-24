// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {PluginSetup, IPluginSetup} from "../../framework/plugin/setup/PluginSetup.sol";

/// @title PlaceholderSetup
/// @author Aragon Association - 2023
/// @notice A placeholder setup contract for outdated plugin builds. When moving plugin repos to new chains or layers, where only the latest release and build should be available, this placeholder can be used to populate previous builds.
contract PlaceholderSetup is PluginSetup {
    /// @notice Thrown if the dummy is used.
    error PlaceholderSetupCannotBeUsed();

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address /*_dao*/,
        bytes calldata /*_data*/
    ) external pure returns (address /*plugin*/, PreparedSetupData memory /*preparedSetupData*/) {
        revert PlaceholderSetupCannotBeUsed();
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address /*_dao*/,
        SetupPayload calldata /*_payload*/
    ) external pure returns (PermissionLib.MultiTargetPermission[] memory /*permissions*/) {
        revert PlaceholderSetupCannotBeUsed();
    }

    /// @inheritdoc IPluginSetup
    function implementation() external pure returns (address) {
        return address(0);
    }
}
