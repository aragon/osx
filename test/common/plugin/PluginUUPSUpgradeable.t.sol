// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {
    IERC1822ProxiableUpgradeable
} from "@openzeppelin/contracts-upgradeable/interfaces/draft-IERC1822Upgradeable.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PluginUUPSUpgradeable} from "../../../src/common/plugin/PluginUUPSUpgradeable.sol";
import {IPlugin} from "../../../src/common/plugin/IPlugin.sol";
import {IDAO} from "../../../src/common/dao/IDAO.sol";
import {IProtocolVersion} from "../../../src/common/utils/versioning/IProtocolVersion.sol";
import {Action} from "../../../src/common/executors/IExecutor.sol";
import {DaoUnauthorized} from "../../../src/common/permission/auth/auth.sol";
import {
    PluginUUPSUpgradeableMockBuild1,
    PluginUUPSUpgradeableMockBuild2,
    PluginUUPSUpgradeableMockBad
} from "../../mocks/commons/plugin/PluginUUPSUpgradeableMock.sol";
import {CustomExecutorMock} from "../../mocks/commons/plugin/CustomExecutorMock.sol";
import {DAOMock} from "../../mocks/commons/dao/DAOMock.sol";

/// @dev A contract that ERC-165-claims to be `IDAO`. Used to trigger the
/// `PluginUUPSUpgradeable._setTargetConfig` defensive check.
contract IDAOLikeMock {
    function supportsInterface(bytes4 _interfaceId) external pure returns (bool) {
        return _interfaceId == type(IDAO).interfaceId || _interfaceId == type(IERC165).interfaceId;
    }
}

