// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {IDAO} from "../../../../core/dao/IDAO.sol";
import {DAO} from "../../../../core/dao/DAO.sol";
import {PermissionLib} from "../../../../core/permission/PermissionLib.sol";
import {PluginSetup, IPluginSetup} from "../../../../framework/plugin/setup/PluginSetup.sol";
import {MajorityVotingBase} from "../MajorityVotingBase.sol";
import {AddresslistVoting} from "./AddresslistVoting.sol";

/// @title AddresslistVotingSetup
/// @author Aragon Association - 2022-2023
/// @notice The setup contract of the `AddresslistVoting` plugin.
contract AddresslistVotingSetup is PluginSetup {
    /// @notice The address of `AddresslistVoting` plugin logic contract to be used in creating proxy contracts.
    AddresslistVoting private immutable addresslistVotingBase;

    /// @notice The contract constructor, that deployes the `AddresslistVoting` plugin logic contract.
    constructor() {
        addresslistVotingBase = new AddresslistVoting();
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes calldata _data
    ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
        // Decode `_data` to extract the params needed for deploying and initializing `AddresslistVoting` plugin.
        (MajorityVotingBase.VotingSettings memory votingSettings, address[] memory members) = abi
            .decode(_data, (MajorityVotingBase.VotingSettings, address[]));

        // Prepare and Deploy the plugin proxy.
        plugin = createERC1967Proxy(
            address(addresslistVotingBase),
            abi.encodeWithSelector(
                AddresslistVoting.initialize.selector,
                _dao,
                votingSettings,
                members
            )
        );

        // Prepare permissions
        PermissionLib.MultiTargetPermission[]
            memory permissions = new PermissionLib.MultiTargetPermission[](4);

        // Set permissions to be granted.
        // Grant the list of prmissions of the plugin to the DAO.
        permissions[0] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            PermissionLib.NO_CONDITION,
            addresslistVotingBase.UPDATE_ADDRESSES_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            PermissionLib.NO_CONDITION,
            addresslistVotingBase.UPDATE_VOTING_SETTINGS_PERMISSION_ID()
        );

        permissions[2] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            PermissionLib.NO_CONDITION,
            addresslistVotingBase.UPGRADE_PLUGIN_PERMISSION_ID()
        );

        // Grant `EXECUTE_PERMISSION` of the DAO to the plugin.
        permissions[3] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Grant,
            _dao,
            plugin,
            PermissionLib.NO_CONDITION,
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
        permissions = new PermissionLib.MultiTargetPermission[](4);

        // Set permissions to be Revoked.
        permissions[0] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Revoke,
            _payload.plugin,
            _dao,
            PermissionLib.NO_CONDITION,
            addresslistVotingBase.UPDATE_ADDRESSES_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Revoke,
            _payload.plugin,
            _dao,
            PermissionLib.NO_CONDITION,
            addresslistVotingBase.UPDATE_VOTING_SETTINGS_PERMISSION_ID()
        );

        permissions[2] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Revoke,
            _payload.plugin,
            _dao,
            PermissionLib.NO_CONDITION,
            addresslistVotingBase.UPGRADE_PLUGIN_PERMISSION_ID()
        );

        permissions[3] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Revoke,
            _dao,
            _payload.plugin,
            PermissionLib.NO_CONDITION,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );
    }

    /// @inheritdoc IPluginSetup
    function implementation() external view returns (address) {
        return address(addresslistVotingBase);
    }
}
