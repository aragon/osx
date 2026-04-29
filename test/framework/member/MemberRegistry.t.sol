// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {DaoUnauthorized} from "@aragon/osx-commons-contracts/src/permission/auth/auth.sol";
import {DAOMock} from "../../mocks/commons/dao/DAOMock.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {MemberRegistry} from "../../../src/framework/member/MemberRegistry.sol";
import {IMemberRegistry} from "../../../src/framework/member/IMemberRegistry.sol";
import {ENSDomain} from "../../../src/framework/utils/ens/ENSDomain.sol";
import {MockENS} from "./mocks/MockENS.sol";
import {MockResolver} from "./mocks/MockResolver.sol";

contract MemberRegistryTest is Test {
    // Local event declarations mirror IMemberRegistry's so that `emit` is
    // unqualified (avoids the qualified-event-access syntax which requires
    // solc >= 0.8.21). Solidity matches event topics by signature, so the
    // resulting topic hashes are identical to those emitted by the contract.
    event Registered(address indexed member, string subdomain);
    event Released(address indexed member, string subdomain);
    event SubdomainEvicted(address indexed member, address indexed evictor, string subdomain);
    event ProfileMoved(address indexed member, string oldSubdomain, string newSubdomain);

    DAOMock dao;
    MockENS ens;
    MockResolver resolver;
    MemberRegistry registry;

    string constant DOMAIN = "members.dao.eth";
    // namehash("members.dao.eth") — verified with `cast namehash members.dao.eth`
    bytes32 constant NODE = 0x8348de755e5deb9b453b8daddcebe62e81e1539508088eac81fd3ccbb23245d3;

    address alice = address(0xa11ce);
    address bob = address(0xb0b);
    address carol = address(0xca501);
    address evictor = address(0x3e40);

    function setUp() public {
        dao = new DAOMock();
        dao.setHasPermissionReturnValueMock(true);

        ens = new MockENS();
        ens.setOwner(bytes32(0), address(this)); // ENS root must have an owner
        resolver = new MockResolver(ENS(address(ens)));

        registry = MemberRegistry(
            address(
                new ERC1967Proxy(
                    address(new MemberRegistry()),
                    abi.encodeCall(
                        MemberRegistry.initialize, (IDAO(address(dao)), ENS(address(ens)), DOMAIN, address(resolver))
                    )
                )
            )
        );

        // The registry must own the parent ENS node
        ens.setOwner(NODE, address(registry));
    }

    // -------------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------------

    function test_register() public {
        vm.prank(alice);
        registry.register("alice");

        assertTrue(registry.isRegistered(alice));
        assertEq(registry.labelOwner(keccak256("alice")), alice);
        assertEq(registry.memberSubdomain(alice), "alice");

        bytes32 subnode = _subnode("alice");
        assertEq(ens.owner(subnode), address(registry));
        assertEq(resolver.addr(subnode), alice);
        assertTrue(resolver.isApprovedFor(address(registry), subnode, alice));
    }

    function test_register_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit Registered(alice, "alice");

        vm.prank(alice);
        registry.register("alice");
    }

    function test_register_multipleMembers() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(bob);
        registry.register("bob");

        assertTrue(registry.isRegistered(alice));
        assertTrue(registry.isRegistered(bob));
    }

    function test_register_hyphenAndDigits() public {
        vm.prank(alice);
        registry.register("alice-123");
        assertEq(registry.memberSubdomain(alice), "alice-123");
    }

    function test_register_revertsIfAlreadyRegistered() public {
        vm.prank(alice);
        registry.register("alice");

        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.AlreadyRegistered.selector, alice));
        vm.prank(alice);
        registry.register("other");
    }

    function test_register_revertsIfSubdomainTaken() public {
        vm.prank(alice);
        registry.register("taken");

        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.SubdomainAlreadyTaken.selector, "taken"));
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

    function test_register_revertsIfUnderscore() public {
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidSubdomain.selector, "al_ice"));
        vm.prank(alice);
        registry.register("al_ice");
    }

    function test_register_revertsIfTooLong() public {
        // 51 characters — exceeds MAX_SUBDOMAIN_LENGTH (50)
        string memory long = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidSubdomain.selector, long));
        vm.prank(alice);
        registry.register(long);
    }

    function test_register_maxLengthAccepted() public {
        // Exactly 50 characters — should succeed
        string memory maxLen = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        vm.prank(alice);
        registry.register(maxLen);
        assertTrue(registry.isRegistered(alice));
    }

    function test_register_revertsIfTooShort() public {
        // 2 characters — under MIN_SUBDOMAIN_LENGTH (3)
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidSubdomain.selector, "ab"));
        vm.prank(alice);
        registry.register("ab");
    }

    function test_register_revertsIfSingleChar() public {
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidSubdomain.selector, "a"));
        vm.prank(alice);
        registry.register("a");
    }

    function test_register_minLengthAccepted() public {
        // Exactly 3 characters — should succeed
        vm.prank(alice);
        registry.register("abc");
        assertTrue(registry.isRegistered(alice));
    }

    function test_register_revertsIfLeadingHyphen() public {
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidSubdomain.selector, "-alice"));
        vm.prank(alice);
        registry.register("-alice");
    }

    function test_register_revertsIfTrailingHyphen() public {
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidSubdomain.selector, "alice-"));
        vm.prank(alice);
        registry.register("alice-");
    }

    function test_register_revertsIfHyphenOnly() public {
        // Edge case: a single hyphen is both leading and trailing.
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidSubdomain.selector, "---"));
        vm.prank(alice);
        registry.register("---");
    }

    function test_register_midHyphenAllowed() public {
        vm.prank(alice);
        registry.register("al-ice");
        assertTrue(registry.isRegistered(alice));
    }

    // -------------------------------------------------------------------------
    // release
    // -------------------------------------------------------------------------

    function test_release() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(alice);
        registry.release();

        assertFalse(registry.isRegistered(alice));
        assertEq(registry.labelOwner(keccak256("alice")), address(0));
        assertEq(bytes(registry.memberSubdomain(alice)).length, 0);
        assertEq(ens.owner(_subnode("alice")), address(0));
        assertFalse(resolver.isApprovedFor(address(registry), _subnode("alice"), alice));
    }

    function test_release_emitsEvent() public {
        vm.prank(alice);
        registry.register("alice");

        vm.expectEmit(true, false, false, true);
        emit Released(alice, "alice");

        vm.prank(alice);
        registry.release();
    }

    function test_release_revertsIfNotRegistered() public {
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.NotRegistered.selector, alice));
        vm.prank(alice);
        registry.release();
    }

    // -------------------------------------------------------------------------
    // evict
    // -------------------------------------------------------------------------

    function test_evict() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(evictor);
        registry.evict("alice", address(0));

        assertFalse(registry.isRegistered(alice));
        assertEq(ens.owner(_subnode("alice")), address(0));
        assertEq(registry.labelOwner(keccak256("alice")), address(0));
    }

    function test_evict_emitsEvent() public {
        vm.prank(alice);
        registry.register("alice");

        vm.expectEmit(true, true, false, true);
        emit SubdomainEvicted(alice, evictor, "alice");

        vm.prank(evictor);
        registry.evict("alice", address(0));
    }

    function test_evict_clearsResolverRecords() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(evictor);
        registry.evict("alice", address(0));

        assertEq(resolver.addr(_subnode("alice")), address(0));
    }

    function test_evict_revertsWithoutPermission() public {
        vm.prank(alice);
        registry.register("alice");

        dao.setHasPermissionReturnValueMock(false);

        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(dao),
                address(registry),
                evictor,
                registry.EVICT_SUBDOMAIN_PERMISSION_ID()
            )
        );
        vm.prank(evictor);
        registry.evict("alice", address(0));
    }

    function test_evict_revertsIfSubdomainNotRegistered() public {
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.SubdomainNotRegistered.selector, "alice"));
        vm.prank(evictor);
        registry.evict("alice", address(0));
    }

    function test_evict_self() public {
        // Evictor is also a registered member and evicts themselves
        vm.prank(evictor);
        registry.register("evictor");

        vm.prank(evictor);
        registry.evict("evictor", address(0));

        assertFalse(registry.isRegistered(evictor));
        assertEq(ens.owner(_subnode("evictor")), address(0));
    }

    // evict — transfer to a new controller

    function test_evict_transfersToNewController() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(evictor);
        registry.evict("alice", bob);

        assertFalse(registry.isRegistered(alice));
        assertTrue(registry.isRegistered(bob));
        assertEq(registry.memberSubdomain(bob), "alice");
        assertEq(registry.labelOwner(keccak256("alice")), bob);
    }

    function test_evict_transferRebindsENSAndResolver() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(evictor);
        registry.evict("alice", bob);

        bytes32 subnode = _subnode("alice");
        assertEq(ens.owner(subnode), address(registry));
        assertEq(resolver.addr(subnode), bob);
        assertTrue(resolver.isApprovedFor(address(registry), subnode, bob));
        assertFalse(resolver.isApprovedFor(address(registry), subnode, alice));
    }

    function test_evict_transferEmitsEvictedAndRegistered() public {
        vm.prank(alice);
        registry.register("alice");

        vm.expectEmit(true, true, false, true);
        emit SubdomainEvicted(alice, evictor, "alice");
        vm.expectEmit(true, false, false, true);
        emit Registered(bob, "alice");

        vm.prank(evictor);
        registry.evict("alice", bob);
    }

    function test_evict_transferClearsPriorTextRecords() public {
        vm.prank(alice);
        registry.register("alice");

        bytes32 subnode = _subnode("alice");
        vm.prank(alice);
        resolver.setText(subnode, "key", "alice-value");

        vm.prank(evictor);
        registry.evict("alice", bob);

        // clearRecords bumps the resolver version — the old text is no longer reachable.
        assertEq(bytes(resolver.text(subnode, "key")).length, 0);
    }

    function test_evict_transferRevertsIfNewControllerEqualsCurrent() public {
        vm.prank(alice);
        registry.register("alice");

        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidNewController.selector, alice));
        vm.prank(evictor);
        registry.evict("alice", alice);
    }

    function test_evict_transferRevertsIfNewControllerAlreadyRegistered() public {
        vm.prank(alice);
        registry.register("alice");
        vm.prank(bob);
        registry.register("bob");

        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.AlreadyRegistered.selector, bob));
        vm.prank(evictor);
        registry.evict("alice", bob);

        // alice's claim and ENS state are untouched (atomic revert).
        assertTrue(registry.isRegistered(alice));
        assertEq(registry.labelOwner(keccak256("alice")), alice);
        assertEq(ens.owner(_subnode("alice")), address(registry));
    }

    function test_evict_transferAtomicityOnInnerRevert() public {
        // The transfer path goes _release → emit → _register. If _register reverts
        // (newController already registered), the whole tx reverts and alice is preserved.
        vm.prank(alice);
        registry.register("alice");
        vm.prank(bob);
        registry.register("bob");

        vm.prank(evictor);
        try registry.evict("alice", bob) {
            fail();
        } catch {
            // alice still owns "alice"; bob still owns "bob".
            assertTrue(registry.isRegistered(alice));
            assertEq(registry.memberSubdomain(alice), "alice");
            assertTrue(registry.isRegistered(bob));
            assertEq(registry.memberSubdomain(bob), "bob");
        }
    }

    function test_evict_transferAllowsThirdParty() public {
        // newController doesn't have to be a "known" address — anyone (carol) can be assigned.
        vm.prank(alice);
        registry.register("alice");

        vm.prank(evictor);
        registry.evict("alice", carol);

        assertTrue(registry.isRegistered(carol));
        assertEq(registry.memberSubdomain(carol), "alice");
    }

    // -------------------------------------------------------------------------
    // move
    // -------------------------------------------------------------------------

    function test_move() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(alice);
        registry.move("alice2");

        assertTrue(registry.isRegistered(alice));
        assertEq(registry.memberSubdomain(alice), "alice2");
        assertEq(registry.labelOwner(keccak256("alice2")), alice);
        assertEq(resolver.addr(_subnode("alice2")), alice);
        assertTrue(resolver.isApprovedFor(address(registry), _subnode("alice2"), alice));

        // Old label freed
        assertEq(registry.labelOwner(keccak256("alice")), address(0));
        assertEq(ens.owner(_subnode("alice")), address(0));
        assertFalse(resolver.isApprovedFor(address(registry), _subnode("alice"), alice));
    }

    function test_move_emitsEvent() public {
        vm.prank(alice);
        registry.register("alice");

        vm.expectEmit(true, false, false, true);
        emit ProfileMoved(alice, "alice", "alice2");

        vm.prank(alice);
        registry.move("alice2");
    }

    function test_move_revertsIfNotRegistered() public {
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.NotRegistered.selector, alice));
        vm.prank(alice);
        registry.move("newname");
    }

    function test_move_revertsIfNewLabelTaken() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(bob);
        registry.register("bob");

        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.SubdomainAlreadyTaken.selector, "bob"));
        vm.prank(alice);
        registry.move("bob");
    }

    function test_move_revertsIfInvalidSubdomain() public {
        vm.prank(alice);
        registry.register("alice");

        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidSubdomain.selector, ""));
        vm.prank(alice);
        registry.move("");
    }

    function test_move_revertsIfMoveToOwnLabel() public {
        vm.prank(alice);
        registry.register("alice");

        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.SubdomainAlreadyTaken.selector, "alice"));
        vm.prank(alice);
        registry.move("alice");
    }

    function test_move_eventStringsCorrectAfterMultipleMoves() public {
        vm.prank(alice);
        registry.register("first");

        vm.expectEmit(true, false, false, true);
        emit ProfileMoved(alice, "first", "second");
        vm.prank(alice);
        registry.move("second");

        vm.expectEmit(true, false, false, true);
        emit ProfileMoved(alice, "second", "third");
        vm.prank(alice);
        registry.move("third");

        assertEq(registry.memberSubdomain(alice), "third");
    }

    function test_move_revertsIfTooLong() public {
        vm.prank(alice);
        registry.register("alice");

        string memory long = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // 51
        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidSubdomain.selector, long));
        vm.prank(alice);
        registry.move(long);
    }

    // -------------------------------------------------------------------------
    // Resolver delegation
    // -------------------------------------------------------------------------

    function test_memberCanSetTextRecords() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(alice);
        resolver.setText(_subnode("alice"), "avatar", "https://example.com/alice.png");

        assertEq(resolver.text(_subnode("alice"), "avatar"), "https://example.com/alice.png");
    }

    function test_memberCannotSetOtherMembersRecords() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(bob);
        registry.register("bob");

        vm.expectRevert("MockResolver: not authorised");
        vm.prank(bob);
        resolver.setText(_subnode("alice"), "avatar", "hacked");
    }

    // -------------------------------------------------------------------------
    // Edge cases
    // -------------------------------------------------------------------------

    function test_reRegisterFreedLabel() public {
        vm.prank(alice);
        registry.register("shared");

        vm.prank(alice);
        registry.release();

        vm.prank(bob);
        registry.register("shared");

        assertTrue(registry.isRegistered(bob));
        assertEq(registry.labelOwner(keccak256("shared")), bob);
        assertEq(resolver.addr(_subnode("shared")), bob);
    }

    function test_clearRecordsOnRelease() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(alice);
        resolver.setText(_subnode("alice"), "description", "original");

        vm.prank(alice);
        registry.release();

        assertEq(bytes(resolver.text(_subnode("alice"), "description")).length, 0);
    }

    function test_noStaleRecordsAfterReRegister() public {
        vm.prank(alice);
        registry.register("label1");

        vm.prank(alice);
        resolver.setText(_subnode("label1"), "key", "alice-value");

        vm.prank(alice);
        registry.release();

        vm.prank(bob);
        registry.register("label1");

        assertEq(bytes(resolver.text(_subnode("label1"), "key")).length, 0);
    }

    function test_evictAndReRegister() public {
        vm.prank(alice);
        registry.register("alice");

        vm.prank(evictor);
        registry.evict("alice", address(0));

        vm.prank(alice);
        registry.register("alice2");

        assertTrue(registry.isRegistered(alice));
        assertEq(registry.memberSubdomain(alice), "alice2");
    }

    function test_releaseThenRegisterNewLabel() public {
        vm.prank(alice);
        registry.register("first");

        vm.prank(alice);
        registry.release();

        vm.prank(alice);
        registry.register("second");

        assertEq(registry.memberSubdomain(alice), "second");
        assertEq(registry.labelOwner(keccak256("first")), address(0));
        assertEq(registry.labelOwner(keccak256("second")), alice);
    }

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    function test_initialization() public view {
        assertEq(address(registry.ens()), address(ens));
        assertEq(registry.parentNode(), NODE);
        assertEq(registry.parentDomain(), DOMAIN);
        assertEq(registry.resolver(), address(resolver));
    }

    function test_initialize_parentNodeMatchesParentDomainNamehash() public view {
        // The on-chain namehash must match the off-chain precomputed constant.
        assertEq(registry.parentNode(), ENSDomain.namehash(DOMAIN));
        assertEq(registry.parentNode(), NODE);
    }

    function test_parentDomain_returnsConfiguredString() public {
        // Deploy a second registry with a different parent domain to ensure the
        // getter reflects whatever was configured, not a hardcoded value.
        string memory other = "delegates.aragon.eth";
        MemberRegistry otherRegistry = MemberRegistry(
            address(
                new ERC1967Proxy(
                    address(new MemberRegistry()),
                    abi.encodeCall(
                        MemberRegistry.initialize, (IDAO(address(dao)), ENS(address(ens)), other, address(resolver))
                    )
                )
            )
        );
        assertEq(otherRegistry.parentDomain(), other);
        assertEq(otherRegistry.parentNode(), ENSDomain.namehash(other));
    }

    function test_initialize_revertsIfZeroManagementDao() public {
        MemberRegistry impl = new MemberRegistry();

        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidManagementDao.selector, address(0)));
        new ERC1967Proxy(
            address(impl),
            abi.encodeCall(MemberRegistry.initialize, (IDAO(address(0)), ENS(address(ens)), DOMAIN, address(resolver)))
        );
    }

    function test_initialize_revertsIfInvalidENS() public {
        MockENS emptyENS = new MockENS(); // root has no owner
        MemberRegistry impl = new MemberRegistry();

        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidENSRegistry.selector, address(emptyENS)));
        new ERC1967Proxy(
            address(impl),
            abi.encodeCall(
                MemberRegistry.initialize, (IDAO(address(dao)), ENS(address(emptyENS)), DOMAIN, address(resolver))
            )
        );
    }

    function test_initialize_revertsIfEmptyDomain() public {
        MemberRegistry impl = new MemberRegistry();

        vm.expectRevert(abi.encodeWithSelector(IMemberRegistry.InvalidDomain.selector, ""));
        new ERC1967Proxy(
            address(impl),
            abi.encodeCall(
                MemberRegistry.initialize, (IDAO(address(dao)), ENS(address(ens)), string(""), address(resolver))
            )
        );
    }

    function test_initialize_revertsIfDoubleInit() public {
        vm.expectRevert("Initializable: contract is already initialized");
        registry.initialize(IDAO(address(dao)), ENS(address(ens)), DOMAIN, address(resolver));
    }

    function test_protocolVersion() public view {
        uint8[3] memory version = registry.protocolVersion();
        assertEq(version[0], 1);
        assertEq(version[1], 4);
        assertEq(version[2], 0);
    }

    // -------------------------------------------------------------------------
    // register with records
    // -------------------------------------------------------------------------

    function test_registerWithRecords() public {
        IMemberRegistry.TextRecord[] memory texts = new IMemberRegistry.TextRecord[](2);
        texts[0] = IMemberRegistry.TextRecord("avatar", "https://example.com/alice.png");
        texts[1] = IMemberRegistry.TextRecord("description", "Aragon delegate");

        IMemberRegistry.Records memory records = IMemberRegistry.Records({
            textRecords: texts,
            addr: address(0), // default to msg.sender
            contenthash: hex"e3010170122029f2d17be6139079dc48696d1f582a8530eb9805b561eda517e22a892c7e3f1f"
        });

        vm.prank(alice);
        registry.register("alice", records);

        assertTrue(registry.isRegistered(alice));

        bytes32 subnode = _subnode("alice");
        assertEq(resolver.addr(subnode), alice);
        assertEq(resolver.text(subnode, "avatar"), "https://example.com/alice.png");
        assertEq(resolver.text(subnode, "description"), "Aragon delegate");
        assertEq(
            resolver.contenthash(subnode),
            hex"e3010170122029f2d17be6139079dc48696d1f582a8530eb9805b561eda517e22a892c7e3f1f"
        );
    }

    function test_registerWithRecords_customAddr() public {
        address coldWallet = address(0xC01D);

        IMemberRegistry.Records memory records = IMemberRegistry.Records({
            textRecords: new IMemberRegistry.TextRecord[](0), addr: coldWallet, contenthash: ""
        });

        vm.prank(alice);
        registry.register("alice", records);

        assertEq(resolver.addr(_subnode("alice")), coldWallet);
    }

    function test_registerWithRecords_emptyRecords() public {
        // Empty records = same as simple register()
        IMemberRegistry.Records memory records = IMemberRegistry.Records({
            textRecords: new IMemberRegistry.TextRecord[](0), addr: address(0), contenthash: ""
        });

        vm.prank(alice);
        registry.register("alice", records);

        assertTrue(registry.isRegistered(alice));
        assertEq(resolver.addr(_subnode("alice")), alice);
    }

    // -------------------------------------------------------------------------
    // move with records
    // -------------------------------------------------------------------------

    function test_moveWithRecords() public {
        vm.prank(alice);
        registry.register("alice");

        // Alice sets records on old subdomain
        bytes32 oldSubnode = _subnode("alice");
        vm.prank(alice);
        resolver.setText(oldSubnode, "avatar", "https://example.com/old.png");
        vm.prank(alice);
        resolver.setText(oldSubnode, "description", "Old bio");

        // Move and carry records over
        IMemberRegistry.TextRecord[] memory texts = new IMemberRegistry.TextRecord[](2);
        texts[0] = IMemberRegistry.TextRecord("avatar", "https://example.com/old.png");
        texts[1] = IMemberRegistry.TextRecord("description", "Updated bio");

        IMemberRegistry.Records memory records =
            IMemberRegistry.Records({textRecords: texts, addr: address(0), contenthash: ""});

        vm.prank(alice);
        registry.move("alice2", records);

        // New subnode has the carried-over records
        bytes32 newSubnode = _subnode("alice2");
        assertEq(resolver.text(newSubnode, "avatar"), "https://example.com/old.png");
        assertEq(resolver.text(newSubnode, "description"), "Updated bio");
        assertEq(resolver.addr(newSubnode), alice);

        // Old subnode records are cleared
        assertEq(bytes(resolver.text(oldSubnode, "avatar")).length, 0);
    }

    function test_moveWithRecords_customAddr() public {
        address coldWallet = address(0xC01D);

        vm.prank(alice);
        registry.register("alice");

        IMemberRegistry.Records memory records = IMemberRegistry.Records({
            textRecords: new IMemberRegistry.TextRecord[](0), addr: coldWallet, contenthash: ""
        });

        vm.prank(alice);
        registry.move("alice2", records);

        assertEq(resolver.addr(_subnode("alice2")), coldWallet);
    }

    function test_moveWithRecords_contenthash() public {
        vm.prank(alice);
        registry.register("alice");

        bytes memory ipfs = hex"e3010170122029f2d17be6139079dc48696d1f582a8530eb9805b561eda517e22a892c7e3f1f";

        IMemberRegistry.Records memory records = IMemberRegistry.Records({
            textRecords: new IMemberRegistry.TextRecord[](0), addr: address(0), contenthash: ipfs
        });

        vm.prank(alice);
        registry.move("alice2", records);

        assertEq(resolver.contenthash(_subnode("alice2")), ipfs);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function _subnode(string memory label) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(NODE, keccak256(bytes(label))));
    }
}
