// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {IDAO} from "../../core/IDAO.sol";
import {DAO} from "../../core/DAO.sol";
import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {PluginSetup, IPluginSetup} from "../../plugin/PluginSetup.sol";
import {AdminAddressGovernance} from "./AdminAddressGovernance.sol";

/// @title AdminAddressGovernanceSetup
/// @author Aragon Association - 2022
/// @notice The setup contract of the `AdminAddressGovernance` plugin.
contract AdminAddressGovernanceSetup is PluginSetup {
    using Clones for address;

    /// @notice The address of `AdminAddressGovernance` plugin logic contract to be used in creating proxy contracts.
    address private immutable adminAddressGovernanceBase;

    /// @notice The address zero to be used as oracle address for permissions.
    address private constant NO_ORACLE = address(0);

    /// @notice Thrown if admin address is zero.
    /// @param admin The admin address.
    error AdminAddressInvalid(address admin);

    /// @notice The contract constructor, that deployes the `AdminAddressGovernance` plugin logic contract.
    constructor() {
        adminAddressGovernanceBase = address(new AdminAddressGovernance());
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallationDataABI() external pure returns (string memory) {
        return "(address admin)";
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

        // Decode `_data` to extract the params needed for deploying and initializing `AdminAddressGovernance` plugin.
        address admin = abi.decode(_data, (address));

        if (admin == address(0)) {
            revert AdminAddressInvalid({admin: admin});
        }

        // Clone plugin contract.
        plugin = adminAddressGovernanceBase.clone();

        // Initialize cloned plugin contract.
        AdminAddressGovernance(plugin).initialize(dao, admin);

        // Prepare helpers
        helpers = new address[](0);

        // Prepare permissions
        permissions = new PermissionLib.ItemMultiTarget[](1);

        // TODO: not done yet.

        // Grant `EXECUTE_PERMISSION` of the DAO to the plugin.
        permissions[1] = PermissionLib.ItemMultiTarget(
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
        // TODO: not done yet.

        // Prepare permissions
        permissions = new PermissionLib.ItemMultiTarget[](1);

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );
    }

    /// @inheritdoc IPluginSetup
    function getImplementationAddress() external view returns (address) {
        return adminAddressGovernanceBase;
    }
}
