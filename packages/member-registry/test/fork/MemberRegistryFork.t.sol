// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {DAOMock} from "@aragon/osx-commons-contracts/src/mocks/dao/DAOMock.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";

import {MemberRegistry} from "../../src/MemberRegistry.sol";
import {MemberSubdomainRegistrar} from "../../src/MemberSubdomainRegistrar.sol";
import {IMemberRegistry} from "../../src/IMemberRegistry.sol";
import {IResolver} from "../../src/IResolver.sol";

/// @notice Fork tests against mainnet ENS infrastructure.
/// @dev Excluded from CI via `--no-match-path "test/fork/*"`.
/// Run with: just test-fork
/// Requires RPC_URL set to a mainnet endpoint.
contract MemberRegistryForkTest is Test {
    using ProxyLib for address;

    // Mainnet ENS registry
    ENS constant ENS_REGISTRY = ENS(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);

    // Mainnet PublicResolver (supports per-node approve)
    address constant PUBLIC_RESOLVER = 0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63;

    DAOMock dao;
    MemberSubdomainRegistrar registrar;
    MemberRegistry registry;

    // We use a test node that the test deployer owns (pranked)
    bytes32 testNode;
    address deployer = address(0xDEAD);
    address alice = address(0xa11ce);

    function setUp() public {
        // Fork mainnet
        vm.createSelectFork(vm.envString("RPC_URL"));

        dao = new DAOMock();
        dao.setHasPermissionReturnValueMock(true);

        // Create a test node: deployer registers a subnode under the ENS root
        // In practice this would be a real domain — here we use a deterministic one
        testNode = keccak256(abi.encodePacked(bytes32(0), keccak256("test-member-registry")));

        // Prank the ENS root owner to create our test node
        address rootOwner = ENS_REGISTRY.owner(bytes32(0));
        vm.prank(rootOwner);
        ENS_REGISTRY.setSubnodeOwner(bytes32(0), keccak256("test-member-registry"), deployer);

        // Deploy registrar
        vm.startPrank(deployer);
        MemberSubdomainRegistrar registrarImpl = new MemberSubdomainRegistrar();
        registrar = MemberSubdomainRegistrar(
            address(registrarImpl).deployUUPSProxy(
                abi.encodeCall(
                    MemberSubdomainRegistrar.initialize,
                    (IDAO(address(dao)), ENS_REGISTRY, testNode, PUBLIC_RESOLVER)
                )
            )
        );

        // Transfer node ownership to registrar
        ENS_REGISTRY.setOwner(testNode, address(registrar));

        // Deploy registry
        MemberRegistry registryImpl = new MemberRegistry();
        registry = MemberRegistry(
            address(registryImpl).deployUUPSProxy(
                abi.encodeCall(MemberRegistry.initialize, (IDAO(address(dao)), registrar))
            )
        );
        vm.stopPrank();
    }

    function test_fork_registerAndResolve() public {
        vm.prank(alice);
        registry.register("alice");

        bytes32 subnode = keccak256(abi.encodePacked(testNode, keccak256("alice")));

        // Verify forward resolution: subnode resolves to alice
        assertEq(ENS_REGISTRY.owner(subnode), address(registrar));
        assertEq(IResolver(PUBLIC_RESOLVER).isApprovedFor(address(registrar), subnode, alice), true);
    }

    function test_fork_memberCanSetTextRecords() public {
        vm.prank(alice);
        registry.register("alice");

        bytes32 subnode = keccak256(abi.encodePacked(testNode, keccak256("alice")));

        // Alice can set text records via the real PublicResolver
        vm.prank(alice);
        (bool success,) = PUBLIC_RESOLVER.call(
            abi.encodeWithSignature("setText(bytes32,string,string)", subnode, "avatar", "https://example.com/alice.png")
        );
        assertTrue(success, "setText should succeed via per-node approval");
    }

    function test_fork_releaseAndClearRecords() public {
        vm.prank(alice);
        registry.register("alice");

        bytes32 subnode = keccak256(abi.encodePacked(testNode, keccak256("alice")));

        // Alice sets a text record
        vm.prank(alice);
        (bool success,) = PUBLIC_RESOLVER.call(
            abi.encodeWithSignature("setText(bytes32,string,string)", subnode, "description", "hello")
        );
        assertTrue(success);

        // Release
        vm.prank(alice);
        registry.release();

        // Approval revoked
        assertFalse(IResolver(PUBLIC_RESOLVER).isApprovedFor(address(registrar), subnode, alice));

        // ENS node released
        assertEq(ENS_REGISTRY.owner(subnode), address(0));
    }

    function test_fork_fullCycle() public {
        // Register
        vm.prank(alice);
        registry.register("alice");
        assertTrue(registrar.isRegistered(alice));

        // Rename
        vm.prank(alice);
        registry.rename("alice2");
        assertEq(registrar.memberSubdomain(alice), "alice2");

        // Release
        vm.prank(alice);
        registry.release();
        assertFalse(registrar.isRegistered(alice));
    }
}
