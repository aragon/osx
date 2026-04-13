// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Script, console2} from "forge-std/Script.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";

/// @notice Produces the calldata for a DAO governance action that creates a subdomain node
/// and assigns the registrar as its owner.
/// @dev The entity controlling the parent domain must execute this. On mainnet, this is the
/// Management DAO (controller of `dao.eth`). On testnets, a deployer account can call directly.
contract SetupMembersDomain is Script {
    function run(
        address ens,
        bytes32 parentNode,
        string calldata label,
        address registrar,
        address resolver
    ) external view {
        bytes32 labelHash = keccak256(bytes(label));

        // This is the calldata the DAO must execute
        bytes memory callData = abi.encodeCall(
            ENS.setSubnodeRecord,
            (parentNode, labelHash, registrar, resolver, 0)
        );

        console2.log("--- Governance action calldata ---");
        console2.log("target (ENS registry):", ens);
        console2.log("parentNode:", vm.toString(parentNode));
        console2.log("label:", label);
        console2.log("labelHash:", vm.toString(labelHash));
        console2.log("owner (registrar):", registrar);
        console2.log("resolver:", resolver);
        console2.log("");
        console2.log("calldata:");
        console2.logBytes(callData);
    }
}
