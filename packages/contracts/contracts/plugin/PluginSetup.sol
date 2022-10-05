// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {BulkPermissionsLib as Permission} from "../core/permission/BulkPermissionsLib.sol";

import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";

/// NOTE: This is an untested code and should NOT be used in production.
/// @notice Abstract Plugin Manager that dev's have to inherit from for their plugin setup contracts.
abstract contract PluginSetup {
    bytes4 public constant PLUGIN_MANAGER_INTERFACE_ID = type(PluginSetup).interfaceId;

    /// @notice the ABI in string format that `prepareInstallation()`'s `_data` param needs to use.
    /// @return ABI in string format.
    function prepareInstallDataABI() external view virtual returns (string memory);

    function prepareInstallation(address _dao, bytes memory _data)
        external
        virtual
        returns (
            address plugin,
            address[] memory helpers,
            Permission.ItemMultiTarget[] memory permissions
        );

    /// @notice The ABI in string format that `prepareUpdateDataABI()`'s `_data` needs to use.
    /// @dev Not required to be overriden as there might be no update at all by dev.
    /// @return ABI in string format.
    function prepareUpdateDataABI() external view virtual returns (string memory) {}

    function prepareUpdate(
        address _dao,
        address _plugin,
        address[] memory _helpers,
        uint16[3] calldata _oldVersion,
        bytes memory _data
    )
        external
        virtual
        returns (
            address[] memory activeHelpers,
            bytes memory initData,
            Permission.ItemMultiTarget[] memory permissions
        )
    {}

    /// @notice The ABI in string format that `prepareUninstallation()`'s `_data` needs to use.
    /// @return ABI in string format.
    function prepareUninstallDataABI() external view virtual returns (string memory);

    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata _activeHelpers,
        bytes calldata _data
    ) external virtual returns (Permission.ItemMultiTarget[] memory permissions);

    function createERC1967Proxy(
        address _dao,
        address _logic,
        bytes memory _data
    ) internal returns (address payable addr) {
        return payable(address(new PluginERC1967Proxy(_dao, _logic, _data)));
    }

    /// @notice the plugin's base implementation address proxies need to delegate calls.
    /// @return address of the base contract address.
    function getImplementationAddress() external view virtual returns (address);
}
