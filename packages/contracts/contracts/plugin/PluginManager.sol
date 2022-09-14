// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

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
    using Clones for address;

    enum DeploymentType {
        UUPSUpgradable,
        NOProxy
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
        DeploymentType deploymentType;
        Deployment[] plugins;
        Deployment[] helpers;
        Permission.ItemMultiTarget[] permissions;
    }

    function init(
        address dao,
        address installer,
        bytes32 salt,
        bytes memory params,
        DeploymentType deploymentType
    ) internal pure returns (Data memory data) {
        data.dao = dao;
        data.installer = installer;
        data.salt = salt;
        data.params = params;
        data.deploymentType = deploymentType;
    }

    /**
     *
     * Requirements:
     *  - initCode must be the bytecode + constructor arguments encoded together.
     *      i.  can be used if you want to deploy contract with `new`..
     *      ii. can be used if you want to deploy custom proxy with custom plugin interface
     *      that looks at the implementation. Note that the same thing can't be achieved
     *      with another `addPlugin` because another `addPlugin` only expects implementation
     *      and doesn't know/have any idea what the proxy contract looks like to deploy it.
     *  - initData must be empty or function selector encoded with arguments.
     *
     * Rules:
     *  - if implementation doesn't inherit from PluginClones or PluginUUPSUpgradable, it reverts.
     *  - if deploymentType is UPGRADABLE, it will revert due to the ambiguity that we don't know
     * whether your provided initCode actually follows UUPS interface..
     *
     * Result:
     *  - This can be used to deploy any plugin that is non-upgradable.
     *
     */
    function addPlugin(
        Data memory self,
        bytes memory initCode, 
        bytes memory initData
    ) internal pure returns (address deploymentAddress) {
        Deployment memory newDeployment = Deployment(initData, bytes(""), initCode);

        if (self.deploymentType == DeploymentType.UUPSUpgradable) {
            revert("use another addPlugin function");
        }

        if (initCode.length == 0) {
            revert("bytecode can't be empty..");
        }

        (self.plugins, deploymentAddress) = _addDeploy(
            self.salt,
            self.installer,
            self.plugins,
            newDeployment
        );
    }

    /**
     *
     * Requirements:
     *  - implementation can't be zero
     *  - implementation must be inheritting from aragon's interface(plugin clone or plugin upps upgradable)
     *  - initData must be empty or function selector encoded with arguments
     *
     * Rules:
     *  - if implementation doesn't inherit from PluginClones or PluginUUPSUpgradable, it reverts.
     *  - if deploymentType is UPGRADABLE, implementation MUST inherit from PluginUUPSUpgradable, or it reverts.
     *
     * Result:
     *  - This will return either Minimal Proxy or PluginUUPSUpgradable bytecode
     *
     *
     * Thoughts:
     *  - In case you want to deploy the plugin that doesn't inherit from PluginClones or PluginUUPSUpgradable,
     * you must use advanced addPlugin which is a shadowed one and expects slightly different arguments.
     */
    function addPlugin(
        Data memory self,
        address implementation,
        bytes memory initData
    ) internal view returns (address deploymentAddress) {
        if (implementation == address(0)) {
            revert("BLBLA");
        }

        (bytes memory initCode, bytes memory additionalInitData) = calculateInitCode(
            self,
            implementation,
            initData
        );

        if (initCode.length == 0) {
            revert("Wrong");
        }

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
    ) internal pure returns (address deploymentAddress) {
        if (initCode.length == 0) {
            revert("bytecode can't be empty..");
        }

        // if initCode is provided, how do we restrict that it only deploys with new ? 
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

    // 1. helper can be our interface or just something else
    // 2. plugin can be our interface or just something else
    //    i.  if deploymentType is Upgradable and pluginbase is our pluginuups, deploy it with our custom PluginERC1967 proxy.
    //.   ii. if deploymentType is Upgradable and pluginbase is something else, revert as it should be inheriting from our own.
    //.   iii. if deploymentType is non upgradable, it might be desireable to deploy it with clones or new
    //.       check if it inherits from plugin clones, if yes, deploy, if not,
    //. if it's something else

    // 3. we add a feature that user now can pass deploymentType which says whether
    // he wants the plugin to be upgradable or not(only works if dev specified that it supports upgradability in his/her manager)
    // 4. if end user wants his plugin to be upgradaable, does it mean helpers should always be upgradable as well or dev
    // can decide what to do with helpers ?
    function calculateInitCode(
        Data memory self,
        address implementation,
        bytes memory /* initData */
    ) internal view returns (bytes memory, bytes memory) {
        bytes memory initCode;
        bytes memory additionalInitData;

        // if plugin must be upgradable, decide whether
        // to deploy it with our custom proxy or OZ.
        if (self.deploymentType == DeploymentType.UUPSUpgradable) {
            // extra check...
            bool isPluginUUPS = implementation.supportsInterface(
                type(PluginUUPSUpgradeable).interfaceId
            );

            if (!isPluginUUPS) {
                revert("non-compliant interface");
            }

            // TODO: If isPluginUUPS is false, we can still go ahead
            // and deploy with OZ's original ERC1967Proxy, but we have no way of
            // knowing if implementation actually inherits from OZ's UUPSUpgradable and upgradeToAndCall
            // might not exist... Thoughts ?
            bytes memory creationCode = type(PluginERC1967Proxy).creationCode;
            bytes memory constructorArgs = abi.encode(self.dao, implementation, bytes(""));
            initCode = abi.encodePacked(creationCode, constructorArgs);
    
            return (initCode, additionalInitData);
        }

        // Plugin is non-upgradable.

        // If it's our PluginClones
        bool isPluginClone = implementation.supportsInterface(type(PluginClones).interfaceId);

        if (isPluginClone) {
            initCode = getClonesBytecode(implementation);
            additionalInitData = abi.encodeWithSelector(
                bytes4(keccak256("clonesInit(address)")),
                self.dao
            );

            return (initCode, additionalInitData);
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

    function getClonesBytecode(address impl) internal view returns (bytes memory b) {
        assembly {
            b := mload(0x40)
            mstore(0x40, add(b, 0x80))
            mstore(b, 0x37)

            mstore(add(b, 0x20), 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(b, 0x34), shl(0x60, impl))
            mstore(add(b, 0x48), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
        }
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
        bytes memory params,
        PluginManagerLib.DeploymentType DeploymentType
    ) public view returns (PluginManagerLib.Data memory) {
        PluginManagerLib.Data memory installation = PluginManagerLib.init(
            dao,
            deployer,
            salt,
            params,
            DeploymentType
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

    function DeploymentTypes()
        public
        view
        virtual
        returns (PluginManagerLib.DeploymentTypes[] memory);

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
