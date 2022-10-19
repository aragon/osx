// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PermissionLib} from "../core/permission/PermissionLib.sol";

interface IPluginSetup {
    /// @notice The ABI required to decode the `bytes` data in `prepareInstallation()`.
    /// @return The ABI in string format.
    function prepareInstallationDataABI() external view returns (string memory);

    /// @notice Prepares the installation of a plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _data The `bytes` encoded data containing the input parameters for the installation as specified in the `prepareInstallationDataABI()` function.
    /// @return plugin The address of the `Plugin` contract being prepared for installation.
    /// @return helpers The address array of all helpers (contracts or EOAs) associated with the plugin after the installation.
    /// @return permissions The array of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the installing DAO.
    function prepareInstallation(address _dao, bytes memory _data)
        external
    
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.ItemMultiTarget[] memory permissions
        );

    /// @notice The ABI required to decode the `bytes` data in `prepareUpdate()`.
    /// @return The ABI in string format.
    /// @dev The empty implemention is provided here so that this doesn't need to be overriden and implemented. This is relevant, for example, for the initial version of a plugin for which no update exists.
    function prepareUpdateDataABI() external view returns (string memory);

    /// @notice Prepares the update of a plugin.
    /// @param _dao The address of the updating DAO.
    /// @param _plugin The address of the `Plugin` contract to update from.
    /// @param _currentHelpers The address array of all current helpers (contracts or EOAs) associated with the plugin to update from.
    /// @param _oldVersion The semantic version of the plugin to update from.
    /// @param _data The `bytes` encoded data containing the input parameters for the update as specified in the `prepareUpdateDataABI()` function.
    /// @return updatedHelpers The address array of helpers (contracts or EOAs) associated with the plugin after the update.
    /// @return initData The initialization data to be passed to upgradeable contracts when the update is applied in the `PluginSetupProcessor`.
    /// @return permissions The array of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the updating DAO.
    /// @dev The array of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which this update is prepared for.
    function prepareUpdate(
        address _dao,
        address _plugin,
        address[] memory _currentHelpers,
        uint16[3] calldata _oldVersion,
        bytes memory _data
    )
        external
    
        returns (
            address[] memory updatedHelpers,
            bytes memory initData,
            PermissionLib.ItemMultiTarget[] memory permissions
        );

    /// @notice The ABI required to decode the `bytes` data in `prepareUninstallation()`.
    /// @return The ABI in string format.
    function prepareUninstallationDataABI() external view returns (string memory);

    /// @notice Prepares the uninstallation of a plugin.
    /// @param _dao The address of the uninstalling DAO.
    /// @param _plugin The address of the `Plugin` contract to update from.
    /// @param _currentHelpers The address array of all current helpers (contracts or EOAs) associated with the plugin to update from.
    /// @param _data The `bytes` encoded data containing the input parameters for the uninstalltion as specified in the `prepareUninstallationDataABI()` function.
    /// @return permissions The array of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the uninstalling DAO.
    /// @dev The array of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which this update is prepared for.
    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata _currentHelpers,
        bytes calldata _data
    ) external returns (PermissionLib.ItemMultiTarget[] memory permissions);

    /// @notice Returns the plugin's base implementation.
    /// @return address The address of the plugin implementation contract.
    /// @dev The implementation can be instantiated via the `new` keyword, cloned via the minimal clones pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)), or proxied via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    function getImplementationAddress() external view returns (address);
}
