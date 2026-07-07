// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {DAORegistry as DAORegistryV1_0_0} from "@aragon/osx-v1.0.0/framework/dao/DAORegistry.sol";
import {DAORegistry as DAORegistryV1_3_0} from "@aragon/osx-v1.3.0/framework/dao/DAORegistry.sol";
import {DAORegistry} from "../src/framework/dao/DAORegistry.sol";
import {ENSSubdomainRegistrar} from "../src/framework/utils/ens/ENSSubdomainRegistrar.sol";
import {IDAO} from "../src/common/dao/IDAO.sol";
import {DAOMock} from "../test/mocks/commons/dao/DAOMock.sol";

/// @dev Minimal ERC-165 stand-in claiming exactly the interface id the registry
/// probes at `_register` time, so `entries[...]` can be populated on the source
/// implementation before the upgrade.
contract ClaimsInterface {
    bytes4 private immutable _id;

    constructor(bytes4 id_) {
        _id = id_;
    }

    function supportsInterface(bytes4 _interfaceId) external view returns (bool) {
        return _interfaceId == _id || _interfaceId == 0x01ffc9a7; // ERC-165
    }
}

// Legacy -> current upgrade regression for DAORegistry, restoring the
// `upgrades from v1.0.0` and `from v1.3.0` cases from the TS suite
// (packages/contracts/test/framework/dao/dao-registry.ts). Both old versions are
// exercised as the SOURCE, upgrading to the current (v1.4.0) impl as the
// destination — the real operator path for already-deployed registries. They are
// NOT redundant: v1.0.0 pulls its own `DaoAuthorizableUpgradeable`, while v1.3.0
// pulls the remapped current one, so the two paths validate different base-class
// storage layouts against the destination. The auth gate itself is covered by
// test/framework/dao/DAORegistry.t.sol. DAORegistry defines no `initializeFrom`,
// so each hop is a bare `upgradeTo`.
//
// protocolVersion note: remappings.txt routes @aragon/osx-commons-contracts/src
// -> src/common, and the v1.3.0 tree ships no ProtocolVersion.sol of its own, so
// a recompiled v1.3.0 source already inherits the CURRENT mixin ([1,4,0]) — there
// is no observable version change on the v1.3.0 hop, only storage preservation.
// The v1.0.0 hop is the one honest reverting->tuple transition (v1.0.0 has no
// ProtocolVersion at all). See "Test-harness caveats" in TESTS.md.
//
// Requires the historical worktrees: run `just test-upgrade-setup` once, then
// `FOUNDRY_PROFILE=upgrade forge test`.
contract DAORegistryUpgradeTest is Test {
    DAOMock internal managingDao;
    address internal registrar = makeAddr("subdomainRegistrar"); // dummy; empty subdomain never calls it
    address internal creator = makeAddr("creator");

    function setUp() public {
        managingDao = new DAOMock();
        managingDao.setHasPermissionReturnValueMock(true); // REGISTER_DAO + UPGRADE_REGISTRY
    }

    // -------------------------------------------------------------------------
    // v1.0.0 → current (v1.4.0)
    // -------------------------------------------------------------------------

    function test_upgrade_v1_0_0_to_current_preservesState() public {
        (address proxy, address registeredDao, bytes4 targetId) = _deploySeededProxy(address(new DAORegistryV1_0_0()));

        // v1.0.0 predates ProtocolVersion — the selector is not in the impl.
        (bool ok, ) = proxy.call(abi.encodeWithSignature("protocolVersion()"));
        assertFalse(ok, "v1.0.0 must not expose protocolVersion()");

        DAORegistry implCurrent = new DAORegistry();
        DAORegistry(proxy).upgradeTo(address(implCurrent));

        _assertStatePreserved(proxy, registeredDao, targetId);
        _assertImplIs(proxy, address(implCurrent));

        // The real reverting -> tuple transition: the current impl exposes [1,4,0].
        uint8[3] memory v = DAORegistry(proxy).protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);
    }

    // -------------------------------------------------------------------------
    // v1.3.0 → current (v1.4.0)
    // -------------------------------------------------------------------------

    function test_upgrade_v1_3_0_to_current_preservesState() public {
        (address proxy, address registeredDao, bytes4 targetId) = _deploySeededProxy(address(new DAORegistryV1_3_0()));

        DAORegistry implCurrent = new DAORegistry();
        DAORegistry(proxy).upgradeTo(address(implCurrent));

        _assertStatePreserved(proxy, registeredDao, targetId);
        _assertImplIs(proxy, address(implCurrent));

        // protocolVersion() reads [1,4,0] both before and after on this path (the
        // v1.3.0 source's ProtocolVersion is remapped to the current mixin), so
        // storage preservation above is the load-bearing check for this hop.
        uint8[3] memory v = DAORegistry(proxy).protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /// Deploy a proxy from `impl` (initialized by that impl's code) and seed one
    /// registry entry. Empty subdomain bypasses ENS, so the dummy `registrar` is
    /// never touched. `targetId` is read back from the proxy so the stub claims
    /// whichever `IDAO` interface id that version stored.
    function _deploySeededProxy(address impl)
        internal
        returns (address proxy, address registeredDao, bytes4 targetId)
    {
        proxy = address(
            new ERC1967Proxy(
                impl,
                abi.encodeCall(DAORegistry.initialize, (IDAO(address(managingDao)), ENSSubdomainRegistrar(registrar)))
            )
        );
        targetId = DAORegistry(proxy).targetInterfaceId();
        registeredDao = address(new ClaimsInterface(targetId));
        DAORegistry(proxy).register(IDAO(registeredDao), creator, "");
    }

    /// The named state that must survive the bare `upgradeTo`.
    function _assertStatePreserved(address proxy, address registeredDao, bytes4 targetId) internal view {
        assertTrue(DAORegistry(proxy).entries(registeredDao), "entry preserved across upgrade");
        assertEq(address(DAORegistry(proxy).subdomainRegistrar()), registrar, "registrar preserved");
        assertEq(DAORegistry(proxy).targetInterfaceId(), targetId, "targetInterfaceId preserved");
        assertEq(address(DAORegistry(proxy).dao()), address(managingDao), "managing DAO preserved");
    }

    function _assertImplIs(address proxy, address impl) internal view {
        bytes32 implSlot = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
        assertEq(address(uint160(uint256(vm.load(proxy, implSlot)))), impl, "implementation slot updated");
    }
}
