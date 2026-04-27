// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, console} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {MemberRegistry} from "../../src/MemberRegistry.sol";
import {IMemberRegistry} from "../../src/IMemberRegistry.sol";
import {IResolver} from "../../src/IResolver.sol";

/// @notice Simulates the full deployment + governance setup on a mainnet fork.
/// Reads PARENT_DOMAIN and MANAGEMENT_DAO from env. Looks up the actual ENS domain
/// owner on the fork and executes each action from the correct address.
/// @dev Run with: just test-fork --match-contract SetupSimulation
contract SetupSimulationTest is Test {
    ENS constant ENS_REGISTRY = ENS(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);
    address constant PUBLIC_RESOLVER = 0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63;

    address managementDao;
    string parentDomain;
    bytes32 parentNode;
    address domainOwner;

    MemberRegistry registry;
    address alice = address(0xa11ce);
    address deployer = address(0xDE9107);

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"));

        managementDao = vm.envAddress("MANAGEMENT_DAO");
        parentDomain = vm.envOr("PARENT_DOMAIN", string("members.dao.eth"));
        parentNode = _namehash(parentDomain);

        // Look up who actually owns this domain on the fork
        domainOwner = ENS_REGISTRY.owner(parentNode);

        console.log("Setup simulation");
        console.log("- Parent domain:", parentDomain);
        console.log("- Parent node:  ", vm.toString(parentNode));
        console.log("- Domain owner: ", domainOwner);
        console.log("- Management DAO:", managementDao);

        if (domainOwner == address(0)) {
            // Domain doesn't exist yet — create it.
            // Split to find the parent's parent and create the subnode.
            (string memory label, string memory parent) = _splitDomain(parentDomain);
            bytes32 parentOfParentNode = _namehash(parent);
            address parentOfParentOwner = ENS_REGISTRY.owner(parentOfParentNode);

            console.log("- Domain does not exist, creating under", parent);
            console.log("  parent owner: ", parentOfParentOwner);

            vm.prank(parentOfParentOwner);
            ENS_REGISTRY.setSubnodeRecord(
                parentOfParentNode,
                keccak256(bytes(label)),
                managementDao, // DAO owns the new node
                PUBLIC_RESOLVER,
                0
            );
            domainOwner = managementDao;
            console.log("  Created, owned by DAO");
        }
        console.log();

        // --- Step 1: Deploy (anyone can do this) ---

        vm.startPrank(deployer);
        registry = MemberRegistry(
            address(
                new ERC1967Proxy(
                    address(new MemberRegistry()),
                    abi.encodeCall(
                        MemberRegistry.initialize, (IDAO(managementDao), ENS_REGISTRY, parentNode, PUBLIC_RESOLVER)
                    )
                )
            )
        );
        vm.stopPrank();
        console.log("Step 1: Deployed registry at", address(registry));

        // --- Step 2: DAO grants REVOKE_MEMBER_PERMISSION to itself ---

        bytes32 revokePermId = registry.REVOKE_MEMBER_PERMISSION_ID();
        vm.prank(managementDao);
        (bool grantOk,) = managementDao.call(
            abi.encodeWithSignature("grant(address,address,bytes32)", address(registry), managementDao, revokePermId)
        );
        assertTrue(grantOk, "Step 2: grant REVOKE_MEMBER_PERMISSION failed");
        console.log("Step 2: Granted REVOKE_MEMBER_PERMISSION");

        // --- Step 3: Domain owner approves registry as ENS operator ---

        vm.prank(domainOwner);
        ENS_REGISTRY.setApprovalForAll(address(registry), true);
        console.log("Step 3: Domain owner approved registry as ENS operator");
        console.log();
    }

    function test_setup_registerWorks() public {
        vm.prank(alice);
        registry.register("alice");

        assertTrue(registry.isRegistered(alice));
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, keccak256("alice")));
        assertEq(ENS_REGISTRY.owner(subnode), address(registry));
        assertTrue(IResolver(PUBLIC_RESOLVER).isApprovedFor(address(registry), subnode, alice));
        console.log("register('alice') succeeded");
    }

    function test_setup_memberCanSetRecords() public {
        vm.prank(alice);
        registry.register("alice");

        bytes32 subnode = keccak256(abi.encodePacked(parentNode, keccak256("alice")));
        vm.prank(alice);
        (bool ok,) = PUBLIC_RESOLVER.call(
            abi.encodeWithSignature(
                "setText(bytes32,string,string)", subnode, "avatar", "https://example.com/alice.png"
            )
        );
        assertTrue(ok, "member setText failed");
        console.log("member setText succeeded");
    }

    function test_setup_revokeWorks() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(managementDao);
        registry.revoke(alice);

        assertFalse(registry.isRegistered(alice));
        console.log("revoke succeeded");
    }

    function test_setup_fullCycle() public {
        vm.prank(alice);
        registry.register("alice");
        assertTrue(registry.isRegistered(alice));

        vm.prank(alice);
        registry.move("alice2");
        assertEq(registry.memberSubdomain(alice), "alice2");

        vm.prank(alice);
        registry.release();
        assertFalse(registry.isRegistered(alice));
        console.log("full cycle succeeded");
    }

    function test_setup_domainOwnerRetainsControl() public {
        // Domain owner still owns the parent node
        assertEq(ENS_REGISTRY.owner(parentNode), domainOwner);

        // Domain owner can revoke operator access
        vm.prank(domainOwner);
        ENS_REGISTRY.setApprovalForAll(address(registry), false);

        // After revoking, register should fail
        vm.expectRevert();
        vm.prank(alice);
        registry.register("alice");

        console.log("domain owner retains control and can revoke operator access");
    }

    // --- ENS helpers ---

    function _namehash(string memory domain) internal pure returns (bytes32 result) {
        if (bytes(domain).length == 0) return bytes32(0);
        bytes memory b = bytes(domain);
        uint256 end = b.length;
        for (uint256 i = b.length; i > 0; i--) {
            if (b[i - 1] == ".") {
                result = keccak256(abi.encodePacked(result, _labelHash(b, i, end)));
                end = i - 1;
            }
        }
        result = keccak256(abi.encodePacked(result, _labelHash(b, 0, end)));
    }

    function _splitDomain(string memory domain) internal pure returns (string memory label, string memory parent) {
        bytes memory b = bytes(domain);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] == ".") {
                label = new string(i);
                parent = new string(b.length - i - 1);
                bytes memory lb = bytes(label);
                bytes memory pb = bytes(parent);
                for (uint256 j = 0; j < i; j++) {
                    lb[j] = b[j];
                }
                for (uint256 j = i + 1; j < b.length; j++) {
                    pb[j - i - 1] = b[j];
                }
                return (label, parent);
            }
        }
        revert("domain must contain a dot");
    }

    function _labelHash(bytes memory b, uint256 start, uint256 end) internal pure returns (bytes32) {
        bytes memory label = new bytes(end - start);
        for (uint256 i = start; i < end; i++) {
            label[i - start] = b[i];
        }
        return keccak256(label);
    }
}
