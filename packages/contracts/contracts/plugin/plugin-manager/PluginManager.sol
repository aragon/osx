// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {PluginERC1967Proxy} from "../../utils/PluginERC1967Proxy.sol";
import {BulkPermissionsLib as Permission} from "../../core/permission/BulkPermissionsLib.sol";
import {bytecodeAt} from "../../utils/Contract.sol";
import { PluginManagerLib } from './PluginManagerLib.sol';

/// NOTE: This is an untested code and should NOT be used in production.
/// @notice Abstract Plugin Factory that dev's have to inherit from for their factories.
abstract contract PluginManager {
    bytes4 public constant PLUGIN_MANAGER_INTERFACE_ID = type(PluginManager).interfaceId;

    function getInstallInstruction(
        address dao,
        bytes32 salt,
        address deployer,
        bytes memory params
    ) public view returns (PluginManagerLib.Data memory) {
        PluginManagerLib.Data memory installation = PluginManagerLib.init(
            dao,
            deployer,
            salt,
            params
        );
        return _getInstallInstruction(installation);
    }

    function _getInstallInstruction(PluginManagerLib.Data memory installation)
        internal
        view
        virtual
        returns (PluginManagerLib.Data memory);

    function getUpdateInstruction(
        uint16[3] calldata oldVersion,
        address dao,
        address proxy,
        bytes32 salt,
        address deployer,
        bytes memory params
    ) public view returns (PluginManagerLib.Data memory, bytes memory) {
        PluginManagerLib.Data memory update = PluginManagerLib.init(dao, deployer, salt, params);
        return _getUpdateInstruction(proxy, oldVersion, update);
    }

    function _getUpdateInstruction(
        address proxy,
        uint16[3] calldata oldVersion,
        PluginManagerLib.Data memory installation
    ) internal view virtual returns (PluginManagerLib.Data memory, bytes memory) {}

    /// @notice the plugin's base implementation address proxies need to delegate calls.
    /// @return address of the base contract address.
    function getImplementationAddress() public view virtual returns (address);

    /// @notice the ABI in string format that deploy function needs to use.
    /// @return ABI in string format.
    function deployABI() external view virtual returns (string memory);

    /// @notice The ABI in string format that update function needs to use.
    /// @dev Not required to be overriden as there might be no update at all by dev.
    /// @return ABI in string format.
    function updateABI() external view virtual returns (string memory) {}
}
