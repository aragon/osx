// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

contract Helper is Script {
    function _getENSRegistry(
        string memory _network
    ) internal returns (address ensRegistry, address ensResolver) {
        string[] memory inputs = _baseScriptInputs(_network);

        // get ens registry
        inputs[3] = "getEnsRegistry";
        bytes memory res = vm.ffi(inputs);
        ensRegistry = address(bytes20(res));

        // get ens resolver
        inputs[3] = "getEnsResolver";
        res = vm.ffi(inputs);
        ensResolver = address(bytes20(res));
    }

    function _getDomains(
        string memory _network
    ) internal returns (string memory daoDomain, string memory pluginDomain) {
        string[] memory inputs = _baseScriptInputs(_network);

        // get dao domain
        inputs[3] = "getDaoDomain";
        bytes memory res = vm.ffi(inputs);
        daoDomain = string(res);

        // get plugin domain
        inputs[3] = "getPluginDomain";
        res = vm.ffi(inputs);

        pluginDomain = string(res);
    }

    function _getDomainHashes(
        string memory _daoDomain,
        string memory _pluginDomain
    ) internal returns (bytes32 daoDomainHash, bytes32 pluginDomainHash) {
        // dao domain hash
        string[] memory inputs = _baseScriptInputs(_daoDomain);
        inputs[3] = "getDomainHash";
        bytes memory res = vm.ffi(inputs);
        daoDomainHash = bytes32(res);

        // plugin domain hash
        inputs[3] = "getDomainHash";
        inputs[4] = _pluginDomain;
        res = vm.ffi(inputs);
        pluginDomainHash = bytes32(res);
    }

    function _getDomainHash(string memory domain) internal returns (bytes32 domainHash) {
        // dao domain hash
        string[] memory inputs = _baseScriptInputs(domain);
        inputs[3] = "getDomainHash";
        bytes memory res = vm.ffi(inputs);
        domainHash = bytes32(res);
    }

    function _getDomainNameReversedAndSubdomains(
        string memory _domain
    ) internal returns (string[] memory domainNamesReversed, string[] memory domainSubdomains) {
        string[] memory inputs = _baseScriptInputs(_domain);
        inputs[3] = "getDomainNameReversed";
        bytes memory res = vm.ffi(inputs);
        (domainNamesReversed, domainSubdomains) = abi.decode(res, (string[], string[]));
    }

    function _uploadToIPFS() internal returns (string memory ipfsCid) {
        string[] memory inputs = new string[](5);
        inputs[0] = "npx";
        inputs[1] = "ts-node";
        inputs[2] = "scripts/upload-to-pinnata.ts";
        bytes memory res = vm.ffi(inputs);
        ipfsCid = string(res);
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
}
