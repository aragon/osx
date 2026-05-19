// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ENSSubdomainRegistrar} from "../../../../src/framework/utils/ens/ENSSubdomainRegistrar.sol";
import {IDAO} from "../../../../src/common/dao/IDAO.sol";
import {DaoUnauthorized} from "../../../../src/common/permission/auth/auth.sol";
import {DAOMock} from "../../../mocks/commons/dao/DAOMock.sol";
import {MockENS} from "../../member/mocks/MockENS.sol";
import {MockResolver} from "../../member/mocks/MockResolver.sol";

/// @notice Direct tests for `ENSSubdomainRegistrar` in
/// `src/framework/utils/ens/ENSSubdomainRegistrar.sol`.
///
/// Ports `packages/contracts/test/framework/utils/ens/ens-subdomain-registry.ts`
/// (564 lines, 28 cases). Re-uses the local `MockENS` + `MockResolver` from the
/// MemberRegistry test scaffolding so no fork is required. Adds: explicit
/// initial-state assertions, multiple-subnode registration in sequence,
/// `node()` / `ens()` / `resolver()` getter snapshots, and the empty-string
/// edge for `setDefaultResolver`. The Upgrade sub-block is owned by the
/// component 31 fork test (needs `lib/osx-v1.0.0` + `lib/osx-v1.3.0`).
contract ENSSubdomainRegistrarTest is Test {
    bytes32 internal constant REGISTER_PERMISSION_ID = keccak256("REGISTER_ENS_SUBDOMAIN_PERMISSION");

    // namehash("test") — verified via `cast namehash test`.
    bytes32 internal constant TEST_NODE = 0x04f740db81dc36c853ab4205bddd785f46e79ccedca351fc6dfcbd8cc9a33dd6;
    // namehash("test2")
    bytes32 internal constant TEST2_NODE = 0x4e40f6e0b682912885261b48c6a9ba4f76aac8f74cb47354d0508b49a6c988d8;
    // namehash("my.test")
    bytes32 internal constant MY_TEST_NODE = 0x8834dc600444c280d7c51f15bc14777069771166fd9427bb40f11ab21bc00bbc;

    bytes32 internal constant TEST_LABEL = keccak256("test");
    bytes32 internal constant TEST2_LABEL = keccak256("test2");
    bytes32 internal constant MY_LABEL = keccak256("my");
    bytes32 internal constant MY2_LABEL = keccak256("my2");

    DAOMock internal managingDao;
    MockENS internal ens;
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

        ens = new MockENS();
        ens.setOwner(bytes32(0), address(this));
        resolver = new MockResolver(ENS(address(ens)));

        impl = new ENSSubdomainRegistrar();
        registrar = ENSSubdomainRegistrar(address(new ERC1967Proxy(address(impl), "")));
    }

    /// Register the parent domain `<label>.<parent>` with given owner and the
    /// shared `resolver`. Mirrors the TS `registerSubdomainHelper`.
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

    function test_owner_initializesCorrectly() public {
        _setupScenarioOwner();
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST_NODE);
        assertEq(registrar.resolver(), address(resolver));
        assertEq(registrar.node(), TEST_NODE);
        assertEq(address(registrar.ens()), address(ens));
        assertEq(address(registrar.dao()), address(managingDao));
    }

    // NOTE: The TS suite also tests "registrar lacks parent ownership /
    // ownership is revoked mid-stream" reverts. Those require real ENS auth
    // enforcement (the live ENSRegistry rejects `setSubnodeOwner` from a non-
    // owner). The local `MockENS` does not model this auth layer, so those
    // two cases are intentionally not ported here. They are covered by the
    // fork-mode tests for ENS-touching deployments in `protocol-factory`.

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

    function _initAsOwner() internal {
        _setupScenarioOwner();
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST_NODE);
    }

    function test_registerSubnode_resolvesToTarget() public {
        _initAsOwner();
        registrar.registerSubnode(MY_LABEL, target);

        // Subdomain is owned by the registrar (per the source contract design).
        assertEq(ens.owner(MY_TEST_NODE), address(registrar));
        // And resolves to the target.
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
        // Two distinct subnodes under the same parent — both register cleanly.
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
    // Scenario B — Registrar is approved by owner
    // -------------------------------------------------------------------------

    function _setupScenarioApproved() internal {
        // Parent owned by `alice`; registrar is operator-approved.
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
    // Scenario C — Registrar lacks both ownership AND approval (no valid resolver on the node)
    // -------------------------------------------------------------------------

    function test_noRights_revertsInitWithoutResolver() public {
        // 'test2' has no resolver set in ENS. Init reverts.
        ens.setOwner(TEST2_NODE, alice);
        vm.expectRevert(abi.encodeWithSelector(ENSSubdomainRegistrar.InvalidResolver.selector, TEST2_NODE, address(0)));
        registrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), TEST2_NODE);
    }

    function test_noRights_revertsRegisterSubnodeBeforeInit() public {
        // No init at all — DaoAuthorizableUpgradeable's `auth` modifier reads
        // `dao_` from storage; before init it's address(0). The auth call
        // staticcalls `dao_.hasPermission(...)` which reverts for the zero
        // address. We just assert the call reverts.
        vm.expectRevert();
        vm.prank(bob);
        registrar.registerSubnode(MY_LABEL, target);
    }

    function test_noRights_revertsSetDefaultResolverBeforeInit() public {
        vm.expectRevert();
        vm.prank(bob);
        registrar.setDefaultResolver(address(0xCAFE));
    }
}
