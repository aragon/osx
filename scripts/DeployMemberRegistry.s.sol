// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {MemberRegistry} from "../src/framework/member/MemberRegistry.sol";
import {ENSDomain} from "../src/framework/utils/ens/ENSDomain.sol";

/// @notice Deploys MemberRegistry behind a UUPS proxy and prints the required governance
/// actions (permission grant + ENS node transfer).
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
        dao = vm.envAddress("MANAGEMENT_DAO");
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
        console.log("DAO action: Grant REVOKE_MEMBER_PERMISSION on registry to the DAO");
        console.log();
        console.log("- From:          ", dao, " (controlling DAO)");
        console.log("- To:            ", dao, " (controlling DAO)");
        console.log("- Function:       grant(address where, address who, bytes32 permissionId)");
        console.log("  where:         ", address(registry), " (registry)");
        console.log("  who:           ", dao, " (controlling DAO)");
        console.log("  permissionId:  ", vm.toString(registry.REVOKE_MEMBER_PERMISSION_ID()));

        address ensOwner = ENS(ens).owner(parentNode);
        // Known NameWrapper on mainnet
        address nameWrapper = 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401;
        bool isWrapped = ensOwner == nameWrapper;

        console.log();
        console.log("=== ENS setup actions ===");

        if (ensOwner == address(0)) {
            // Domain doesn't exist — create it
            console.log();
            address parentOfParentOwner = ENS(ens).owner(grandparentNode);
            console.log("ENS action: Create ENS node for", parentDomain, "owned by the DAO");
            console.log();
            console.log("- From:            ", parentOfParentOwner, string.concat(" (owner of ", parent, ")"));
            console.log("- To:              ", ens);
            console.log(
                "- Function:        setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)"
            );
            console.log("  node:           ", vm.toString(grandparentNode), string.concat('(namehash("', parent, '"))'));
            console.log("  label:          ", vm.toString(labelHash), string.concat('(keccak256("', label, '"))'));
            console.log("  owner:          ", dao, " (DAO)");
            console.log("  resolver:       ", resolver);
            console.log("  ttl:             0");

            // For a new node owned by the DAO, approval goes on the ENS registry
            _printApprovalAction(ens, dao, "DAO");
        } else if (isWrapped) {
            // Wrapped name — the NameWrapper owns the node in the ENS registry.
            // The registry cannot operate on wrapped names because it calls the ENS
            // registry directly, and the NameWrapper doesn't propagate setApprovalForAll
            // to the ENS registry. The domain must be unwrapped first.
            (bool ok, bytes memory data) =
                nameWrapper.staticcall(abi.encodeWithSignature("ownerOf(uint256)", uint256(parentNode)));
            address domainHolder = ok ? abi.decode(data, (address)) : address(0);

            (string memory domainLabel,) = ENSDomain.splitDomain(parentDomain);

            console.log();
            console.log("! ENS node for", parentDomain, "is WRAPPED: must unwrap first !");
            console.log("  ENS owner (NameWrapper):", ensOwner);
            console.log("  Domain holder:          ", domainHolder);
            console.log();
            console.log("Prerequisite: Unwrap the domain");
            console.log();
            console.log("- From:            ", domainHolder, " (domain holder)");
            console.log("- To:              ", nameWrapper, " (NameWrapper)");
            console.log("- Function:         unwrapETH2LD(bytes32 labelhash, address registrant, address controller)");
            console.log(
                "  labelhash:       ",
                vm.toString(keccak256(bytes(domainLabel))),
                string.concat('(keccak256("', domainLabel, '"))')
            );
            console.log("  registrant:      ", domainHolder);
            console.log("  controller:      ", domainHolder);
            console.log();
            console.log("After unwrapping, the domain holder becomes the direct ENS owner.");
            console.log("Then proceed with the approval below.");

            _printApprovalAction(ens, domainHolder, "domain holder (after unwrap)");
        } else {
            // Unwrapped, existing name — approval goes on the ENS registry
            console.log();
            console.log("ENS node for", parentDomain, "already exists (unwrapped)");
            console.log("  owner:          ", ensOwner);

            _printApprovalAction(ens, ensOwner, "domain owner");
        }
    }

    function _printApprovalAction(address target, address from, string memory fromLabel) internal view {
        console.log();
        console.log("ENS action: Approve registry as ENS operator");
        console.log();
        console.log("- From:            ", from, string.concat(" (", fromLabel, ")"));
        console.log("- To:              ", target);
        console.log("- Function:         setApprovalForAll(address operator, bool approved)");
        console.log("  operator:        ", address(registry), " (registry)");
        console.log("  approved:         true");
    }

    function writeJsonArtifacts() internal {
        string memory artifacts = "output";
        artifacts.serialize("parentDomain", parentDomain);
        artifacts.serialize("parentNode", vm.toString(parentNode));
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
