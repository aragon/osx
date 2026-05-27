// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {ENSRegistry} from "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ENSSubdomainRegistrar} from "../../../../src/framework/utils/ens/ENSSubdomainRegistrar.sol";
import {IDAO} from "../../../../src/common/dao/IDAO.sol";
import {DaoUnauthorized} from "../../../../src/common/permission/auth/auth.sol";
import {DAOMock} from "../../../mocks/commons/dao/DAOMock.sol";
import {MockResolver} from "../../member/mocks/MockResolver.sol";

/// @notice Direct tests for `ENSSubdomainRegistrar` in
/// `src/framework/utils/ens/ENSSubdomainRegistrar.sol`.
///
/// Ports `packages/contracts/test/framework/utils/ens/ens-subdomain-registry.ts`
/// (564 lines, 28 cases) using the real `ENSRegistry` from the ens-contracts
/// submodule (so the `authorised` modifier on `setSubnodeOwner` / `setResolver`
/// is exercised), and the minimal local `MockResolver` (the real
/// `PublicResolver` pulls in the ensdomains/buffer package which is not
/// vendored here; `MockResolver` exposes the only resolver method the
/// registrar calls: `setAddr(bytes32, address)`, gated by node ownership).
contract ENSSubdomainRegistrarTest is Test {
    bytes32 internal constant REGISTER_PERMISSION_ID = keccak256("REGISTER_ENS_SUBDOMAIN_PERMISSION");

    // namehash("test"), namehash("test2"), namehash("my.test"). Verified via `cast namehash`.
    bytes32 internal constant TEST_NODE = 0x04f740db81dc36c853ab4205bddd785f46e79ccedca351fc6dfcbd8cc9a33dd6;
    bytes32 internal constant TEST2_NODE = 0x4e40f6e0b682912885261b48c6a9ba4f76aac8f74cb47354d0508b49a6c988d8;
    bytes32 internal constant MY_TEST_NODE = 0x8834dc600444c280d7c51f15bc14777069771166fd9427bb40f11ab21bc00bbc;

    bytes32 internal constant TEST_LABEL = keccak256("test");
    bytes32 internal constant TEST2_LABEL = keccak256("test2");
    bytes32 internal constant MY_LABEL = keccak256("my");
    bytes32 internal constant MY2_LABEL = keccak256("my2");

    DAOMock internal managingDao;
    ENSRegistry internal ens;
    MockResolver internal resolver;
    ENSSubdomainRegistrar internal registrar;
    ENSSubdomainRegistrar internal impl;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal target = makeAddr("target");

    function setUp() public {
        managingDao = new DAOMock();
        managingDao.setHasPermissionReturnValueMock(true);

        // ENSRegistry's constructor sets msg.sender (== this test contract) as
        // the root owner. That mirrors the TS suite's `signers[0]`.
        ens = new ENSRegistry();
        resolver = new MockResolver(ENS(address(ens)));

        impl = new ENSSubdomainRegistrar();
        registrar = ENSSubdomainRegistrar(address(new ERC1967Proxy(address(impl), "")));
    }

    /// Register `label.<parent>` with the chosen owner and the shared
    /// resolver. The caller must own the parent (or be an operator).
    function _registerParentDomain(bytes32 _parent, bytes32 _label, address _owner) internal {
        ens.setSubnodeRecord(_parent, _label, _owner, address(resolver), 0);
    }

    // -------------------------------------------------------------------------
    // Initial ENS state
    // -------------------------------------------------------------------------

    function test_initialState_unregisteredDomainOwnerIsZero() public view {
        assertEq(ens.owner(TEST_NODE), address(0));
    }

    function test_initialState_unregisteredDomainResolvesToZero() public view {
        assertEq(resolver.addr(TEST_NODE), address(0));
    }

    // -------------------------------------------------------------------------
    // Scenario A — Registrar IS the domain owner
    // -------------------------------------------------------------------------

    function _setupScenarioOwner() internal {
        _registerParentDomain(bytes32(0), TEST_LABEL, address(registrar));
    }

    function _initAsOwner() internal {
        _setupScenarioOwner();
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST_NODE);
    }

    function test_owner_initializesCorrectly() public {
        _setupScenarioOwner();
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST_NODE);
        assertEq(registrar.resolver(), address(resolver));
        assertEq(registrar.node(), TEST_NODE);
        assertEq(address(registrar.ens()), address(ens));
        assertEq(address(registrar.dao()), address(managingDao));
    }

    function test_owner_revertsIfRegistrarLacksOwnership() public {
        // Set up 'test2' owned by alice. Init the registrar against 'test2' —
        // init succeeds (resolver is set), but subsequent registerSubnode
        // reverts because the registrar is not the node owner. ENSRegistry's
        // `authorised` modifier on `setSubnodeOwner` enforces this.
        _registerParentDomain(bytes32(0), TEST2_LABEL, alice);
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST2_NODE);

        vm.expectRevert();
        registrar.registerSubnode(MY_LABEL, target);
    }

    function test_owner_revertsIfOwnershipRemovedMidStream() public {
        // Parent owned by registrar; init + one successful register.
        _initAsOwner();
        registrar.registerSubnode(MY_LABEL, target);

        // Move parent ownership away from the registrar. ENSRegistry now
        // rejects any further `setSubnodeOwner` from the registrar.
        vm.prank(address(registrar));
        ens.setOwner(TEST_NODE, alice);

        bytes32 subnode2 = keccak256(abi.encodePacked(TEST_NODE, MY2_LABEL));
        assertEq(ens.owner(subnode2), address(0));

        vm.expectRevert();
        registrar.registerSubnode(MY2_LABEL, target);

        // The second subnode was never claimed — ENS state stays untouched.
        assertEq(ens.owner(subnode2), address(0), "subnode2 owner not written on revert");
    }

    function test_postInit_revertsIfInitializedTwice() public {
        _setupScenarioOwner();
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST_NODE);
        vm.expectRevert("Initializable: contract is already initialized");
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST_NODE);
    }

    function test_postInit_revertsRegisterSubnodeWithoutPermission() public {
        _setupScenarioOwner();
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST_NODE);
        managingDao.setHasPermissionReturnValueMock(false);

        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector, address(managingDao), address(registrar), bob, REGISTER_PERMISSION_ID
            )
        );
        vm.prank(bob);
        registrar.registerSubnode(MY_LABEL, target);
    }

    function test_postInit_revertsSetDefaultResolverWithoutPermission() public {
        _setupScenarioOwner();
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST_NODE);
        managingDao.setHasPermissionReturnValueMock(false);

        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector, address(managingDao), address(registrar), bob, REGISTER_PERMISSION_ID
            )
        );
        vm.prank(bob);
        registrar.setDefaultResolver(address(0xCAFE));
    }

    // -------------------------------------------------------------------------
    // Scenario A — after permission granted: register subnodes
    // -------------------------------------------------------------------------

    function test_registerSubnode_resolvesToTarget() public {
        _initAsOwner();
        registrar.registerSubnode(MY_LABEL, target);

        // Subdomain is owned by the registrar (per the source contract design).
        assertEq(ens.owner(MY_TEST_NODE), address(registrar));
        assertEq(resolver.addr(MY_TEST_NODE), target);
    }

    function test_registerSubnode_revertsIfAlreadyRegisteredByOtherCaller() public {
        _initAsOwner();
        vm.prank(bob);
        registrar.registerSubnode(MY_LABEL, target);

        vm.expectRevert(
            abi.encodeWithSelector(ENSSubdomainRegistrar.AlreadyRegistered.selector, MY_TEST_NODE, address(registrar))
        );
        vm.prank(carol);
        registrar.registerSubnode(MY_LABEL, target);
    }

    function test_registerSubnode_revertsIfAlreadyRegisteredBySameCaller() public {
        _initAsOwner();
        vm.prank(bob);
        registrar.registerSubnode(MY_LABEL, target);

        vm.expectRevert(
            abi.encodeWithSelector(ENSSubdomainRegistrar.AlreadyRegistered.selector, MY_TEST_NODE, address(registrar))
        );
        vm.prank(bob);
        registrar.registerSubnode(MY_LABEL, target);
    }

    function test_registerSubnode_multipleDifferentLabelsSucceed() public {
        _initAsOwner();
        registrar.registerSubnode(MY_LABEL, target);
        registrar.registerSubnode(MY2_LABEL, alice);

        bytes32 subnode2 = keccak256(abi.encodePacked(TEST_NODE, MY2_LABEL));
        assertEq(ens.owner(MY_TEST_NODE), address(registrar));
        assertEq(ens.owner(subnode2), address(registrar));
        assertEq(resolver.addr(MY_TEST_NODE), target);
        assertEq(resolver.addr(subnode2), alice);
    }

    function test_setDefaultResolver_revertsIfZero() public {
        _initAsOwner();
        vm.expectRevert(abi.encodeWithSelector(ENSSubdomainRegistrar.InvalidResolver.selector, TEST_NODE, address(0)));
        registrar.setDefaultResolver(address(0));
    }

    function test_setDefaultResolver_setsValue() public {
        _initAsOwner();
        address newResolver = makeAddr("newResolver");
        registrar.setDefaultResolver(newResolver);
        assertEq(registrar.resolver(), newResolver);
    }

    // -------------------------------------------------------------------------
    // Scenario B — Registrar is operator-approved by parent owner
    // -------------------------------------------------------------------------

    function _setupScenarioApproved() internal {
        _registerParentDomain(bytes32(0), TEST_LABEL, alice);
        vm.prank(alice);
        ens.setApprovalForAll(address(registrar), true);
    }

    function test_approved_initializesCorrectly() public {
        _setupScenarioApproved();
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST_NODE);
        assertEq(registrar.resolver(), address(resolver));
        assertEq(registrar.node(), TEST_NODE);
    }

    function test_approved_revertsIfApprovalRemoved() public {
        _setupScenarioApproved();
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST_NODE);

        // First registration succeeds (registrar is operator).
        registrar.registerSubnode(MY_LABEL, target);

        // Remove the operator approval.
        vm.prank(alice);
        ens.setApprovalForAll(address(registrar), false);

        vm.expectRevert();
        registrar.registerSubnode(MY2_LABEL, target);
    }

    function test_approved_postInit_revertsIfInitializedTwice() public {
        _setupScenarioApproved();
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST_NODE);
        vm.expectRevert("Initializable: contract is already initialized");
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST_NODE);
    }

    function test_approved_registerSubnodeAfterPermissionGranted() public {
        _setupScenarioApproved();
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST_NODE);

        vm.prank(bob);
        registrar.registerSubnode(MY_LABEL, target);
        assertEq(resolver.addr(MY_TEST_NODE), target);
    }

    // -------------------------------------------------------------------------
    // Scenario C — Registrar lacks both ownership AND approval
    // -------------------------------------------------------------------------

    function test_noRights_revertsInitWithoutResolver() public {
        // 'test2' has no resolver record at all. Init reverts with the
        // explicit `InvalidResolver` custom error.
        vm.expectRevert(abi.encodeWithSelector(ENSSubdomainRegistrar.InvalidResolver.selector, TEST2_NODE, address(0)));
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST2_NODE);
    }

    function test_noRights_revertsRegisterSubnodeBeforeInit() public {
        // Without init, `dao()` returns address(0) and the `auth` modifier
        // call reverts when trying to staticcall the zero address.
        vm.expectRevert();
        vm.prank(bob);
        registrar.registerSubnode(MY_LABEL, target);
    }

    function test_noRights_revertsSetDefaultResolverBeforeInit() public {
        vm.expectRevert();
        vm.prank(bob);
        registrar.setDefaultResolver(address(0xCAFE));
    }

    // -------------------------------------------------------------------------
    // registerSubnode — atomicity when the resolver reverts mid-stream
    // -------------------------------------------------------------------------

    /// `registerSubnode` performs three ENS writes in sequence:
    /// 1. `ens.setSubnodeOwner(node, label, address(this))`
    /// 2. `ens.setResolver(subnode, resolver)`
    /// 3. `Resolver(resolver).setAddr(subnode, target)`
    ///
    /// If step 3 reverts (a malicious or misconfigured resolver), the EVM
    /// rolls back steps 1 and 2 — confirm by checking that the subnode's
    /// owner stays at zero and no half-state remains where the registrar
    /// owns the subnode but no addr resolves.
    function test_registerSubnode_revertsAndRollsBackIfResolverReverts() public {
        _initAsOwner();

        // Etch a "resolver" that always reverts cleanly (REVERT with no data).
        // Avoids INVALID's gas-burn so the test stays fast.
        address badResolver = makeAddr("bad-resolver");
        vm.etch(badResolver, hex"60006000fd"); // PUSH1 0, PUSH1 0, REVERT
        registrar.setDefaultResolver(badResolver);

        bytes32 subnode = keccak256(abi.encodePacked(TEST_NODE, MY_LABEL));
        assertEq(ens.owner(subnode), address(0));

        vm.expectRevert();
        registrar.registerSubnode(MY_LABEL, target);

        // The whole-tx revert rolled back the `setSubnodeOwner` write too.
        assertEq(ens.owner(subnode), address(0), "subnode owner must be rolled back");
    }

    // -------------------------------------------------------------------------
    // _authorizeUpgrade — UPGRADE_REGISTRAR permission gate
    // -------------------------------------------------------------------------

    /// Caller without `UPGRADE_REGISTRAR_PERMISSION_ID` cannot upgrade.
    function test_authorizeUpgrade_revertsWithoutPermission() public {
        _initAsOwner();
        managingDao.setHasPermissionReturnValueMock(false);

        ENSSubdomainRegistrar nextImpl = new ENSSubdomainRegistrar();
        vm.expectRevert();
        vm.prank(alice);
        registrar.upgradeTo(address(nextImpl));
    }

    /// With the right permission, upgrade lands — the ERC1967 implementation
    /// slot updates to the new impl address.
    function test_authorizeUpgrade_succeedsWithPermission() public {
        _initAsOwner();

        ENSSubdomainRegistrar nextImpl = new ENSSubdomainRegistrar();
        registrar.upgradeTo(address(nextImpl));

        bytes32 IMPL_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
        bytes32 raw = vm.load(address(registrar), IMPL_SLOT);
        assertEq(address(uint160(uint256(raw))), address(nextImpl));
    }

    // -------------------------------------------------------------------------
    // Storage gap drift detector
    // -------------------------------------------------------------------------

    /// `uint256[47] __gap` at the tail of the layout. Probe a slot deep
    /// enough to be inside the gap on the current layout; should be zero
    /// on a fresh deploy. If the gap shrinks without a major-version bump,
    /// this catches the collision.
    function test_storageGap_sentinelSlotIsUnused() public {
        _initAsOwner();
        bytes32 sentinel = bytes32(uint256(250));
        bytes32 raw = vm.load(address(registrar), sentinel);
        assertEq(uint256(raw), 0, "gap slot 250 should be unused");
    }
}
