// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {PluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/PluginSetup.sol";

/// @title PlaceholderSetup
/// @author Aragon Association - 2023
/// @notice A placeholder setup contract for outdated plugin builds. When moving plugin repos to new chains or layers, where only the latest release and build should be available, this placeholder can be used to populate previous builds.
/// @custom:security-contact sirt@aragon.org
contract PlaceholderSetup is PluginSetup {
    /// @notice Thrown if the dummy is used.
    error PlaceholderSetupCannotBeUsed();

    constructor() PluginSetup(address(0)) {}

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
}
