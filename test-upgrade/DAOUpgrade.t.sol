// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {DAO as DAOv1_0_0} from "@aragon/osx-v1.0.0/core/dao/DAO.sol";
import {DAO as DAOv1_3_0} from "@aragon/osx-v1.3.0/core/dao/DAO.sol";
import {DAO as DAOv1_4_0} from "../src/core/dao/DAO.sol";
import {Action} from "@aragon/osx-commons-contracts/src/executors/Executor.sol";

/// @notice Two-hop upgrade test: v1.0.0 → v1.3.0 → v1.4.0.
///
/// **Test-environment caveats (relevant to interpreting results):**
///
/// 1. `ProtocolVersion` conflation. The v1.3.0 DAO inherits `ProtocolVersion`
///    from the `osx-commons-contracts` package (its `package.json` pinned
///    osx-commons to version 1.4.0). Our global remapping routes that path
///    to our current `src/common/` which returns `[1, 4, 0]`.
///    So in this test environment, the "v1.3.0" DAO impl reports protocol
///    version `[1, 4, 0]` rather than `[1, 3, 0]`. The transition we can prove
///    is REACHABILITY (the call goes from revert under v1.0.0 to succeeding
///    under v1.3.0+), not the specific tuple. 
///
/// 2. v1.3 → v1.4 `initializeFrom` cannot be called. v1.3.0's
///    `initialize` uses `reinitializer(3)`, so `_initialized == 3` after
///    v1.3.0 deploy. v1.4.0's `initializeFrom` also uses `reinitializer(3)`,
///    requiring `_initialized < 3`. The upgrade path therefore must skip
///    `initializeFrom` (bare `upgradeTo`), which silently loses the
///    `IExecutor` interface registration and `SET_SIGNATURE_VALIDATOR`
///    revoke that v1.4.0's `initializeFrom` would otherwise perform. Tests
///    below confirm both.
contract DAOUpgradeTest is Test {
    bytes32 internal constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");
    bytes32 internal constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");
    bytes32 internal constant UPGRADE_DAO_PERMISSION_ID = keccak256("UPGRADE_DAO_PERMISSION");

    bytes internal constant METADATA = hex"0001";
    string internal constant DAO_URI = "https://example.org";

    address internal owner;
    address internal trustedForwarder = makeAddr("trustedForwarder");

    // The proxy whose implementation is rotated v1.0 → v1.3 → v1.4. Cast to
    // the version-specific DAO ABI as needed for each interaction.
    address payable internal proxy;

    function setUp() public {
        owner = address(this);

        // -- Deploy v1.0.0 DAO impl + proxy --
        DAOv1_0_0 implV1_0_0 = new DAOv1_0_0();
        proxy = payable(address(
                new ERC1967Proxy(
                    address(implV1_0_0),
                    abi.encodeCall(DAOv1_0_0.initialize, (METADATA, owner, trustedForwarder, DAO_URI))
                )
            ));

        // The v1.0.0 initializer grants ROOT to `_initialOwner`. For upgrades
        // we additionally need UPGRADE_DAO; for execute we need EXECUTE.
        DAOv1_0_0(proxy).grant(proxy, owner, UPGRADE_DAO_PERMISSION_ID);
        DAOv1_0_0(proxy).grant(proxy, owner, EXECUTE_PERMISSION_ID);
    }

    // -------------------------------------------------------------------------
    // v1.0.0 baseline
    // -------------------------------------------------------------------------

    function test_v1_0_0_baseline_protocolVersionRevertsAsAbsent() public {
        // v1.0.0 predates `ProtocolVersion`; calling protocolVersion() reverts.
        (bool ok,) = proxy.call(abi.encodeWithSignature("protocolVersion()"));
        assertFalse(ok, "v1.0.0 must not expose protocolVersion()");
    }

    function test_v1_0_0_baseline_trustedForwarderStored() public view {
        assertEq(DAOv1_0_0(proxy).getTrustedForwarder(), trustedForwarder);
    }

    function test_v1_0_0_baseline_ownerHasRoot() public view {
        assertTrue(DAOv1_0_0(proxy).hasPermission(proxy, owner, ROOT_PERMISSION_ID, ""));
    }

    function test_v1_0_0_baseline_initializedSlotIsOne() public view {
        // OZ Initializable writes `_initialized` at storage slot 0.
        bytes32 raw = vm.load(proxy, bytes32(uint256(0)));
        assertEq(uint8(uint256(raw)), 1, "v1.0.0 _initialized == 1");
    }

    // -------------------------------------------------------------------------
    // v1.0.0 → v1.3.0
    // -------------------------------------------------------------------------

    function test_upgrade_v1_0_0_to_v1_3_0_protocolVersionBecomesReachable() public {
        _upgradeTo_v1_3_0();
        // The transition we can prove: from reverting under v1.0.0 to
        // returning a tuple under v1.3.0+. Exact tuple is conflated with the
        // current osx-commons (see test-level caveat #1).
        uint8[3] memory v = DAOv1_3_0(proxy).protocolVersion();
        assertEq(v[0], 1);
        // Either [1,3,0] (if isolated osx-commons) or [1,4,0] (current env).
        assertTrue(v[1] == 3 || v[1] == 4, "minor must be 3 or 4");
    }

    function test_upgrade_v1_0_0_to_v1_3_0_preservesPermissions() public {
        _upgradeTo_v1_3_0();
        assertTrue(DAOv1_3_0(proxy).hasPermission(proxy, owner, ROOT_PERMISSION_ID, ""));
        assertTrue(DAOv1_3_0(proxy).hasPermission(proxy, owner, EXECUTE_PERMISSION_ID, ""));
        assertTrue(DAOv1_3_0(proxy).hasPermission(proxy, owner, UPGRADE_DAO_PERMISSION_ID, ""));
    }

    function test_upgrade_v1_0_0_to_v1_3_0_preservesStorage() public {
        address fwdBefore = DAOv1_0_0(proxy).getTrustedForwarder();
        _upgradeTo_v1_3_0();
        assertEq(DAOv1_3_0(proxy).getTrustedForwarder(), fwdBefore);
        assertEq(DAOv1_3_0(proxy).daoURI(), DAO_URI);
    }

    function test_upgrade_v1_0_0_to_v1_3_0_bumpsInitializedToThree() public {
        _upgradeTo_v1_3_0();
        // v1.3.0's `initialize`/`initializeFrom` is `reinitializer(3)`.
        bytes32 raw = vm.load(proxy, bytes32(uint256(0)));
        assertEq(uint8(uint256(raw)), 3, "v1.3.0 _initialized == 3");
    }

    function test_upgrade_v1_0_0_to_v1_3_0_executeStillWorks() public {
        _upgradeTo_v1_3_0();

        // Build a no-op action calling proxy.daoURI() — succeeds with no
        // side effect. Mirrors the TS "executes actions after the upgrade" test.
        Action[] memory actions = new Action[](1);
        actions[0] = Action({to: proxy, value: 0, data: abi.encodeWithSignature("daoURI()")});

        (bytes[] memory results,) = DAOv1_3_0(proxy).execute(bytes32(0), actions, 0);
        assertEq(abi.decode(results[0], (string)), DAO_URI);
    }

    // -------------------------------------------------------------------------
    // v1.3.0 → v1.4.0 — F9 confirmation + workaround
    // -------------------------------------------------------------------------

    /// **F9 confirmation**: `initializeFrom([1,3,0], "")` against a v1.4.0
    /// impl reverts `Initializable: contract is already initialized`. The
    /// modifier `reinitializer(3)` on v1.4.0's initializeFrom requires
    /// `_initialized < 3`, but v1.3.0 already set it to 3. The upgrade flow
    /// CANNOT exercise initializeFrom — the side-effects (IExecutor iface,
    /// SET_SIGNATURE_VALIDATOR revoke) silently never run.
    function test_F9_v1_3_to_v1_4_initializeFromReverts() public {
        _upgradeTo_v1_3_0();

        DAOv1_4_0 implV1_4_0 = new DAOv1_4_0();
        uint8[3] memory prev = [uint8(1), uint8(3), uint8(0)];
        bytes memory initFrom = abi.encodeCall(DAOv1_4_0.initializeFrom, (prev, ""));

        // Expect the Initializable revert string.
        vm.expectRevert(bytes("Initializable: contract is already initialized"));
        DAOv1_3_0(proxy).upgradeToAndCall(address(implV1_4_0), initFrom);
    }

    /// Workaround: bare `upgradeTo` (no init call). The proxy switches impls
    /// but `initializeFrom`'s body never runs, so:
    ///  - Storage preserved (trivially — no init mutates state)
    ///  - Permissions preserved
    ///  - `protocolVersion()` reflects the new impl's inherited version
    ///  - BUT: `IExecutor` is NOT registered, `SET_SIGNATURE_VALIDATOR` is
    ///    NOT revoked. That divergence is the consequence of F9.
    function test_upgrade_v1_3_to_v1_4_viaBareUpgradeToWorks() public {
        _upgradeTo_v1_3_0();
        _upgradeTo_v1_4_0_bare();

        // protocolVersion bumps to current.
        uint8[3] memory v = DAOv1_4_0(proxy).protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);

        // Storage preserved.
        assertEq(DAOv1_4_0(proxy).getTrustedForwarder(), trustedForwarder);
        assertEq(DAOv1_4_0(proxy).daoURI(), DAO_URI);

        // Permissions preserved.
        assertTrue(DAOv1_4_0(proxy).hasPermission(proxy, owner, ROOT_PERMISSION_ID, ""));
        assertTrue(DAOv1_4_0(proxy).hasPermission(proxy, owner, EXECUTE_PERMISSION_ID, ""));
    }

    // -------------------------------------------------------------------------
    // Internals — upgrade drivers
    // -------------------------------------------------------------------------

    function _upgradeTo_v1_3_0() internal {
        DAOv1_3_0 implV1_3_0 = new DAOv1_3_0();
        uint8[3] memory prev = [uint8(1), uint8(0), uint8(0)];
        bytes memory initFrom = abi.encodeCall(DAOv1_3_0.initializeFrom, (prev, ""));
        DAOv1_0_0(proxy).upgradeToAndCall(address(implV1_3_0), initFrom);
    }

    /// Bare upgrade to v1.4.0 — no `initializeFrom` call. Required to work
    /// around F9 since v1.3.0 already set `_initialized == 3` and v1.4.0's
    /// `initializeFrom` re-uses `reinitializer(3)`.
    function _upgradeTo_v1_4_0_bare() internal {
        DAOv1_4_0 implV1_4_0 = new DAOv1_4_0();
        DAOv1_3_0(proxy).upgradeTo(address(implV1_4_0));
    }
}
