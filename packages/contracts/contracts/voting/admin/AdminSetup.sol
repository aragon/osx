// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {IDAO} from "../../core/IDAO.sol";
import {DAO} from "../../core/DAO.sol";
import {PermissionLib} from "../../core/permission/PermissionLib.sol";
import {PluginSetup, IPluginSetup} from "../../plugin/PluginSetup.sol";
import {Admin} from "./Admin.sol";

/// @title AdminAddressSetup
/// @author Aragon Association - 2022
/// @notice The setup contract of the `Admin` plugin.
contract AdminSetup is PluginSetup {
    using Clones for address;

    /// @notice The address of `Admin` plugin logic contract to be cloned.
    address private immutable implementation;

    /// @notice The address zero to be used as condition address for permissions.
    address private constant NO_CONDITION = address(0);

    /// @notice Thrown if admin address is zero.
    /// @param admin The admin address.
    error AdminAddressInvalid(address admin);

    /// @notice The contract constructor, that deployes the `Admin` plugin logic contract.
    constructor() {
        implementation = address(new Admin());
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallationDataABI() external pure returns (string memory) {
        return "(address admin)";
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

        // Decode `_data` to extract the params needed for cloning and initializing `Admin` plugin.
        address admin = abi.decode(_data, (address));

        if (admin == address(0)) {
            revert AdminAddressInvalid({admin: admin});
        }

        // Clone plugin contract.
        plugin = implementation.clone();

        // Initialize cloned plugin contract.
        Admin(plugin).initialize(dao);

        // Prepare permissions
        PermissionLib.MultiTargetPermission[]
            memory permissions = new PermissionLib.MultiTargetPermission[](2);

        // Grant `ADMIN_EXECUTE_PERMISSION` of the Plugin to the admin.
        permissions[0] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Grant,
            plugin,
            admin,
            NO_CONDITION,
            Admin(plugin).EXECUTE_PROPOSAL_PERMISSION_ID()
        );

        // Grant `EXECUTE_PERMISSION` on the DAO to the plugin.
        permissions[1] = PermissionLib.MultiTargetPermission(
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
    /// @dev Currently there is not a relaiable mean to revoke plugin's permissions such as `ADMIN_EXECUTE_PERMISSION_ID`
    /// that have been granted to addresses during the life cycle of the plugin.
    /// or the ones that have been granted are not revoked already,
    /// therefore, only `EXECUTE_PERMISSION_ID` is revoked for this uninstallation.
    function prepareUninstallation(address _dao, SetupPayload calldata _payload)
        external
        view
        returns (PermissionLib.MultiTargetPermission[] memory permissions)
    {
        // Prepare permissions
        permissions = new PermissionLib.MultiTargetPermission[](1);

        permissions[0] = PermissionLib.MultiTargetPermission(
            PermissionLib.Operation.Revoke,
            _dao,
            _payload.plugin,
            NO_CONDITION,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );
    }

    /// @inheritdoc IPluginSetup
    function getImplementationAddress() external view returns (address) {
        return implementation;
    }
}
