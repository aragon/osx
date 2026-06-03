// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IDAO} from "@aragon/osx-commons-contracts/dao/IDAO.sol";
import {DAOMock} from "../../../mocks/commons/dao/DAOMock.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {MemberRegistry} from "../../../../src/framework/member/MemberRegistry.sol";
import {IResolver} from "../../../../src/framework/utils/ens/IResolver.sol";

/// @notice Fork tests against mainnet ENS infrastructure.
/// @dev Excluded from CI via `--no-match-path "test/fork/*"`.
/// Run with: just test-fork
contract MemberRegistryForkTest is Test {
    ENS constant ENS_REGISTRY = ENS(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);
    address constant PUBLIC_RESOLVER = 0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63;

    DAOMock dao;
    MemberRegistry registry;

    // A 1-label name under the ENS root, used as the parent for fork tests.
    string constant TEST_DOMAIN = "test-member-registry";
    bytes32 testNode;
    address deployer = address(0xDEAD);
    address alice = address(0xa11ce);

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"));

        dao = new DAOMock();
        dao.setHasPermissionReturnValueMock(true);

        testNode = keccak256(abi.encodePacked(bytes32(0), keccak256(bytes(TEST_DOMAIN))));

        address rootOwner = ENS_REGISTRY.owner(bytes32(0));
        vm.prank(rootOwner);
        ENS_REGISTRY.setSubnodeOwner(bytes32(0), keccak256(bytes(TEST_DOMAIN)), deployer);

        vm.startPrank(deployer);
        registry = MemberRegistry(
            address(
                new ERC1967Proxy(
                    address(new MemberRegistry()),
                    abi.encodeCall(
                        MemberRegistry.initialize, (IDAO(address(dao)), ENS_REGISTRY, TEST_DOMAIN, PUBLIC_RESOLVER)
                    )
                )
            )
        );

        ENS_REGISTRY.setOwner(testNode, address(registry));
        vm.stopPrank();
    }

    function test_fork_registerAndResolve() public {
        vm.prank(alice);
        registry.register("alice");

        bytes32 subnode = keccak256(abi.encodePacked(testNode, keccak256("alice")));
        assertEq(ENS_REGISTRY.owner(subnode), address(registry));
        assertTrue(IResolver(PUBLIC_RESOLVER).isApprovedFor(address(registry), subnode, alice));
    }

    function test_fork_memberCanSetTextRecords() public {
        vm.prank(alice);
        registry.register("alice");

        bytes32 subnode = keccak256(abi.encodePacked(testNode, keccak256("alice")));

        vm.prank(alice);
        (bool success,) = PUBLIC_RESOLVER.call(
            abi.encodeWithSignature(
                "setText(bytes32,string,string)", subnode, "avatar", "https://example.com/alice.png"
            )
        );
        assertTrue(success, "setText should succeed via per-node approval");
    }

    function test_fork_releaseAndClearRecords() public {
        vm.prank(alice);
        registry.register("alice");

        bytes32 subnode = keccak256(abi.encodePacked(testNode, keccak256("alice")));

        vm.prank(alice);
        (bool success,) = PUBLIC_RESOLVER.call(
            abi.encodeWithSignature("setText(bytes32,string,string)", subnode, "description", "hello")
        );
        assertTrue(success);

        vm.prank(alice);
        registry.release();

        assertFalse(IResolver(PUBLIC_RESOLVER).isApprovedFor(address(registry), subnode, alice));
        assertEq(ENS_REGISTRY.owner(subnode), address(0));
    }

    function test_fork_fullCycle() public {
        vm.prank(alice);
        registry.register("alice");
        assertTrue(registry.isRegistered(alice));

        vm.prank(alice);
        registry.move("alice2");
        assertEq(registry.memberSubdomain(alice), "alice2");

        vm.prank(alice);
        registry.release();
        assertFalse(registry.isRegistered(alice));
    }
}
