// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {BulkPermissionsLib as Permission} from "../core/permission/BulkPermissionsLib.sol";
import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";

/// @title PluginSetup
/// @author Aragon Association - 2022
/// @notice An abstract contract that developers have to inherit from to write the setup of a plugin.
abstract contract PluginSetup {
    bytes4 public constant PLUGIN_MANAGER_INTERFACE_ID = type(PluginSetup).interfaceId;

    /// @notice The ABI required to decode the `bytes` data in `prepareInstallation()`.
    /// @return The ABI in string format.
    function prepareInstallationDataABI() external view virtual returns (string memory);

    /// @notice Prepares the installation of a plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _data The `bytes` encoded data containing the input parameters specified in `prepareInstallationDataABI()`.
    /// @return plugin The address of the `Plugin` contract being prepared for installation.
    /// @return installedHelpers The address array of all helpers (contracts or EOAs) associated with the plugin to be installed.
    /// @return permissions The list of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the installing DAO.
    function prepareInstallation(address _dao, bytes memory _data)
        external
        virtual
        returns (
            address plugin,
            address[] memory installedHelpers,
            Permission.ItemMultiTarget[] memory permissions
        );

    /// @notice The ABI required to decode the `bytes` data in `prepareUpdate()`.
    /// @return The ABI in string format.
    /// @dev The empty implemention is provided here so that this doesn't need to be overriden and implemented. This is relevant, for example, for the initial version of a plugin for which no update exists.
    function prepareUpdateDataABI() external view virtual returns (string memory) {}

    /// @notice Prepares the update of a plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _plugin The address of the `Plugin` contract to update from.
    /// @param _currentHelpers The address array of all current helpers (contracts or EOAs) associated with the plugin to update from.
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which this update is prepared for.
    /// @param _oldVersion The semantic version of the plugin to update from.
    /// @param _data The `bytes` encoded data containing the input parameters specified in `prepareUpdateDataABI()`.
    /// @return updatedHelpers The address array of helpers (contracts or EOAs) associated with the plugin after the update.
    /// @return initData The initialization data to be passed to upgradeable contracts when the update is applied in the `PluginSetupProcessor`.
    /// @return permissions The list of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the updating DAO.
    function prepareUpdate(
        address _dao,
        address _plugin,
        address[] memory _currentHelpers,
        uint16[3] calldata _oldVersion,
        bytes memory _data
    )
        external
        virtual
        returns (
            address[] memory updatedHelpers,
            bytes memory initData,
            Permission.ItemMultiTarget[] memory permissions
        )
    {}

    /// @notice The ABI required to decode the `bytes` data in `prepareUninstallation()`.
    /// @return The ABI in string format.
    function prepareUninstallationDataABI() external view virtual returns (string memory);

    /// @notice Prepares the uninstallation of a plugin.
    /// @param _dao The address of the installing DAO.
    /// @param _plugin The address of the `Plugin` contract to update from.
    /// @param _currentHelpers The address array of all current helpers (contracts or EOAs) associated with the plugin to update from.
    /// @dev The list of `_currentHelpers` has to be specified in the same order as they were returned from previous setups preparation steps (the latest `prepareInstallation` or `prepareUpdate` step that has happend) on which this update is prepared for.
    /// @param _data The `bytes` encoded data containing the input parameters specified in `prepareUninstallationDataABI()`.
    /// @return permissions The list of multi-targeted permission operations to be applied by the `PluginSetupProcessor` to the uninstalling DAO.
    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata _currentHelpers,
        bytes calldata _data
    ) external virtual returns (Permission.ItemMultiTarget[] memory permissions);

    /// @notice A convenience function to create an [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967) proxy contract pointing to an implementation and being associated to a DAO.
    /// @param _dao The address of the installing DAO that is automatically placed in the storage of the plugin.
    /// @param _implementation The address of the implementation contract to which the proxy is pointing to.
    /// @return proxy The address of the created proxy contracts.
    function createERC1967Proxy(
        address _dao,
        address _implementation,
        bytes memory _data
    ) internal returns (address payable proxy) {
        proxy = payable(address(new PluginERC1967Proxy(_dao, _implementation, _data)));
    }

    /// @notice Returns the plugin's base implementation.
    /// @return address The address of the plugin implementation contract.
    /// @dev The implementation can be instantiated via the `new` keyword, cloned via the minimal clones pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)), or proxied via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    function getImplementationAddress() external view virtual returns (address);
}
