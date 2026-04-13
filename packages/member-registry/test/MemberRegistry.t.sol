// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {DaoUnauthorized} from "@aragon/osx-commons-contracts/src/permission/auth/auth.sol";
import {DAOMock} from "@aragon/osx-commons-contracts/src/mocks/dao/DAOMock.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {MemberRegistry} from "../src/MemberRegistry.sol";
import {MemberSubdomainRegistrar} from "../src/MemberSubdomainRegistrar.sol";
import {IMemberRegistry} from "../src/IMemberRegistry.sol";
import {MockENS} from "./mocks/MockENS.sol";
import {MockResolver} from "./mocks/MockResolver.sol";

contract MemberRegistryTest is Test {
    DAOMock dao;
    MockENS ens;
    MockResolver resolver;
    MemberSubdomainRegistrar registrar;
    MemberRegistry registry;

    // namehash("members.dao.eth") — precomputed for tests
    bytes32 constant NODE = 0x9093d252ec2b5895c76e2e438e1519bfefe8e2e6d48e8cb9bdb6c5bd75c96225;

    address alice = address(0xa11ce);
    address bob = address(0xb0b);
    address revoker = address(0x3e40);

    function setUp() public {
        dao = new DAOMock();
        dao.setHasPermissionReturnValueMock(true);

        ens = new MockENS();
        resolver = new MockResolver(ENS(address(ens)));

        // Make the registrar own the parent node in ENS (simulates governance action)
        // We deploy the registrar first, then set ownership.

        // Deploy registrar behind UUPS proxy
        registrar = MemberSubdomainRegistrar(
            address(
                new ERC1967Proxy(
                    address(new MemberSubdomainRegistrar()),
                    abi.encodeCall(
                        MemberSubdomainRegistrar.initialize,
                        (IDAO(address(dao)), ENS(address(ens)), NODE, address(resolver))
                    )
                )
            )
        );

        // The registrar must own the parent ENS node
        ens.setOwner(NODE, address(registrar));

        // Deploy registry behind UUPS proxy
        registry = MemberRegistry(
            address(
                new ERC1967Proxy(
                    address(new MemberRegistry()),
                    abi.encodeCall(
                        MemberRegistry.initialize,
                        (IDAO(address(dao)), registrar)
                    )
                )
            )
        );
    }

    // -------------------------------------------------------------------------
    // register — happy path
    // -------------------------------------------------------------------------

    function test_register() public {
        vm.prank(alice);
        registry.register("alice");

        // Registrar state
        assertTrue(registrar.isRegistered(alice));
        assertEq(registrar.labelOwner(keccak256("alice")), alice);
        assertEq(registrar.memberSubdomain(alice), "alice");

        // ENS: subnode owned by registrar
        bytes32 subnode = _subnode("alice");
        assertEq(ens.owner(subnode), address(registrar));

        // Resolver: addr record set
        assertEq(resolver.addr(subnode), alice);

        // Resolver: per-node approval granted
        assertTrue(resolver.isApprovedFor(address(registrar), subnode, alice));
    }

    function test_register_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit IMemberRegistry.MemberRegistered(alice, "alice");

        vm.prank(alice);
        registry.register("alice");
    }

    function test_register_multipleMembers() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(bob);
        registry.register("bob");

        assertTrue(registrar.isRegistered(alice));
        assertTrue(registrar.isRegistered(bob));
        assertEq(registrar.labelOwner(keccak256("alice")), alice);
        assertEq(registrar.labelOwner(keccak256("bob")), bob);
    }

    function test_register_hyphenAndDigits() public {
        vm.prank(alice);
        registry.register("alice-123");

        assertEq(registrar.memberSubdomain(alice), "alice-123");
    }

    // -------------------------------------------------------------------------
    // register — error paths
    // -------------------------------------------------------------------------

    function test_register_revertsIfAlreadyRegistered() public {
        vm.prank(alice);
        registry.register("alice");

        vm.expectRevert(abi.encodeWithSelector(MemberSubdomainRegistrar.AlreadyRegistered.selector, alice));
        vm.prank(alice);
        registry.register("other");
    }

    function test_register_revertsIfSubdomainTaken() public {
        vm.prank(alice);
        registry.register("taken");

        vm.expectRevert(
            abi.encodeWithSelector(MemberSubdomainRegistrar.SubdomainAlreadyTaken.selector, "taken")
        );
        vm.prank(bob);
        registry.register("taken");
    }

    function test_register_revertsIfEmptySubdomain() public {
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidSubdomain.selector, ""));
        vm.prank(alice);
        registry.register("");
    }

    function test_register_revertsIfInvalidChars() public {
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidSubdomain.selector, "Alice"));
        vm.prank(alice);
        registry.register("Alice");
    }

    function test_register_revertsIfInvalidCharsUnderscore() public {
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidSubdomain.selector, "al_ice"));
        vm.prank(alice);
        registry.register("al_ice");
    }

    // -------------------------------------------------------------------------
    // release — happy path
    // -------------------------------------------------------------------------

    function test_release() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(alice);
        registry.release();

        // State cleared
        assertFalse(registrar.isRegistered(alice));
        assertEq(registrar.labelOwner(keccak256("alice")), address(0));
        assertEq(bytes(registrar.memberSubdomain(alice)).length, 0);

        // ENS: subnode released
        assertEq(ens.owner(_subnode("alice")), address(0));

        // Resolver: approval revoked
        assertFalse(resolver.isApprovedFor(address(registrar), _subnode("alice"), alice));
    }

    function test_release_emitsEvent() public {
        vm.prank(alice);
        registry.register("alice");

        vm.expectEmit(true, false, false, true);
        emit IMemberRegistry.MemberReleased(alice, "alice");

        vm.prank(alice);
        registry.release();
    }

    // -------------------------------------------------------------------------
    // release — error paths
    // -------------------------------------------------------------------------

    function test_release_revertsIfNotRegistered() public {
        vm.expectRevert(abi.encodeWithSelector(MemberSubdomainRegistrar.NotRegistered.selector, alice));
        vm.prank(alice);
        registry.release();
    }

    // -------------------------------------------------------------------------
    // revoke — happy path
    // -------------------------------------------------------------------------

    function test_revoke() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(revoker);
        registry.revoke(alice);

        assertFalse(registrar.isRegistered(alice));
        assertEq(ens.owner(_subnode("alice")), address(0));
    }

    function test_revoke_emitsEvent() public {
        vm.prank(alice);
        registry.register("alice");

        vm.expectEmit(true, true, false, true);
        emit IMemberRegistry.MemberRevoked(alice, revoker, "alice");

        vm.prank(revoker);
        registry.revoke(alice);
    }

    // -------------------------------------------------------------------------
    // revoke — error paths
    // -------------------------------------------------------------------------

    function test_revoke_revertsWithoutPermission() public {
        vm.prank(alice);
        registry.register("alice");

        // Disable permissions
        dao.setHasPermissionReturnValueMock(false);

        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(dao),
                address(registry),
                revoker,
                registry.REVOKE_MEMBER_PERMISSION_ID()
            )
        );
        vm.prank(revoker);
        registry.revoke(alice);
    }

    function test_revoke_revertsIfNotRegistered() public {
        vm.expectRevert(abi.encodeWithSelector(MemberSubdomainRegistrar.NotRegistered.selector, alice));
        vm.prank(revoker);
        registry.revoke(alice);
    }

    // -------------------------------------------------------------------------
    // rename — happy path
    // -------------------------------------------------------------------------

    function test_rename() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(alice);
        registry.rename("alice2");

        // New registration
        assertTrue(registrar.isRegistered(alice));
        assertEq(registrar.memberSubdomain(alice), "alice2");
        assertEq(registrar.labelOwner(keccak256("alice2")), alice);
        assertEq(resolver.addr(_subnode("alice2")), alice);
        assertTrue(resolver.isApprovedFor(address(registrar), _subnode("alice2"), alice));

        // Old label freed
        assertEq(registrar.labelOwner(keccak256("alice")), address(0));
        assertEq(ens.owner(_subnode("alice")), address(0));
        assertFalse(resolver.isApprovedFor(address(registrar), _subnode("alice"), alice));
    }

    function test_rename_emitsEvent() public {
        vm.prank(alice);
        registry.register("alice");

        vm.expectEmit(true, false, false, true);
        emit IMemberRegistry.MemberRenamed(alice, "alice", "alice2");

        vm.prank(alice);
        registry.rename("alice2");
    }

    // -------------------------------------------------------------------------
    // rename — error paths
    // -------------------------------------------------------------------------

    function test_rename_revertsIfNotRegistered() public {
        vm.expectRevert(abi.encodeWithSelector(MemberSubdomainRegistrar.NotRegistered.selector, alice));
        vm.prank(alice);
        registry.rename("newname");
    }

    function test_rename_revertsIfNewLabelTaken() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(bob);
        registry.register("bob");

        vm.expectRevert(
            abi.encodeWithSelector(MemberSubdomainRegistrar.SubdomainAlreadyTaken.selector, "bob")
        );
        vm.prank(alice);
        registry.rename("bob");
    }

    function test_rename_revertsIfInvalidSubdomain() public {
        vm.prank(alice);
        registry.register("alice");

        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidSubdomain.selector, ""));
        vm.prank(alice);
        registry.rename("");
    }

    function test_rename_revertsIfRenameToOwnLabel() public {
        vm.prank(alice);
        registry.register("alice");

        // Renaming to own current label reverts — label is still taken (by self)
        vm.expectRevert(
            abi.encodeWithSelector(MemberSubdomainRegistrar.SubdomainAlreadyTaken.selector, "alice")
        );
        vm.prank(alice);
        registry.rename("alice");
    }

    // -------------------------------------------------------------------------
    // Resolver delegation — member can set text records after registration
    // -------------------------------------------------------------------------

    function test_memberCanSetTextRecords() public {
        vm.prank(alice);
        registry.register("alice");

        bytes32 subnode = _subnode("alice");

        // Alice sets a text record directly on the resolver (per-node approval allows this)
        vm.prank(alice);
        resolver.setText(subnode, "avatar", "https://example.com/alice.png");

        assertEq(resolver.text(subnode, "avatar"), "https://example.com/alice.png");
    }

    function test_memberCannotSetOtherMembersRecords() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(bob);
        registry.register("bob");

        // Bob cannot set Alice's text records
        vm.expectRevert("MockResolver: not authorised");
        vm.prank(bob);
        resolver.setText(_subnode("alice"), "avatar", "hacked");
    }

    // -------------------------------------------------------------------------
    // Edge cases
    // -------------------------------------------------------------------------

    function test_reRegisterFreedLabel() public {
        // Alice registers, releases, Bob claims the same label
        vm.prank(alice);
        registry.register("shared");

        vm.prank(alice);
        registry.release();

        vm.prank(bob);
        registry.register("shared");

        assertTrue(registrar.isRegistered(bob));
        assertEq(registrar.labelOwner(keccak256("shared")), bob);
        assertEq(resolver.addr(_subnode("shared")), bob);
    }

    function test_clearRecordsOnRelease() public {
        vm.prank(alice);
        registry.register("alice");

        bytes32 subnode = _subnode("alice");

        // Alice sets text records
        vm.prank(alice);
        resolver.setText(subnode, "description", "original");

        // Release clears records (via version increment)
        vm.prank(alice);
        registry.release();

        // Text record is now empty (version incremented)
        assertEq(bytes(resolver.text(subnode, "description")).length, 0);
    }

    function test_noStaleRecordsAfterReRegister() public {
        vm.prank(alice);
        registry.register("label1");

        // Alice sets text records
        vm.prank(alice);
        resolver.setText(_subnode("label1"), "key", "alice-value");

        // Alice releases
        vm.prank(alice);
        registry.release();

        // Bob claims the same label
        vm.prank(bob);
        registry.register("label1");

        // Bob does NOT see Alice's old text records
        assertEq(bytes(resolver.text(_subnode("label1"), "key")).length, 0);
    }

    function test_revokeAndReRegister() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(revoker);
        registry.revoke(alice);

        // Alice can re-register after being revoked
        vm.prank(alice);
        registry.register("alice2");

        assertTrue(registrar.isRegistered(alice));
        assertEq(registrar.memberSubdomain(alice), "alice2");
    }

    function test_releaseThenRegisterNewLabel() public {
        vm.prank(alice);
        registry.register("first");

        vm.prank(alice);
        registry.release();

        vm.prank(alice);
        registry.register("second");

        assertEq(registrar.memberSubdomain(alice), "second");
        assertEq(registrar.labelOwner(keccak256("first")), address(0));
        assertEq(registrar.labelOwner(keccak256("second")), alice);
    }

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    function test_registrarInitialization() public {
        assertEq(address(registrar.ens()), address(ens));
        assertEq(registrar.node(), NODE);
        assertEq(registrar.resolver(), address(resolver));
    }

    function test_registryInitialization() public {
        assertEq(address(registry.registrar()), address(registrar));
    }

    function test_protocolVersion() public {
        uint8[3] memory version = registry.protocolVersion();
        assertEq(version[0], 1);
        assertEq(version[1], 4);
        assertEq(version[2], 0);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function _subnode(string memory label) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(NODE, keccak256(bytes(label))));
    }
}
