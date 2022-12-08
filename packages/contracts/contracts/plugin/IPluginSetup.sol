// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PermissionLib} from "../core/permission/PermissionLib.sol";

interface IPluginSetup {
    /// @param helpers The address array of helpers (contracts or EOAs) associated with the plugin after the install or update.
    /// @param permissions The array of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the installing or updating DAO.
    struct PreparedDependency {
        address[] helpers;
        PermissionLib.ItemMultiTarget[] permissions;
    }

    /// @param plugin The address of the `Plugin`.
    /// @param currentHelpers The address array of all current helpers (contracts or EOAs) associated with the plugin to update from.
    /// @param data The `bytes` encoded data containing the input parameters for the preparation of update/uninstall as specified in the `prepareUpdateDataABI()` or `prepareUninstallationDataABI` function.
    struct SetupPayload {
        address plugin;
        address[] currentHelpers;
        bytes data;
    }

    /// @notice The ABI required to decode the `bytes` data in `prepareInstallation()`.
    /// @return The ABI in string format.
    function prepareInstallationDataABI() external view returns (string memory);

    /// @notice Prepares the installation of a plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _data The `bytes` encoded data containing the input parameters for the installation as specified in the `prepareInstallationDataABI()` function.
    /// @return plugin The address of the `Plugin` contract being prepared for installation.
    /// @return preparedDependency TOD:GIORGI
    function prepareInstallation(address _dao, bytes memory _data)
        external
        returns (address plugin, PreparedDependency memory preparedDependency);

    /// @notice The ABI required to decode the `bytes` data in `prepareUpdate()`.
    /// @return The ABI in string format.
    /// @dev The empty implemention is provided here so that this doesn't need to be overriden and implemented. This is relevant, for example, for the initial version of a plugin for which no update exists.
    function prepareUpdateDataABI() external view returns (string memory);

    /// @notice Prepares the update of a plugin.
    /// @param _dao The address of the updating DAO.
    /// @param _currentBuild The build number of the plugin to update from.
    /// @param _payload TOD:GIORGI how to add explanation ? 
    /// @return initData The initialization data to be passed to upgradeable contracts when the update is applied in the `PluginSetupProcessor`.
    /// @return preparedDependency TOD:GIORGI
    function prepareUpdate(
        address _dao,
        uint16 _currentBuild,
        SetupPayload calldata _payload
    ) external returns (bytes memory initData, PreparedDependency memory preparedDependency);

    /// @notice The ABI required to decode the `bytes` data in `prepareUninstallation()`.
    /// @return The ABI in string format.
    function prepareUninstallationDataABI() external view returns (string memory);

    /// @notice Prepares the uninstallation of a plugin.
    /// @param _dao The address of the uninstalling DAO.
    /// @param _payload TOD:GIORGI how to add explanation ? 
    /// @return permissions The array of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the uninstalling DAO.
    function prepareUninstallation(address _dao, SetupPayload calldata _payload)
        external
        returns (PermissionLib.ItemMultiTarget[] memory permissions);

    /// @notice Returns the plugin's base implementation.
    /// @return address The address of the plugin implementation contract.
    /// @dev The implementation can be instantiated via the `new` keyword, cloned via the minimal clones pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)), or proxied via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    function getImplementationAddress() external view returns (address);
}
