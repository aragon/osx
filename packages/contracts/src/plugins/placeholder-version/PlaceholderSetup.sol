// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {PluginSetup, IPluginSetup} from "../../framework/plugin/setup/PluginSetup.sol";

/// @title PlaceholderSetup
/// @author Aragon Association - 2023
/// @notice The setup contract acting as a placeholder for outdated plugin builds. These are used to save gas when giving builds and releases identical plugin repos after deployment that do not need to be published when deploying a plugin repo to a new chain or layer.
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
