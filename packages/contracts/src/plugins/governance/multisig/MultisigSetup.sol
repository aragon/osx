// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IDAO} from "../../../core/dao/IDAO.sol";
import {DAO} from "../../../core/dao/DAO.sol";
import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {PluginSetupUpgradeable, IPluginSetup} from "../../../framework/plugin/setup/PluginSetupUpgradeable.sol";
import {Multisig} from "./Multisig.sol";

/// @title MultisigSetup - Release 1, Build 2
/// @author Aragon Association - 2022-2023
/// @notice The setup contract of the `Multisig` plugin.
/// @custom:security-contact sirt@aragon.org
contract MultisigSetup is PluginSetupUpgradeable {
    /// @notice The contract constructor, that deploys the `Multisig` plugin logic contract.
    constructor() PluginSetupUpgradeable(address(new Multisig())) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes calldata _data
    ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
        // Decode `_data` to extract the params needed for deploying and initializing `Multisig` plugin.
        (address[] memory members, Multisig.MultisigSettings memory multisigSettings) = abi.decode(
            _data,
            (address[], Multisig.MultisigSettings)
        );

        // Prepare and Deploy the plugin proxy.
        plugin = createERC1967Proxy(
            implementation,
            abi.encodeCall(Multisig.initialize, (IDAO(_dao), members, multisigSettings))
        );
        Multisig multisig = Multisig(plugin);

        // Prepare permissions
        PermissionLib.MultiTargetPermission[]
            memory permissions = new PermissionLib.MultiTargetPermission[](3);

        // Set permissions to be granted.
        // Grant the list of permissions of the plugin to the DAO.
        permissions[0] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            PermissionLib.NO_CONDITION,
            multisig.UPDATE_MULTISIG_SETTINGS_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            PermissionLib.NO_CONDITION,
            multisig.UPGRADE_PLUGIN_PERMISSION_ID()
        );

        // Grant `EXECUTE_PERMISSION` of the DAO to the plugin.
        permissions[2] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _dao,
            who: plugin,
            condition: PermissionLib.NO_CONDITION,
            permissionId: DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        });

        preparedSetupData.permissions = permissions;
    }

    /// @inheritdoc IPluginSetup
    function prepareUpdate(
        address _dao,
        uint16 _currentBuild,
        SetupPayload calldata _payload
    )
        external
        pure
        override
        returns (bytes memory initData, PreparedSetupData memory preparedSetupData)
    {}

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        SetupPayload calldata _payload
    ) external view returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        Multisig multisig = Multisig(_payload.plugin);

        // Prepare permissions
        permissions = new PermissionLib.MultiTargetPermission[](3);

        // Set permissions to be Revoked.
        permissions[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Revoke,
            where: _payload.plugin,
            who: _dao,
            condition: PermissionLib.NO_CONDITION,
            permissionId: multisig.UPDATE_MULTISIG_SETTINGS_PERMISSION_ID()
        });

        permissions[1] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Revoke,
            where: _payload.plugin,
            who: _dao,
            condition: PermissionLib.NO_CONDITION,
            permissionId: multisig.UPGRADE_PLUGIN_PERMISSION_ID()
        });

        permissions[2] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Revoke,
            where: _dao,
            who: _payload.plugin,
            condition: PermissionLib.NO_CONDITION,
            permissionId: DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        });
    }
}
