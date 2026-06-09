// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IDAO} from "../src/common/dao/IDAO.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {MemberRegistry} from "../src/framework/member/MemberRegistry.sol";
import {ENSDomain} from "../src/framework/utils/ens/ENSDomain.sol";

/// @notice Deploys MemberRegistry behind a UUPS proxy and prints the required follow-up
/// actions (permission grant + ENS controllership transfer scoped to the parent domain).
contract DeployMemberRegistry is Script {
    using stdJson for string;

    MemberRegistry registryImpl;
    MemberRegistry registry;

    string parentDomain;
    address dao;
    address ens;
    bytes32 parentNode;
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
        dao = vm.envAddress("MANAGEMENT_DAO_ADDRESS");
        ens = vm.envAddress("ENS_REGISTRY");
        parentDomain = vm.envOr("PARENT_DOMAIN", string("members.dao.eth"));
        parentNode = ENSDomain.namehash(parentDomain);
        resolver = vm.envAddress("ENS_PUBLIC_RESOLVER");

        console.log("- Parent domain:", parentDomain);
        console.log("- Parent node:  ", vm.toString(parentNode), string.concat('(namehash("', parentDomain, '"))'));
        console.log();

        // Deploy implementation + proxy
        registryImpl = new MemberRegistry();
        vm.label(address(registryImpl), "MemberRegistry Impl");

        registry = MemberRegistry(
            address(
                new ERC1967Proxy(
                    address(registryImpl),
                    abi.encodeCall(MemberRegistry.initialize, (IDAO(dao), ENS(ens), parentDomain, resolver))
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
        (string memory label, string memory parent) = ENSDomain.splitDomain(parentDomain);
        bytes32 grandparentNode = ENSDomain.namehash(parent);
        bytes32 labelHash = keccak256(bytes(label));

        console.log();
        console.log("=== Registry setup actions ===");

        // Action 1
        console.log();
        console.log("DAO action: Grant EVICT_SUBDOMAIN_PERMISSION on registry to the DAO");
        console.log();
        console.log("- From:          ", dao, " (controlling DAO)");
        console.log("- To:            ", dao, " (controlling DAO)");
        console.log("- Function:       grant(address where, address who, bytes32 permissionId)");
        console.log("  where:         ", address(registry), " (registry)");
        console.log("  who:           ", dao, " (controlling DAO)");
        console.log("  permissionId:  ", vm.toString(registry.EVICT_SUBDOMAIN_PERMISSION_ID()));

        address ensOwner = ENS(ens).owner(parentNode);
        // Known NameWrapper on mainnet
        address nameWrapper = 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401;
        bool isWrapped = ensOwner == nameWrapper;

        console.log();
        console.log("=== ENS setup actions ===");

        if (ensOwner == address(0)) {
            // Domain doesn't exist: create it directly controlled by the registry
            // (i.e., registry is the ENS `owner` of the new node).
            // Single tx, scoped to this node only. The kill-switch remains with whoever
            // controls the parent: they can rewrite this subnode via setSubnodeOwner at will.
            console.log();
            address parentOfParentOwner = ENS(ens).owner(grandparentNode);
            console.log("ENS action: Create ENS node for", parentDomain, "controlled by the registry");
            console.log();
            console.log("- From:            ", parentOfParentOwner, string.concat(" (controller of ", parent, ")"));
            console.log("- To:              ", ens);
            console.log(
                "- Function:        setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)"
            );
            console.log("  node:           ", vm.toString(grandparentNode), string.concat('(namehash("', parent, '"))'));
            console.log("  label:          ", vm.toString(labelHash), string.concat('(keccak256("', label, '"))'));
            console.log("  owner:          ", address(registry), " (registry)");
            console.log("  resolver:       ", resolver);
            console.log("  ttl:             0");
        } else if (isWrapped) {
            // Wrapped name: the NameWrapper holds the ENS `owner` slot for this node. We can't
            // operate on it via the ENS registry directly; the wrap must be removed and the
            // new ENS controller set in one step. `unwrapETH2LD(labelhash, registrant, controller)`
            // unwraps and lets us hand ENS controllership to the registry while the .eth NFT
            // (the kill-switch / registrant) stays with the current domain holder.
            (bool ok, bytes memory data) =
                nameWrapper.staticcall(abi.encodeWithSignature("ownerOf(uint256)", uint256(parentNode)));
            address domainHolder = ok ? abi.decode(data, (address)) : address(0);

            console.log();
            console.log("! ENS node for", parentDomain, "is WRAPPED: unwrap and transfer in one tx !");
            console.log("  ENS owner (NameWrapper):", ensOwner);
            console.log("  Domain holder:          ", domainHolder);
            console.log();
            console.log("ENS action: Unwrap and hand ENS controllership to the registry");
            console.log();
            console.log("- From:            ", domainHolder, " (domain holder)");
            console.log("- To:              ", nameWrapper, " (NameWrapper)");
            console.log("- Function:         unwrapETH2LD(bytes32 labelhash, address registrant, address controller)");
            console.log("  labelhash:       ", vm.toString(labelHash), string.concat('(keccak256("', label, '"))'));
            console.log("  registrant:      ", domainHolder, " (keeps the .eth NFT: kill-switch)");
            console.log("  controller:      ", address(registry), " (registry: becomes ENS controller)");
        } else {
            // Unwrapped, existing name: transfer ENS controllership of this node to the registry.
            // Scoped to this node only (unlike setApprovalForAll which would expose every other
            // ENS name the current controller holds). The .eth NFT registrant retains the ability
            // to `reclaim` controllership back at any time, which is the real kill-switch.
            console.log();
            console.log("ENS node for", parentDomain, "already exists (unwrapped)");
            console.log("  current controller:", ensOwner);

            // If the parent has no resolver set, warn now: after the transfer below only the
            // registry can write to the parent node, and the registry has no API to do so,
            // requiring a reclaim cycle to fix later.
            address currentResolver = ENS(ens).resolver(parentNode);
            if (currentResolver == address(0)) {
                console.log();
                console.log("! Parent has no resolver set !");
                console.log("  If you want the parent name itself to resolve (e.g.", parentDomain, "-> some address),");
                console.log("  set its resolver BEFORE the transfer below. After the transfer, the parent's");
                console.log("  resolver/records can only be changed by reclaiming controllership first.");
                console.log();
                console.log("Optional ENS action: Set parent resolver");
                console.log();
                console.log("- From:            ", ensOwner, " (current ENS controller)");
                console.log("- To:              ", ens);
                console.log("- Function:         setResolver(bytes32 node, address resolver)");
                console.log("  node:            ", vm.toString(parentNode), string.concat('(namehash("', parentDomain, '"))'));
                console.log("  resolver:        ", resolver);
            }

            console.log();
            console.log("ENS action: Transfer ENS controllership of", parentDomain, "to the registry");
            console.log();
            console.log("- From:            ", ensOwner, " (current ENS controller)");
            console.log("- To:              ", ens);
            console.log("- Function:         setOwner(bytes32 node, address owner)");
            console.log("  node:            ", vm.toString(parentNode), string.concat('(namehash("', parentDomain, '"))'));
            console.log("  owner:           ", address(registry), " (registry)");
        }
    }

    function writeJsonArtifacts() internal {
        string memory artifacts = "output";
        artifacts.serialize("parentDomain", parentDomain);
        artifacts.serialize("parentNode", vm.toString(parentNode));
        artifacts.serialize("memberRegistryImpl", address(registryImpl));
        artifacts = artifacts.serialize("memberRegistryProxy", address(registry));

        // Ensure ./deployments/ exists. `vm.createDir(_, true)` is
        // recursive and idempotent.
        vm.createDir("./deployments", true);
        string memory networkName = vm.envOr("NETWORK_NAME", string("local"));
        string memory filePath = string.concat(
            vm.projectRoot(),
            "/deployments/",
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
