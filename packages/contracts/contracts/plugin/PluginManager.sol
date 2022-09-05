// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Create2.sol";

import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";
import {BulkPermissionsLib as Permission} from "../core/permission/BulkPermissionsLib.sol";
import {bytecodeAt} from "../utils/Contract.sol";

library PluginManagerLib {
    enum DeployType {
        None,
        Clones,
        UUPS,
        Transparent,
        withNew
    }

    struct Deployment {
        address implementation;
        DeployType deployType;
        bytes initData;
    }

    struct Data {
        address dao;
        address installer;
        bytes32 nonce;
        bytes params;
        Deployment[] plugins;
        Deployment[] helpers;
        Permission.ItemMultiTarget[] permissions;
    }

    function init(
        address dao,
        address installer,
        bytes32 nonce,
        bytes memory params
    ) internal pure returns (Data memory data) {
        data.dao = dao;
        data.installer = installer;
        data.nonce = nonce;
        data.params = params;
    }

    function addPlugin(
        Data memory self,
        address implementation,
        bytes memory initData
    ) internal view returns (address deploymentAddress) {
        Deployment memory newDeployment = Deployment(implementation, DeployType.None, initData);
        (self.plugins, deploymentAddress) = _addDeploy(
            self.nonce,
            implementation,
            self.installer,
            self.plugins,
            newDeployment
        );
    }

    function addPlugin(
        Data memory self,
        address implementation,
        bytes memory initData,
        DeployType deployType
    ) internal view returns (address deploymentAddress) {
        Deployment memory newDeployment = Deployment(implementation, deployType, initData);
        (self.plugins, deploymentAddress) = _addDeploy(
            self.nonce,
            implementation,
            self.installer,
            self.plugins,
            newDeployment
        );
    }

    function addHelper(
        Data memory self,
        address implementation,
        bytes memory initData
    ) internal view returns (address deploymentAddress) {
        Deployment memory newDeployment = Deployment(implementation, DeployType.None, initData);
        (self.helpers, deploymentAddress) = _addDeploy(
            self.nonce,
            implementation,
            self.installer,
            self.helpers,
            newDeployment
        );
    }

    function addHelper(
        Data memory self,
        address implementation,
        bytes memory initData,
        DeployType deployType
    ) internal view returns (address deploymentAddress) {
        Deployment memory newDeployment = Deployment(implementation, deployType, initData);
        (self.helpers, deploymentAddress) = _addDeploy(
            self.nonce,
            implementation,
            self.installer,
            self.helpers,
            newDeployment
        );
    }

    function _addDeploy(
        bytes32 nonce,
        address implementation,
        address installer,
        Deployment[] memory currentDeployments,
        Deployment memory newDeployment
    ) internal view returns (Deployment[] memory newDeployments, address deploymentAddress) {
        newDeployments = new Deployment[](currentDeployments.length + 1);

        // TODO: more efficient copy
        for (uint256 i = 0; i < currentDeployments.length; i++) {
            newDeployments[i] = currentDeployments[i];
        }
        newDeployments[currentDeployments.length] = newDeployment;

        deploymentAddress = Create2.computeAddress(
            nonce,
            keccak256(bytecodeAt(implementation)),
            installer
        );
    }

    function addPermission(
        Data memory self,
        Permission.Operation op,
        address where,
        address who,
        address oracle,
        bytes32 permissionId
    ) internal view {
        Permission.ItemMultiTarget memory newPermission = Permission.ItemMultiTarget(
            op,
            where,
            who,
            oracle,
            permissionId
        );
        Permission.ItemMultiTarget[] memory newPermissions = new Permission.ItemMultiTarget[](
            self.permissions.length + 1
        );

        // TODO: more efficient copy
        for (uint256 i = 0; i < self.permissions.length; i++) {
            newPermissions[i] = self.permissions[i];
        }
        newPermissions[newPermissions.length] = newPermission;
        self.permissions = newPermissions;
    }
}

/// NOTE: This is an untested code and should NOT be used in production.
/// @notice Abstract Plugin Factory that dev's have to inherit from for their factories.
abstract contract PluginManager {
    bytes4 public constant PLUGIN_MANAGER_INTERFACE_ID = type(PluginManager).interfaceId;

    function getInstallInstruction(
        address dao,
        bytes32 salt,
        bytes memory params
    ) public view returns (PluginManagerLib.Data memory) {
        PluginManagerLib.Data memory installation = PluginManagerLib.init(
            dao,
            msg.sender, // TODO: can we always assume this will be the installer a.k.a deployer ?
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
        bytes memory params
    ) public view returns (PluginManagerLib.Data memory, bytes memory) {
        PluginManagerLib.Data memory update = PluginManagerLib.init(
            dao,
            msg.sender, // TODO: can we always assume this will be the installer a.k.a deployer ?
            salt,
            params
        );
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
