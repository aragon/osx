// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {BulkPermissionsLib as Permission} from "../core/permission/BulkPermissionsLib.sol";

import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";

/// NOTE: This is an untested code and should NOT be used in production.
/// @notice Abstract Plugin Manager that dev's have to inherit from for their managers.
abstract contract PluginSetup {
    bytes4 public constant PLUGIN_MANAGER_INTERFACE_ID = type(PluginSetup).interfaceId;

    function prepareInstallation(address dao, bytes memory data)
        external
        virtual
        returns (
            address plugin,
            address[] memory helpers, // TODO: perhaps relatedAddresses could be a better naming
            Permission.ItemMultiTarget[] memory permissions
        );

    function prepareUpdate(
        address dao,
        address plugin, // proxy
        address[] memory helpers,
        bytes memory data,
        uint16[3] calldata oldVersion // TODO: check if it can be done with oldPluginSetup
    )
        external
        virtual
        returns (
            address[] memory activeHelpers,
            bytes memory initData,
            Permission.ItemMultiTarget[] memory permissions
        )
    {}

    // TODO: should we have  `_data` param? in case dev need to do somthing else depending on the data?
    function prepareUninstallation(
        address dao,
        address plugin,
        address[] calldata activeHelpers
    ) external virtual returns (Permission.ItemMultiTarget[] memory permissions) {}

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

    // TODO: perhaps find a better name for "*ABI" naming, or "*Abi"

    /// @notice the ABI in string format that prepareInstallation function needs to use.
    /// @return ABI in string format.
    function prepareInstallABI() external view virtual returns (string memory);

    /// @notice The ABI in string format that update function needs to use.
    /// @dev Not required to be overriden as there might be no update at all by dev.
    /// @return ABI in string format.
    function prepapreUpdateABI() external view virtual returns (string memory) {}

    // TODO: if uninstall have data ? should we also have: prepareUninstallABI() ?
}