/// @notice Direct tests for the `PluginUUPSUpgradeable` abstract contract in
/// `src/common/plugin/PluginUUPSUpgradeable.sol`.
///
/// Ports `osx-commons/contracts/test/plugin/plugin-uups-upgradeable.ts` (601
/// lines, 28 cases). Covers the Initializable surface, `pluginType == UUPS`,
/// ERC-165 (incl. `IERC1822ProxiableUpgradeable`), the execute/delegatecall
/// matrix shared with `Plugin.t.sol`, and the upgradeability surface
/// (`implementation()`, `_authorizeUpgrade` permission gate, reinitialization
/// via `reinitializer(2)`).
contract PluginUUPSUpgradeableTest is Test {
    DAOMock internal daoMock;
    PluginUUPSUpgradeableMockBuild1 internal impl;
    PluginUUPSUpgradeableMockBuild1 internal plugin;
    CustomExecutorMock internal executor;
    address internal alice;

    function setUp() public {
        alice = makeAddr("alice");
        daoMock = new DAOMock();
        daoMock.setHasPermissionReturnValueMock(true);
        executor = new CustomExecutorMock();

        // Deploy the implementation, then wrap it in an ERC1967Proxy seeded
        // with `initialize(daoMock)` calldata. Matches the production UUPS
        // lifecycle.
        impl = new PluginUUPSUpgradeableMockBuild1();
        bytes memory initCalldata = abi.encodeCall(impl.initialize, (IDAO(address(daoMock))));
        plugin = PluginUUPSUpgradeableMockBuild1(address(new ERC1967Proxy(address(impl), initCalldata)));
    }

    // -------------------------------------------------------------------------
    // Initializable
    // -------------------------------------------------------------------------

    function test_initialize_setsDaoAndState() public view {
        assertEq(address(plugin.dao()), address(daoMock));
        assertEq(plugin.state1(), 1);
    }

    function test_initialize_disabledOnImplementation() public {
        // Constructor of the impl calls `_disableInitializers`.
        vm.expectRevert("Initializable: contract is already initialized");
        impl.initialize(IDAO(address(daoMock)));
    }

    function test_initialize_revertsIfCalledTwice() public {
        vm.expectRevert("Initializable: contract is already initialized");
        plugin.initialize(IDAO(address(daoMock)));
    }

    function test_initInternal_revertsIfCalledOutsideInitializer() public {
        // The `Bad` mock has `notAnInitializer` calling
        // `__PluginUUPSUpgradeable_init` without the `initializer` modifier.
        PluginUUPSUpgradeableMockBad badImpl = new PluginUUPSUpgradeableMockBad();
        PluginUUPSUpgradeableMockBad bad =
            PluginUUPSUpgradeableMockBad(address(new ERC1967Proxy(address(badImpl), bytes(""))));
        vm.expectRevert("Initializable: contract is not initializing");
        bad.notAnInitializer(IDAO(address(daoMock)));
    }

    // -------------------------------------------------------------------------
    // pluginType
    // -------------------------------------------------------------------------

    function test_pluginType_returnsUUPS() public view {
        assertEq(uint256(plugin.pluginType()), uint256(IPlugin.PluginType.UUPS));
    }

    // -------------------------------------------------------------------------
    // protocolVersion (inherited)
    // -------------------------------------------------------------------------

    function test_protocolVersion_returnsCurrent() public view {
        uint8[3] memory v = plugin.protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);
    }

    // -------------------------------------------------------------------------
    // ERC-165
    // -------------------------------------------------------------------------

    function test_supportsInterface_ERC165() public view {
        assertTrue(plugin.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_IPlugin() public view {
        assertTrue(plugin.supportsInterface(type(IPlugin).interfaceId));
    }

    function test_supportsInterface_IProtocolVersion() public view {
        assertTrue(plugin.supportsInterface(type(IProtocolVersion).interfaceId));
    }

    function test_supportsInterface_IERC1822ProxiableUpgradeable() public view {
        assertTrue(plugin.supportsInterface(type(IERC1822ProxiableUpgradeable).interfaceId));
    }

    function test_supportsInterface_setTargetXorSelectors() public view {
        bytes4 xor =
            plugin.setTargetConfig.selector ^ plugin.getTargetConfig.selector ^ plugin.getCurrentTargetConfig.selector;
        assertTrue(plugin.supportsInterface(xor));
    }

    function test_supportsInterface_returnsFalseForUnknownInterface() public view {
        assertFalse(plugin.supportsInterface(0xdeadbeef));
    }

    // -------------------------------------------------------------------------
    // setTargetConfig / getCurrentTargetConfig / getTargetConfig
    // -------------------------------------------------------------------------

    function test_setTargetConfig_revertsIfCallerLacksPermission() public {
        daoMock.setHasPermissionReturnValueMock(false);
        IPlugin.TargetConfig memory cfg =
            IPlugin.TargetConfig({target: address(executor), operation: IPlugin.Operation.Call});

        vm.expectPartialRevert(DaoUnauthorized.selector);
        vm.prank(alice);
        plugin.setTargetConfig(cfg);
    }

    function test_setTargetConfig_updatesAndEmitsTargetSet() public {
        IPlugin.TargetConfig memory cfg =
            IPlugin.TargetConfig({target: address(executor), operation: IPlugin.Operation.Call});

        vm.recordLogs();
        plugin.setTargetConfig(cfg);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 topic = keccak256("TargetSet((address,uint8))");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == topic && logs[i].emitter == address(plugin)) {
                (address target, uint8 op) = abi.decode(logs[i].data, (address, uint8));
                assertEq(target, address(executor));
                assertEq(uint256(op), uint256(IPlugin.Operation.Call));
                found = true;
                break;
            }
        }
        assertTrue(found, "TargetSet not emitted");

        IPlugin.TargetConfig memory stored = plugin.getCurrentTargetConfig();
        assertEq(stored.target, address(executor));
        assertEq(uint256(stored.operation), uint256(IPlugin.Operation.Call));
    }

    function test_setTargetConfig_revertsIfDAOTargetWithDelegateCall() public {
        IDAOLikeMock daoLike = new IDAOLikeMock();
        IPlugin.TargetConfig memory cfg =
            IPlugin.TargetConfig({target: address(daoLike), operation: IPlugin.Operation.DelegateCall});
        vm.expectPartialRevert(PluginUUPSUpgradeable.InvalidTargetConfig.selector);
        plugin.setTargetConfig(cfg);
    }

    function test_getCurrentTargetConfig_defaultsToZero() public view {
        IPlugin.TargetConfig memory cfg = plugin.getCurrentTargetConfig();
        assertEq(cfg.target, address(0));
        assertEq(uint256(cfg.operation), uint256(IPlugin.Operation.Call));
    }

    function test_getTargetConfig_fallsBackToDAOWhenTargetUnset() public view {
        IPlugin.TargetConfig memory cfg = plugin.getTargetConfig();
        assertEq(cfg.target, address(daoMock));
        assertEq(uint256(cfg.operation), uint256(IPlugin.Operation.Call));
    }

    function test_getTargetConfig_returnsStoredWhenSet() public {
        IPlugin.TargetConfig memory toSet =
            IPlugin.TargetConfig({target: address(executor), operation: IPlugin.Operation.DelegateCall});
        plugin.setTargetConfig(toSet);

        IPlugin.TargetConfig memory cfg = plugin.getTargetConfig();
        assertEq(cfg.target, address(executor));
        assertEq(uint256(cfg.operation), uint256(IPlugin.Operation.DelegateCall));
    }

    // -------------------------------------------------------------------------
    // execute(uint256, Action[], uint256) — uses the current target.
    // -------------------------------------------------------------------------

    bytes32 internal constant EXECUTED_TOPIC =
        keccak256("Executed(address,bytes32,(address,uint256,bytes)[],uint256,uint256,bytes[])");

    function test_execute_routesToDAOIfTargetNotSet() public {
        Action[] memory actions;
        vm.recordLogs();
        plugin.execute(uint256(0xCAFE), actions, 0);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(daoMock) && logs[i].topics[0] == EXECUTED_TOPIC) {
                assertEq(address(uint160(uint256(logs[i].topics[1]))), address(plugin));
                found = true;
                break;
            }
        }
        assertTrue(found, "DAOMock.execute(Executed) not seen");
    }

    function test_execute_customTargetCall_forwardsAndEmitsFromTarget() public {
        Action[] memory actions;
        vm.recordLogs();
        plugin.execute(address(executor), uint256(1), actions, 0, IPlugin.Operation.Call);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(executor) && logs[i].topics[0] == EXECUTED_TOPIC) {
                found = true;
                break;
            }
        }
        assertTrue(found, "CustomExecutorMock.Executed not emitted");
    }

    function test_execute_customTargetCall_revertsFromTarget() public {
        Action[] memory actions;
        vm.expectRevert(CustomExecutorMock.Failed.selector);
        plugin.execute(address(executor), uint256(0), actions, 0, IPlugin.Operation.Call);
    }

    function test_execute_customTargetDelegateCall_bubblesRevertMessage() public {
        Action[] memory actions;
        vm.expectRevert(CustomExecutorMock.Failed.selector);
        plugin.execute(address(executor), uint256(0), actions, 0, IPlugin.Operation.DelegateCall);
    }

    function test_execute_customTargetDelegateCall_revertsDelegateCallFailedOnEmptyRevertData() public {
        Action[] memory actions;
        vm.expectRevert(PluginUUPSUpgradeable.DelegateCallFailed.selector);
        plugin.execute(address(executor), uint256(123), actions, 0, IPlugin.Operation.DelegateCall);
    }

    function test_execute_customTargetDelegateCall_emitsFromConsumerContext() public {
        Action[] memory actions;
        vm.recordLogs();
        plugin.execute(address(executor), uint256(7), actions, 0, IPlugin.Operation.DelegateCall);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(plugin) && logs[i].topics[0] == EXECUTED_TOPIC) {
                found = true;
                break;
            }
        }
        assertTrue(found, "Expected Executed emitted from plugin (delegatecall context)");
    }

    function test_execute_customTargetAddressZero_reverts() public {
        Action[] memory actions;
        vm.expectRevert();
        plugin.execute(address(0), uint256(1), actions, 0, IPlugin.Operation.Call);
    }

    // -------------------------------------------------------------------------
    // Upgradeability
    // -------------------------------------------------------------------------

    function test_implementation_returnsImplementationSlot() public view {
        // ERC-1967 implementation slot must point to the original Build1 impl.
        assertEq(plugin.implementation(), address(impl));
    }

    function test_upgrade_revertsIfCallerLacksUpgradePermission() public {
        // _authorizeUpgrade is gated by UPGRADE_PLUGIN_PERMISSION_ID. The DAOMock
        // is currently set to allow all permissions; flip it to deny.
        daoMock.setHasPermissionReturnValueMock(false);

        PluginUUPSUpgradeableMockBuild2 newImpl = new PluginUUPSUpgradeableMockBuild2();
        vm.expectPartialRevert(DaoUnauthorized.selector);
        vm.prank(alice);
        plugin.upgradeTo(address(newImpl));
    }

    function test_upgrade_succeedsWithPermission() public {
        PluginUUPSUpgradeableMockBuild2 newImpl = new PluginUUPSUpgradeableMockBuild2();
        plugin.upgradeTo(address(newImpl));
        assertEq(plugin.implementation(), address(newImpl));
    }

    function test_upgrade_canBeReinitialized() public {
        // Upgrade to Build2 with an `initializeFrom(1)` call to bump
        // `_initialized` to 2 and set `state2`. Verifies the `reinitializer(2)`
        // path works end-to-end.
        PluginUUPSUpgradeableMockBuild2 newImpl = new PluginUUPSUpgradeableMockBuild2();
        bytes memory initFrom = abi.encodeCall(newImpl.initializeFrom, (uint16(1)));
        plugin.upgradeToAndCall(address(newImpl), initFrom);

        assertEq(plugin.implementation(), address(newImpl));
        // Re-cast to Build2 to read `state2`.
        PluginUUPSUpgradeableMockBuild2 asBuild2 = PluginUUPSUpgradeableMockBuild2(address(plugin));
        assertEq(asBuild2.state2(), 2);
    }

    /// Upgrade-safety invariant: the plugin's own state (`currentTargetConfig`,
    /// inherited `dao()`) must survive an impl swap. If the gap shrinks or the
    /// new impl reorders state, this test catches the collision.
    function test_upgrade_preservesPluginState() public {
        // Establish pre-upgrade state.
        IPlugin.TargetConfig memory cfg =
            IPlugin.TargetConfig({target: address(executor), operation: IPlugin.Operation.DelegateCall});
        plugin.setTargetConfig(cfg);
        address daoBefore = address(plugin.dao());

        // Upgrade impl.
        PluginUUPSUpgradeableMockBuild2 newImpl = new PluginUUPSUpgradeableMockBuild2();
        plugin.upgradeTo(address(newImpl));

        // State survives.
        assertEq(address(plugin.dao()), daoBefore, "dao() preserved across upgrade");
        IPlugin.TargetConfig memory after_ = plugin.getCurrentTargetConfig();
        assertEq(after_.target, address(executor), "target preserved");
        assertEq(uint256(after_.operation), uint256(IPlugin.Operation.DelegateCall), "operation preserved");
    }

    /// `IERC1822ProxiableUpgradeable.interfaceId` is locked to `0x52d1902d`
    /// (selector of `proxiableUUID()`). If OZ ever renames the function on
    /// their interface, this test catches the silent drift.
    function test_supportsInterface_erc1822InterfaceIdDriftDetector() public pure {
        assertEq(type(IERC1822ProxiableUpgradeable).interfaceId, bytes4(0x52d1902d));
    }

    /// Drift detector for the `uint256[49]` tail gap. Probe a slot deep
    /// enough to be inside the gap on the current layout; should be zero.
    function test_storageGap_sentinelSlotIsUnused() public view {
        bytes32 sentinel = bytes32(uint256(250));
        bytes32 raw = vm.load(address(plugin), sentinel);
        assertEq(uint256(raw), 0, "gap slot 250 should be unused");
    }
}
