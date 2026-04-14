// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {MemberRegistry} from "../src/MemberRegistry.sol";
import {ENSUtils} from "./lib/ENSUtils.sol";

/// @notice Deploys MemberRegistry behind a UUPS proxy and prints the required governance
/// actions (permission grant + ENS node transfer).
contract DeployMemberRegistry is Script {
    using stdJson for string;

    MemberRegistry registryImpl;
    MemberRegistry registry;

    string parentDomain;
    address dao;
    address ens;
    bytes32 node;
    address resolver;

    modifier broadcast() {
        uint256 privKey = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(privKey);

        console.log("MemberRegistry deployment");
        console.log("- Deployer:", vm.addr(privKey));
        console.log("- Chain ID:", block.chainid);
        console.log();

        _;

        vm.stopBroadcast();
    }

    function run() public broadcast {
        dao = vm.envAddress("MANAGEMENT_DAO");
        ens = vm.envAddress("ENS_REGISTRY");
        parentDomain = vm.envOr("PARENT_DOMAIN", string("members.dao.eth"));
        node = ENSUtils.namehash(parentDomain);
        resolver = vm.envAddress("RESOLVER");

        console.log("- Parent domain:", parentDomain);
        console.log("- Node:         ", vm.toString(node), string.concat('(namehash("', parentDomain, '"))'));
        console.log();

        // Deploy implementation + proxy
        registryImpl = new MemberRegistry();
        vm.label(address(registryImpl), "MemberRegistry Impl");

        registry = MemberRegistry(
            address(
                new ERC1967Proxy(
                    address(registryImpl),
                    abi.encodeCall(MemberRegistry.initialize, (IDAO(dao), ENS(ens), node, resolver))
                )
            )
        );
        vm.label(address(registry), "MemberRegistry Proxy");

        printDeployment();
        printSetupActions();

        if (!vm.envOr("SIMULATION", false)) {
            writeJsonArtifacts();
        }
    }

    function printDeployment() internal view {
        console.log("Deployed contracts:");
        console.log("- MemberRegistry impl: ", address(registryImpl));
        console.log("- MemberRegistry proxy:", address(registry));
        console.log();
        console.log("Other:");
        console.log("- Management DAO:      ", address(dao));
    }

    function printSetupActions() internal view {
        (string memory label, string memory parent) = ENSUtils.splitDomain(parentDomain);
        bytes32 parentNode = ENSUtils.namehash(parent);
        bytes32 labelHash = keccak256(bytes(label));

        console.log();
        console.log("=== Registry setup actions ===");

        // Action 1
        console.log();
        console.log("DAO action: Grant REVOKE_MEMBER_PERMISSION on registry to the DAO");
        console.log();
        console.log("- To:           ", dao, " (controlling DAO)");
        console.log("- Function:      grant(address where, address who, bytes32 permissionId)");
        console.log("  where:        ", address(registry), " (registry)");
        console.log("  who:          ", dao, " (controlling DAO)");
        console.log("  permissionId: ", vm.toString(registry.REVOKE_MEMBER_PERMISSION_ID()));

        console.log();
        console.log("=== ENS setup actions (by the parent domain owner) ===");

        // Action 2: create the subdomain node, owned by the DAO (not the registry)
        console.log();
        console.log("ENS action 1: Create ENS node for", parentDomain, "owned by the DAO");
        console.log();
        console.log("- To:             ", ens);
        console.log(
            "- Function:        setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)"
        );
        console.log("  node:           ", vm.toString(parentNode), string.concat('(namehash("', parent, '"))'));
        console.log("  label:          ", vm.toString(labelHash), string.concat('(keccak256("', label, '"))'));
        console.log("  owner:          ", dao, " (DAO)");
        console.log("  resolver:       ", resolver);
        console.log("  ttl:             0");

        // Action 3: approve registry as ENS operator so it can create subnodes
        console.log();
        console.log("ENS action 2: Approve registry as ENS operator");
        console.log();
        console.log("- To:             ", ens);
        console.log("- Function:        setApprovalForAll(address operator, bool approved)");
        console.log("  operator:       ", address(registry), " (registry)");
        console.log("  approved:        true");
    }

    function writeJsonArtifacts() internal {
        string memory artifacts = "output";
        artifacts.serialize("parentDomain", parentDomain);
        artifacts.serialize("parentNode", vm.toString(node));
        artifacts.serialize("memberRegistryImpl", address(registryImpl));
        artifacts = artifacts.serialize("memberRegistryProxy", address(registry));

        string memory networkName = vm.envOr("NETWORK_NAME", string("local"));
        string memory filePath = string.concat(
            vm.projectRoot(), "/artifacts/deployment-", networkName, "-", vm.toString(block.timestamp), ".json"
        );
        artifacts.write(filePath);

        console.log();
        console.log("Artifacts written to", filePath);
    }
}
