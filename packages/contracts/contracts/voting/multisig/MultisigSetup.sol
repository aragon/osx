// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {IDAO} from "../../core/IDAO.sol";
import {DAO} from "../../core/DAO.sol";
import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {PluginSetup, IPluginSetup} from "../../plugin/PluginSetup.sol";
import {Multisig} from "./Multisig.sol";

/// @title MultisigSetup
/// @author Aragon Association - 2022
/// @notice The setup contract of the `Multisig` plugin.
contract MultisigSetup is PluginSetup {
    /// @notice The address of `Multisig` plugin logic contract to be used in creating proxy contracts.
    Multisig private immutable multisigBase;

    /// @notice The address zero to be used as oracle address for permissions.
    address private constant NO_ORACLE = address(0);

    /// @notice The contract constructor, that deployes the `Multisig` plugin logic contract.
    constructor() {
        multisigBase = new Multisig();
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallationDataABI() external pure returns (string memory) {
        return "(address[] members, tuple(bool onlyListed, uint256 minApprovals))";
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

        // Decode `_data` to extract the params needed for deploying and initializing `Multisig` plugin.
        (
            address[] memory members,
            Multisig.MultisigSettings memory multisigSettings
        ) = abi.decode(_data, (address[], Multisig.MultisigSettings));

        // Prepare and Deploy the plugin proxy.
        plugin = createERC1967Proxy(
            address(multisigBase),
            abi.encodeWithSelector(
                Multisig.initialize.selector,
                dao,
                members,
                multisigSettings
            )
        );

        // Prepare helpers
        (helpers); // silence the warning.

        // Prepare permissions
        permissions = new PermissionLib.ItemMultiTarget[](3);

        // Set permissions to be granted.
        // Grant the list of prmissions of the plugin to the DAO.
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_ORACLE,
            multisigBase.UPDATE_MULTISIG_SETTINGS_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            NO_ORACLE,
            multisigBase.UPGRADE_PLUGIN_PERMISSION_ID()
        );

        // Grant `EXECUTE_PERMISSION` of the DAO to the plugin.
        permissions[2] = PermissionLib.ItemMultiTarget(
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
        permissions = new PermissionLib.ItemMultiTarget[](3);

        // Set permissions to be Revoked.
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _plugin,
            _dao,
            NO_ORACLE,
            multisigBase.UPDATE_MULTISIG_SETTINGS_PERMISSION_ID()
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _plugin,
            _dao,
            NO_ORACLE,
            multisigBase.UPGRADE_PLUGIN_PERMISSION_ID()
        );

        permissions[2] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );
    }

    /// @inheritdoc IPluginSetup
    function getImplementationAddress() external view returns (address) {
        return address(multisigBase);
    }
}
