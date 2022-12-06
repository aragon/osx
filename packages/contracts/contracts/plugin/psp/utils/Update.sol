// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginRepo} from "../../PluginRepo.sol";
import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {PluginSetup} from "../../PluginSetup.sol";
import {_getSetupId, _getAppliedId, _getHelpersHash, _getPermissionsHash} from "./Common.sol";
import {IPlugin} from "../../../core/plugin/IPlugin.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

/// @notice Thrown if a plugin is not upgradeable.
/// @param plugin The address of the plugin contract.
error PluginNonupgradeable(address plugin);

/// @notice Thrown if a contract does not support the `IPlugin` interface.
/// @param plugin The address of the contract.
error IPluginNotSupported(address plugin);

/// @notice Thrown if two helpers hashes obtained via  [`getHelpersHash`](#private-function-`getHelpersHash`) don't match.
error HelpersHashMismatch();

/// @notice Thrown if a plugin setup is not applied.
error SetupNotApplied();

/// @notice The struct containing the parameters for the `prepareUpdate` function.
struct PrepareUpdateParams {
    address plugin; // The address of the `Plugin` contract being currently active. This can be a proxy or a concrete instance.
    PluginRepo pluginSetupRepo; // The repository storing the `PluginSetup` contracts of all versions of a plugin.
    PluginRepo.Tag currentVersionTag; // The `current` version of the plugin being currently active and to be updated from.
    PluginRepo.Tag newVersionTag; // The `new` version of the plugin to be updated to.
    address[] currentHelpers;
    bytes data;
}


function validatePrepareUpdate(
    address _dao,
    PrepareUpdateParams calldata _params,
    mapping(bytes32 => bool) storage isInstallationApplied,
    mapping(bytes32 => bytes32) storage helpersHashes
) returns (address) {
    if (
        _params.currentVersionTag.release != _params.newVersionTag.release ||
        _params.currentVersionTag.build <= _params.newVersionTag.build
    ) {
        // revert release id must be the same + new build id must be bigger.
    }

    // // Check that plugin is `PluginUUPSUpgradable`.
    if (!_params.plugin.supportsInterface(type(IPlugin).interfaceId)) {
        revert IPluginNotSupported({plugin: _params.plugin});
    }
    if (IPlugin(_params.plugin).pluginType() != IPlugin.PluginType.UUPS) {
        revert PluginNonupgradeable({plugin: _params.plugin});
    }

    // Check if plugin is applied
    if (!isInstallationApplied[_getAppliedId(_dao, _params.plugin)]) {
        revert SetupNotApplied();
    }

    bytes32 setupId = _getSetupId(
        _dao,
        _params.currentVersionTag,
        address(_params.pluginSetupRepo),
        _params.plugin
    );

    if (helpersHashes[setupId] != _getHelpersHash(_params.currentHelpers)) {
        revert HelpersHashMismatch();
    }

    // Free up space by deleting the helpers hash being not needed anymore.
    delete helpersHashes[setupId];

    // Grab the plugin setup that belongs to the new version tag
    // and validate that plugin setups are different otherwise it's pointless
    // to allow preparation.
    PluginRepo.Version memory currentVersion = _params.pluginSetupRepo.getVersion(
        _params.currentVersionTag
    );

    PluginRepo.Version memory newVersion = _params.pluginSetupRepo.getVersion(
        _params.newVersionTag
    );

    if (currentVersion.pluginSetup == newVersion.pluginSetup) {
        // revert plugin setups can't be the same(pointless)
    }

    return newVersion.pluginSetup;
}

function executePrepareUpdate(
    address _dao,
    address _pluginSetup,
    PrepareUpdateParams calldata _params,
    mapping(bytes32 => bytes32) storage helpersHashes,
    mapping(bytes32 => bytes32) storage updatePermissionHashes
)
    returns (
        address[] memory updatedHelpers,
        bytes memory initData,
        PermissionLib.ItemMultiTarget[] memory permissions
    )
{
    (updatedHelpers, initData, permissions) = PluginSetup(_pluginSetup).prepareUpdate(
        _dao,
        _params.plugin,
        _params.currentHelpers,
        _params.currentVersionTag.build,
        _params.data
    );

    // // Add new helpers for the future update checks
    bytes32 newSetupId = _getSetupId(
        _dao,
        _params.newVersionTag,
        address(_params.pluginSetupRepo),
        _params.plugin
    );

    helpersHashes[newSetupId] = _getHelpersHash(updatedHelpers);

    // Set new update permission hashes.
    updatePermissionHashes[newSetupId] = _getPermissionsHash(permissions);
}
