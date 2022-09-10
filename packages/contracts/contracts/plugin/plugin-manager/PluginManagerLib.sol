// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {BulkPermissionsLib as Permission} from "../../core/permission/BulkPermissionsLib.sol";
import {PluginERC1967Proxy} from "../../utils/PluginERC1967Proxy.sol";
import {TransparentProxy} from "../../utils/TransparentProxy.sol";
import {PluginUUPSUpgradeable} from "../../core/plugin/PluginUUPSUpgradeable.sol";
import {PluginClones} from "../../core/plugin/PluginClones.sol";
import {Plugin} from "../../core/plugin/Plugin.sol";
import {PluginTransparentUpgradeable} from "../../core/plugin/PluginTransparentUpgradeable.sol";

library PluginManagerLib {
    using ERC165Checker for address;

    struct Deployment {
        // gets returned by the dev and describes what function should be called after deployment.
        bytes initData;
        // Aragon's custom init data which describes what function should be called after initData is called.
        bytes additionalInitData;
        // bytecode of the contract that should be deployed.
        bytes bytecode;
        // Constructor Args that will be encoded with bytecode for the create2
        bytes constructorArgs;
        // Final initCode (abi.encode(bytecode, constructorArgs))
        bytes initCode;
    }

    struct Data {
        address dao;
        address installer;
        bytes32 salt;
        bytes params;
        Deployment plugin;
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
    function addPlugin(Data memory self, bytes memory initCode, bytes memory initData) internal pure returns (address deploymentAddress) {
        bytes memory initCode = abi.encode(bytecode, constructorArgs);
        self.plugin = Deployment(initData, bytes(""), bytecode, constructorArgs, initCode);
        deploymentAddress = Create2.computeAddress(self.salt, keccak256(initCode), self.installer);
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

        (
            bytes memory bytecode,
            bytes memory constructorArgs,
            bytes memory additionalInitData
        ) = calculateInitCode(self, implementation, initData);

        bytes memory initCode = abi.encode(bytecode, constructorArgs);

        self.plugin = Deployment(initData, additionalInitData, bytecode, constructorArgs, initCode);
        deploymentAddress = Create2.computeAddress(self.salt, keccak256(initCode), self.installer);
    }

    /// Used as an advanced way - if developer wants the plugin to be out of our interfaces.
    function addHelper(
        Data memory self,
        bytes memory bytecode,
        bytes memory constructorArgs,
        bytes memory initData
    ) internal pure returns (address deploymentAddress) {
        bytes memory initCode = abi.encode(bytecode, constructorArgs);
        (self.helpers, deploymentAddress) = _addDeploy(
            self.salt,
            self.installer,
            self.helpers,
            Deployment(initData, bytes(""), bytecode, constructorArgs, initCode)
        );
        deploymentAddress = Create2.computeAddress(self.salt, keccak256(initCode), self.installer);
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

        (
            bytes memory bytecode,
            bytes memory constructorArgs,
            bytes memory additionalInitData
        ) = calculateInitCode(self, implementation, initData);

        bytes memory initCode = abi.encode(bytecode, constructorArgs);

        (self.helpers, deploymentAddress) = _addDeploy(
            self.salt,
            self.installer,
            self.helpers,
            Deployment(initData, additionalInitData, bytecode, constructorArgs, initCode)
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
        bytes memory /* initData */
    )
        internal
        view
        returns (
            bytes memory bytecode,
            bytes memory constructorArgs,
            bytes memory additionalInitData
        )
    {
        if (implementation.supportsInterface(type(PluginUUPSUpgradeable).interfaceId)) {
            bytecode = type(PluginERC1967Proxy).creationCode;
            constructorArgs = abi.encode(self.dao, implementation, bytes(""));
        } else if (implementation.supportsInterface(type(PluginClones).interfaceId)) {
            bytecode = bytecodeAt(implementation);

            additionalInitData = abi.encodeWithSelector(
                bytes4(keccak256("clonesInit(address)")),
                self.dao
            );
        } else if (
            implementation.supportsInterface(type(PluginTransparentUpgradeable).interfaceId)
        ) {
            bytecode = type(TransparentProxy).creationCode;
            constructorArgs = abi.encode(self.dao, implementation, self.installer, bytes(""));
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

    function bytecodeAt(address _addr) internal view returns (bytes memory o_code) {
        assembly {
            // retrieve the size of the code, this needs assembly
            let size := extcodesize(_addr)
            // allocate output byte array - this could also be done without assembly
            // by using o_code = new bytes(size)
            o_code := mload(0x40)
            // new "memory end" including padding
            mstore(0x40, add(o_code, and(add(add(size, 0x20), 0x1f), not(0x1f))))
            // store length in memory
            mstore(o_code, size)
            // actually retrieve the code, this needs assembly
            extcodecopy(_addr, add(o_code, 0x20), 0, size)
        }
    }
}
