// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IDAO} from "../../core/IDAO.sol";
import {DAO} from "../../core/DAO.sol";
import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {PluginSetup, IPluginSetup} from "../../plugin/PluginSetup.sol";
import {AllowlistVoting} from "./AllowlistVoting.sol";

/// @title AllowlistVotingSetup
/// @author Aragon Association - 2022
/// @notice The setup contract of the `AllowlistVoting` plugin.
contract AllowlistVotingSetup is PluginSetup {
    /// @notice The address of `AllowlistVoting` plugin logic contract to be used in creating proxy contracts.
    AllowlistVoting private immutable allowlistVotingBase;

    /// @notice The address zero to be used as oracle address for permissions.
    address private constant NO_ORACLE = address(0);

    /// @notice The contract constructor, that deployes the `AllowlistVoting` plugin logic contract.
    constructor() {
        allowlistVotingBase = new AllowlistVoting();
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallationDataABI() external pure returns (string memory) {
        return
            "(uint64 participationRequiredPct, uint64 supportRequiredPct, uint64 minDuration, address[] allowed)";
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(address _dao, bytes memory _data)
        external
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.ItemMultiTarget[] memory permissions
        )
    {
        IDAO dao = IDAO(_dao);

        // Decode `_data` to extract the params needed for deploying and initializing `AllowlistVoting` plugin.
        (
            uint64 participationRequiredPct,
            uint64 supportRequiredPct,
            uint64 minDuration,
            address[] memory allowed
        ) = abi.decode(_data, (uint64, uint64, uint64, address[]));

        // Prepare and Deploy the plugin proxy.
        plugin = createERC1967Proxy(
            address(allowlistVotingBase),
            abi.encodeWithSelector(
                AllowlistVoting.initialize.selector,
                dao,
                dao.getTrustedForwarder(),
                participationRequiredPct,
                supportRequiredPct,
                minDuration,
                allowed
            )
        );

        // Prepare helpers
        helpers = new address[](0);

        // Prepare permissions
        permissions = new PermissionLib.ItemMultiTarget[](4);

        // Set permissions to be granted.
        // Grant the list of prmissions of the plugin to the DAO.
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_ORACLE,
            allowlistVotingBase.MODIFY_ALLOWLIST_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_ORACLE,
            allowlistVotingBase.SET_CONFIGURATION_PERMISSION_ID()
        );

        permissions[2] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_ORACLE,
            allowlistVotingBase.UPGRADE_PERMISSION_ID()
        );

        // Grant `EXECUTE_PERMISSION` of the DAO to the plugin.
        permissions[3] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            _dao,
            plugin,
            NO_ORACLE,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallationDataABI() external pure returns (string memory) {
        return "";
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata,
        bytes calldata
    ) external view returns (PermissionLib.ItemMultiTarget[] memory permissions) {
        // Prepare permissions
        permissions = new PermissionLib.ItemMultiTarget[](4);

        // Set permissions to be Revoked.
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _plugin,
            _dao,
            NO_ORACLE,
            allowlistVotingBase.MODIFY_ALLOWLIST_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _plugin,
            _dao,
            NO_ORACLE,
            allowlistVotingBase.SET_CONFIGURATION_PERMISSION_ID()
        );

        permissions[2] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _plugin,
            _dao,
            NO_ORACLE,
            allowlistVotingBase.UPGRADE_PERMISSION_ID()
        );

        permissions[3] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );
    }

    /// @inheritdoc IPluginSetup
    function getImplementationAddress() external view returns (address) {
        return address(allowlistVotingBase);
    }
}
