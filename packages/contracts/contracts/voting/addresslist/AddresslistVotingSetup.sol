// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IDAO} from "../../core/IDAO.sol";
import {DAO} from "../../core/DAO.sol";
import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {PluginSetup, IPluginSetup} from "../../plugin/PluginSetup.sol";
import {MajorityVotingBase} from "../majority/MajorityVotingBase.sol";
import {AddresslistVoting} from "./AddresslistVoting.sol";

/// @title AddresslistVotingSetup
/// @author Aragon Association - 2022
/// @notice The setup contract of the `AddresslistVoting` plugin.
contract AddresslistVotingSetup is PluginSetup {
    /// @notice The address of `AddresslistVoting` plugin logic contract to be used in creating proxy contracts.
    AddresslistVoting private immutable addresslistVotingBase;

    /// @notice The address zero to be used as condition address for permissions.
    address private constant NO_CONDITION = address(0);

    /// @notice The contract constructor, that deployes the `AddresslistVoting` plugin logic contract.
    constructor() {
        addresslistVotingBase = new AddresslistVoting();
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallationDataABI() external pure returns (string memory) {
        return
            "(tuple(uint8 votingMode, uint32 supportThreshold, uint32 minParticipation, uint64 minDuration, uint256 minProposerVotingPower) votingSettings, address[] members)";
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory _data
    )
        external
        returns (address plugin, PreparedDependency memory preparedDependency)
    {
        IDAO dao = IDAO(_dao);

        // Decode `_data` to extract the params needed for deploying and initializing `AddresslistVoting` plugin.
        (MajorityVotingBase.VotingSettings memory votingSettings, address[] memory members) = abi
            .decode(_data, (MajorityVotingBase.VotingSettings, address[]));

        // Prepare and Deploy the plugin proxy.
        plugin = createERC1967Proxy(
            address(addresslistVotingBase),
            abi.encodeWithSelector(
                AddresslistVoting.initialize.selector,
                dao,
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
            NO_CONDITION,
            addresslistVotingBase.UPDATE_ADDRESSES_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_CONDITION,
            addresslistVotingBase.UPDATE_VOTING_SETTINGS_PERMISSION_ID()
        );

        permissions[2] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_CONDITION,
            addresslistVotingBase.UPGRADE_PLUGIN_PERMISSION_ID()
        );

        // Grant `EXECUTE_PERMISSION` of the DAO to the plugin.
        permissions[3] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Grant,
            _dao,
            plugin,
            NO_CONDITION,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );

        preparedDependency.permissions = permissions;
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallationDataABI() external pure returns (string memory) {
        return "";
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(address _dao, SetupPayload calldata _payload)
        external
        view
        returns (PermissionLib.MultiTargetPermission[] memory permissions)
    {
        // Prepare permissions
        permissions = new PermissionLib.MultiTargetPermission[](4);

        // Set permissions to be Revoked.
        permissions[0] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Revoke,
            _payload.plugin,
            _dao,
            NO_CONDITION,
            addresslistVotingBase.UPDATE_ADDRESSES_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Revoke,
            _payload.plugin,
            _dao,
            NO_CONDITION,
            addresslistVotingBase.UPDATE_VOTING_SETTINGS_PERMISSION_ID()
        );

        permissions[2] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Revoke,
            _payload.plugin,
            _dao,
            NO_CONDITION,
            addresslistVotingBase.UPGRADE_PLUGIN_PERMISSION_ID()
        );

        permissions[3] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Revoke,
            _dao,
            _payload.plugin,
            NO_CONDITION,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );
    }

    /// @inheritdoc IPluginSetup
    function getImplementationAddress() external view returns (address) {
        return address(addresslistVotingBase);
    }
}
