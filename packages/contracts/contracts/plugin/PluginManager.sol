// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";
import {BulkPermissionsLib as Permission} from "../core/permission/BulkPermissionsLib.sol";
import {bytecodeAt} from "../utils/Contract.sol";
import {PluginERC1967Proxy} from "../utils/PluginERC1967Proxy.sol";
import {TransparentProxy} from "../utils/TransparentProxy.sol";
import {PluginUUPSUpgradeable} from "../core/plugin/PluginUUPSUpgradeable.sol";
import {PluginClones} from "../core/plugin/PluginClones.sol";
import {Plugin} from "../core/plugin/Plugin.sol";
import {PluginTransparentUpgradeable} from "../core/plugin/PluginTransparentUpgradeable.sol";

library PluginManagerLib {
    using ERC165Checker for address;

    enum DeployType {
        None,
        Clones,
        UUPS,
        Transparent,
        withNew
    }

    struct Deployment {
        // gets returned by the dev and describes what function should be called after deployment.
        bytes initData;
        // Aragon's custom init data which describes what function should be called after initData is called.
        bytes additionalInitData;
        // (bytecode + constructor arguments)
        bytes initCode;
    }

    struct Data {
        address dao;
        address installer;
        bytes32 salt;
        bytes params;
        Deployment[] plugins;
        Deployment[] helpers;
        Permission.ItemMultiTarget[] permissions;
    }

    function init(
        address dao,
        address installer,
        bytes32 salt,
        bytes memory params
    ) internal pure returns (Data memory data) {
        data.dao = dao;
        data.installer = installer;
        data.salt = salt;
        data.params = params;
    }

    /// Used as an advanced way - if developer wants the plugin to be out of our interfaces.
    function addPlugin(
        Data memory self,
        bytes memory initCode,
        bytes memory initData
    ) internal view returns (address deploymentAddress) {
        Deployment memory newDeployment = Deployment(initData, bytes(""), initCode);
        (self.plugins, deploymentAddress) = _addDeploy(
            self.salt,
            self.installer,
            self.plugins,
            newDeployment
        );
    }

    /// Normal/Recommended way - if developer wants the plugin to be one of our interface.
    /// In case dev wants to deploy his plugin with `new` keyword:
    ///     * implementation must be zero
    ///     * initData should contain bytecode + constructor arguments as encoded.
    ///     * dev can directly opt in to use advanced `addPlugin` above for this case as well. Though,
    ///     if so, and dev also wants to call some initialization function right away, it won't be possible.
    /// In case dev wants to deploy with our uups, transparent, clone that also use aragon's permissions
    ///     * implementation must be a base address
    ///     * initData should contain function selector + encoded arguments.
    function addPlugin(
        Data memory self,
        address implementation,
        bytes memory initData
    ) internal view returns (address deploymentAddress) {
        if (implementation == address(0)) {
            revert("TODO: ADD MESSAGE");
        }

        (bytes memory initCode, bytes memory additionalInitData) = calculateInitCode(
            self,
            implementation,
            initData
        );

        Deployment memory newDeployment = Deployment(initData, additionalInitData, initCode);
        (self.plugins, deploymentAddress) = _addDeploy(
            self.salt,
            self.installer,
            self.plugins,
            newDeployment
        );
    }

    /// Used as an advanced way - if developer wants the plugin to be out of our interfaces.
    function addHelper(
        Data memory self,
        bytes memory initCode,
        bytes memory initData
    ) internal view returns (address deploymentAddress) {
        Deployment memory newDeployment = Deployment(initData, bytes(""), initCode);
        (self.helpers, deploymentAddress) = _addDeploy(
            self.salt,
            self.installer,
            self.helpers,
            newDeployment
        );
    }

    /// Normal/Recommended way - if developer wants the helper to be one of our interface.
    function addHelper(
        Data memory self,
        address implementation,
        bytes memory initData
    ) internal view returns (address deploymentAddress) {
        if (implementation == address(0)) {
            revert("TODO: ADD MESSAGE");
        }
        (bytes memory initCode, bytes memory additionalInitData) = calculateInitCode(
            self,
            implementation,
            initData
        );

        Deployment memory newDeployment = Deployment(initData, additionalInitData, initCode);
        (self.helpers, deploymentAddress) = _addDeploy(
            self.salt,
            self.installer,
            self.helpers,
            newDeployment
        );
    }

    function _addDeploy(
        bytes32 salt,
        address installer,
        Deployment[] memory currentDeployments,
        Deployment memory newDeployment
    ) internal pure returns (Deployment[] memory newDeployments, address deploymentAddress) {
        newDeployments = new Deployment[](currentDeployments.length + 1);

        // TODO: more efficient copy
        for (uint256 i = 0; i < currentDeployments.length; i++) {
            newDeployments[i] = currentDeployments[i];
        }

        if (currentDeployments.length > 0)
            newDeployments[currentDeployments.length - 1] = newDeployment;
        else newDeployments[0] = newDeployment;

        deploymentAddress = Create2.computeAddress(
            salt,
            keccak256(newDeployment.initCode),
            installer
        );
    }

    function calculateInitCode(
        Data memory self,
        address implementation,
        bytes memory initData
    ) internal view returns (bytes memory initCode, bytes memory additionalInitData) {
        if (implementation.supportsInterface(type(PluginUUPSUpgradeable).interfaceId)) {
            bytes memory bytecodeWithArgs = abi.encodePacked(
                type(PluginERC1967Proxy).creationCode,
                abi.encode(self.dao, implementation, initData)
            );

            initCode = bytecodeWithArgs;
        } else if (implementation.supportsInterface(type(PluginClones).interfaceId)) {
            initCode = bytecodeAt(implementation);

            additionalInitData = abi.encodeWithSelector(
                bytes4(keccak256("clonesInit(address)")),
                self.dao
            );
        } else if (
            implementation.supportsInterface(type(PluginTransparentUpgradeable).interfaceId)
        ) {
            bytes memory bytecodeWithArgs = abi.encodePacked(
                type(TransparentProxy).creationCode,
                abi.encode(self.dao, implementation, self.installer, initData)
            );
            initCode = bytecodeWithArgs;
        }
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

        if (self.permissions.length > 0) newPermissions[newPermissions.length - 1] = newPermission;
        else newPermissions[0] = newPermission;

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
