// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {IDAO} from "../../../core/dao/IDAO.sol";
import {DAO} from "../../../core/dao/DAO.sol";
import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {PluginSetup, IPluginSetup} from "../../../framework/plugin/setup/PluginSetup.sol";
import {Multisig} from "./Multisig.sol";

/// @title MultisigSetup
/// @author Aragon Association - 2022-2023
/// @notice The setup contract of the `Multisig` plugin.
contract MultisigSetup is PluginSetup {
    /// @notice The address zero to be used as condition address for permissions.
    address private constant NO_CONDITION = address(0);

    /// @notice The contract constructor, that deployes the `Multisig` plugin logic contract.
    constructor() PluginSetup(address(new Multisig())) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory _data
    ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
        IDAO dao = IDAO(_dao);

        // Decode `_data` to extract the params needed for deploying and initializing `Multisig` plugin.
        (address[] memory members, Multisig.MultisigSettings memory multisigSettings) = abi.decode(
            _data,
            (address[], Multisig.MultisigSettings)
        );

        // Prepare and Deploy the plugin proxy.
        plugin = createERC1967Proxy(
            implementation,
            abi.encodeWithSelector(Multisig.initialize.selector, dao, members, multisigSettings)
        );

        // Prepare permissions
        PermissionLib.MultiTargetPermission[]
            memory permissions = new PermissionLib.MultiTargetPermission[](3);

        // Set permissions to be granted.
        // Grant the list of prmissions of the plugin to the DAO.
        permissions[0] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_CONDITION,
            Multisig(plugin).UPDATE_MULTISIG_SETTINGS_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_CONDITION,
            Multisig(plugin).UPGRADE_PLUGIN_PERMISSION_ID()
        );

        // Grant `EXECUTE_PERMISSION` of the DAO to the plugin.
        permissions[2] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Grant,
            _dao,
            plugin,
            NO_CONDITION,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );

        preparedSetupData.permissions = permissions;
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        SetupPayload calldata _payload
    ) external view returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        // Prepare permissions
        permissions = new PermissionLib.MultiTargetPermission[](3);

        Multisig multisigImplementation = Multisig(implementation);

        // Set permissions to be Revoked.
        permissions[0] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Revoke,
            _payload.plugin,
            _dao,
            NO_CONDITION,
            multisigImplementation.UPDATE_MULTISIG_SETTINGS_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Revoke,
            _payload.plugin,
            _dao,
            NO_CONDITION,
            multisigImplementation.UPGRADE_PLUGIN_PERMISSION_ID()
        );

        permissions[2] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Revoke,
            _dao,
            _payload.plugin,
            NO_CONDITION,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );
    }
}
