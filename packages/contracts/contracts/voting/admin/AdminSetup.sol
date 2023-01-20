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

    /// @notice The address zero to be used as oracle address for permissions.
    address private constant NO_ORACLE = address(0);

    /// @notice Thrown if admin address is zero.
    /// @param admin The admin address.
    error AdminAddressInvalid(address admin);

    /// @notice The contract constructor, that deployes the `Admin` plugin logic contract.
    constructor() {
        implementation = address(new Admin());
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory _data
    )
        external
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.ItemMultiTarget[] memory permissions
        )
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

        // Prepare helpers
        (helpers); // silence the warning.

        // Prepare permissions
        permissions = new PermissionLib.ItemMultiTarget[](2);

        // Grant `ADMIN_EXECUTE_PERMISSION` of the Plugin to the admin.
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            admin,
            NO_ORACLE,
            Admin(plugin).EXECUTE_PROPOSAL_PERMISSION_ID()
        );

        // Grant `EXECUTE_PERMISSION` on the DAO to the plugin.
        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            _dao,
            plugin,
            NO_ORACLE,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );
    }

    /// @inheritdoc IPluginSetup
    /// @dev Currently there is not a relaiable mean to revoke plugin's permissions such as `ADMIN_EXECUTE_PERMISSION_ID`
    /// that have been granted to addresses during the life cycle of the plugin.
    /// or the ones that have been granted are not revoked already,
    /// therefore, only `EXECUTE_PERMISSION_ID` is revoked for this uninstallation.
    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata,
        bytes calldata
    ) external view returns (PermissionLib.ItemMultiTarget[] memory permissions) {
        // Prepare permissions
        permissions = new PermissionLib.ItemMultiTarget[](1);

        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            DAO(payable(_dao)).EXECUTE_PERMISSION_ID()
        );
    }

    /// @inheritdoc IPluginSetup
    function getImplementationAddress() external view returns (address) {
        return implementation;
    }
}
