// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {Vm} from "forge-std/Vm.sol";
import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {DeployFrameworkFactory} from "../src/DeploymentFrameworkFactory.sol";

contract Helper is Script {
    function _getENSRegistry(
        string memory _network
    ) internal returns (address ensRegistry, address ensResolver) {
        string[] memory inputs = _baseScriptInputs(_network);

        // get ens registry
        inputs[3] = "getEnsRegistry";
        bytes memory res = _executeScriptAndHandleError(inputs);
        ensRegistry = address(bytes20(res));

        // get ens resolver
        inputs[3] = "getEnsResolver";
        res = _executeScriptAndHandleError(inputs);
        ensResolver = address(bytes20(res));
    }

    function _getDomains(
        string memory _network
    ) internal returns (string memory daoDomain, string memory pluginDomain) {
        string[] memory inputs = _baseScriptInputs(_network);

        // get dao domain
        inputs[3] = "getDaoDomain";
        bytes memory res = _executeScriptAndHandleError(inputs);
        daoDomain = string(res);

        // get plugin domain
        inputs[3] = "getPluginDomain";
        res = _executeScriptAndHandleError(inputs);

        pluginDomain = string(res);
    }

    function _getDomainHash(string memory domain) internal returns (bytes32 domainHash) {
        // domain hash
        string[] memory inputs = _baseScriptInputs(domain);
        inputs[3] = "getDomainHash";
        bytes memory res = _executeScriptAndHandleError(inputs);
        domainHash = bytes32(res);
    }

    function _getLabelHash(string memory label) internal returns (bytes32 labelHash) {
        string[] memory inputs = _baseScriptInputs(label);
        inputs[3] = "getLabelHash";
        bytes memory res = _executeScriptAndHandleError(inputs);
        labelHash = bytes32(res);
    }

    function _getDomainNameReversedAndSubdomains(
        string memory _domain
    ) internal returns (string[] memory domainNamesReversed, string[] memory domainSubdomains) {
        string[] memory inputs = _baseScriptInputs(_domain);
        inputs[3] = "getDomainNameReversed";
        bytes memory res = _executeScriptAndHandleError(inputs);
        (domainNamesReversed, domainSubdomains) = abi.decode(res, (string[], string[]));
    }

    function _uploadToIPFS() internal returns (bytes memory ipfsCid) {
        string[] memory inputs = new string[](5);
        inputs[0] = "npx";
        inputs[1] = "ts-node";
        inputs[2] = "scripts/upload-to-pinnata.ts";

        return _executeScriptAndHandleError(inputs);
    }

    function _storeDeploymentJSON(
        uint256 _chainId,
        address[] memory _addresses
    ) internal returns (bytes memory) {
        string[] memory inputs = new string[](6);
        inputs[0] = "npx";
        inputs[1] = "ts-node";
        inputs[2] = "scripts/store-deployments.ts";
        inputs[3] = vm.toString(_chainId);
        inputs[4] = vm.toString(abi.encode(_addresses));

        _executeScriptAndHandleError(inputs);
    }

    function _getDaoPermissions() internal pure returns (bytes32[] memory permissions) {
        permissions = new bytes32[](6);
        permissions[0] = keccak256("ROOT_PERMISSION");
        permissions[1] = keccak256("UPGRADE_DAO_PERMISSION");
        permissions[2] = keccak256("SET_SIGNATURE_VALIDATOR_PERMISSION");
        permissions[3] = keccak256("SET_TRUSTED_FORWARDER_PERMISSION");
        permissions[4] = keccak256("SET_METADATA_PERMISSION");
        permissions[5] = keccak256("REGISTER_STANDARD_CALLBACK_PERMISSION");
        return permissions;
    }

    function _getFrameworkPermissions() internal pure returns (bytes32[] memory permissions) {
        permissions = new bytes32[](6);
        permissions[0] = keccak256("REGISTER_ENS_SUBDOMAIN_PERMISSION");
        permissions[1] = keccak256("UPGRADE_REGISTRAR_PERMISSION");
        permissions[2] = keccak256("UPGRADE_REGISTRY_PERMISSION");
        permissions[3] = keccak256("REGISTER_DAO_PERMISSION");
        permissions[4] = keccak256("REGISTER_PLUGIN_REPO_PERMISSION");
        permissions[5] = keccak256("EXECUTE_PERMISSION");
        return permissions;
    }

    // Helper
    // base script without the operation
    function _baseScriptInputs(
        string memory _networkName
    ) internal pure returns (string[] memory inputs) {
        inputs = new string[](5);
        inputs[0] = "npx";
        inputs[1] = "ts-node";
        inputs[2] = "scripts/getter.ts";
        // inputs[3] =  fill this with the operation
        inputs[4] = _networkName;
    }

    function _executeScriptAndHandleError(
        string[] memory inputs
    ) internal returns (bytes memory output) {
        Vm.FfiResult memory res = vm.tryFfi(inputs);

        if (res.exitCode != 0) {
            revert(string(res.stderr));
        }

        return res.stdout;
    }
}
