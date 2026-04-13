// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {MemberRegistry} from "../src/MemberRegistry.sol";
import {MemberSubdomainRegistrar} from "../src/MemberSubdomainRegistrar.sol";
import {ENSUtils} from "./lib/ENSUtils.sol";

/// @notice Deploys MemberRegistry + MemberSubdomainRegistrar behind UUPS proxies.
/// @dev After deployment, prints the DAO governance proposal calldata for the three
/// completion actions (two permission grants + ENS node transfer). These can be batched
/// into a single DAO proposal as an Action[] array.
contract DeployMemberRegistry is Script {
    using stdJson for string;

    MemberSubdomainRegistrar registrarImpl;
    MemberSubdomainRegistrar registrar;
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
        dao = vm.envAddress("MANAGING_DAO");
        ens = vm.envAddress("ENS_REGISTRY");
        parentDomain = vm.envOr("PARENT_DOMAIN", string("members.dao.eth"));
        node = ENSUtils.namehash(parentDomain);
        resolver = vm.envAddress("RESOLVER");

        console.log("- Parent domain:", parentDomain);
        console.log(
            "- Node:         ",
            vm.toString(node),
            string.concat('(namehash("', parentDomain, '"))')
        );
        console.log();

        // 1. Deploy registrar implementation + proxy
        registrarImpl = new MemberSubdomainRegistrar();
        vm.label(address(registrarImpl), "MemberSubdomainRegistrar Impl");

        registrar = MemberSubdomainRegistrar(
            address(
                new ERC1967Proxy(
                    address(registrarImpl),
                    abi.encodeCall(
                        MemberSubdomainRegistrar.initialize,
                        (IDAO(dao), ENS(ens), node, resolver)
                    )
                )
            )
        );
        vm.label(address(registrar), "MemberSubdomainRegistrar Proxy");

        // 2. Deploy registry implementation + proxy
        registryImpl = new MemberRegistry();
        vm.label(address(registryImpl), "MemberRegistry Impl");

        registry = MemberRegistry(
            address(
                new ERC1967Proxy(
                    address(registryImpl),
                    abi.encodeCall(MemberRegistry.initialize, (IDAO(dao), registrar))
                )
            )
        );
        vm.label(address(registry), "MemberRegistry Proxy");

        printDeployment();
        printProposalActions();

        if (!vm.envOr("SIMULATION", false)) {
            writeJsonArtifacts();
        }
    }

    function printDeployment() internal view {
        console.log("Deployed contracts:");
        console.log("- MemberSubdomainRegistrar impl: ", address(registrarImpl));
        console.log("- MemberSubdomainRegistrar proxy:", address(registrar));
        console.log("- MemberRegistry impl:           ", address(registryImpl));
        console.log("- MemberRegistry proxy:          ", address(registry));
    }

    function printProposalActions() internal view {
        (string memory label, string memory parent) = ENSUtils.splitDomain(parentDomain);
        bytes32 parentNode = ENSUtils.namehash(parent);
        bytes32 labelHash = keccak256(bytes(label));

        console.log();
        console.log("=== Registry setup actions ===");

        // Action 1
        console.log();
        console.log("DAO action 1: Grant REGISTER_SUBDOMAIN_PERMISSION on registrar to registry");
        console.log();
        console.log("- To:           ", dao);
        console.log("- Function:      grant(address _where, address _who, bytes32 _permissionId)");
        console.log("  _where:       ", address(registrar));
        console.log("  _who:         ", address(registry));
        console.log("  _permissionId:", vm.toString(registrar.REGISTER_SUBDOMAIN_PERMISSION_ID()));

        // Action 2
        console.log();
        console.log("DAO action 2: Grant REVOKE_MEMBER_PERMISSION on registry");
        console.log();
        console.log("- To:           ", dao);
        console.log("- Function:      grant(address _where, address _who, bytes32 _permissionId)");
        console.log("  _where:       ", address(registry));
        console.log("  _who:         ", address(dao));
        console.log("  _permissionId:", vm.toString(registry.REVOKE_MEMBER_PERMISSION_ID()));

        console.log();
        console.log("=== ENS setup actions ===");

        // Action 3
        console.log();
        console.log("ENS owner action 1: Create ENS node for", parentDomain, "owned by registrar");
        console.log();
        console.log("- To:             ", ens);
        console.log(
            "- Function:        setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)"
        );
        console.log(
            "  node:           ",
            vm.toString(parentNode),
            string.concat('(namehash("', parent, '"))')
        );
        console.log(
            "  label:          ",
            vm.toString(labelHash),
            string.concat('(keccak256("', label, '"))')
        );
        console.log("  owner:          ", address(registrar));
        console.log("  resolver:       ", resolver);
        console.log("  ttl:             0");
    }

    function writeJsonArtifacts() internal {
        string memory artifacts = "output";
        artifacts.serialize("parentDomain", parentDomain);
        artifacts.serialize("parentNode", vm.toString(node));
        artifacts.serialize("memberSubdomainRegistrarImpl", address(registrarImpl));
        artifacts.serialize("memberSubdomainRegistrarProxy", address(registrar));
        artifacts.serialize("memberRegistryImpl", address(registryImpl));
        artifacts = artifacts.serialize("memberRegistryProxy", address(registry));

        string memory networkName = vm.envOr("NETWORK_NAME", string("local"));
        string memory filePath = string.concat(
            vm.projectRoot(),
            "/artifacts/deployment-",
            networkName,
            "-",
            vm.toString(block.timestamp),
            ".json"
        );
        artifacts.write(filePath);

        console.log();
        console.log("Artifacts written to", filePath);
    }
}
