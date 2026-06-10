// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Plugin} from "../../../src/common/plugin/Plugin.sol";
import {IPlugin} from "../../../src/common/plugin/IPlugin.sol";
import {IDAO} from "../../../src/common/dao/IDAO.sol";
import {IProtocolVersion} from "../../../src/common/utils/versioning/IProtocolVersion.sol";
import {IExecutor, Action} from "../../../src/common/executors/IExecutor.sol";
import {DaoUnauthorized} from "../../../src/common/permission/auth/auth.sol";
import {PluginMockBuild1} from "../../mocks/commons/plugin/PluginMock.sol";
import {CustomExecutorMock} from "../../mocks/commons/plugin/CustomExecutorMock.sol";
import {DAOMock} from "../../mocks/commons/dao/DAOMock.sol";

/// @dev A contract that ERC-165-claims to be `IDAO`. Used to trigger the
/// `Plugin._setTargetConfig` defensive check that refuses
/// `(IDAO-like, DelegateCall)` configurations. `DAOMock` does not implement
/// `supportsInterface`, so it cannot stand in here.
contract IDAOLikeMock {
    function supportsInterface(bytes4 _interfaceId) external pure returns (bool) {
        return _interfaceId == type(IDAO).interfaceId || _interfaceId == type(IERC165).interfaceId;
    }
}

/// @notice Direct tests for the `Plugin` abstract contract in
/// `src/common/plugin/Plugin.sol`.
///
/// Ports `osx-commons/contracts/test/plugin/plugin.ts` (370 lines, 21 cases)
/// and adds: `pluginType` enum value, `InvalidTargetConfig` revert,
/// `setTargetConfig` perm guard, `getTargetConfig` fallback semantics,
/// `TargetSet` event payload, and the `setTarget` XOR selector iface ID literal.
contract PluginTest is Test {
    DAOMock internal daoMock;
    PluginMockBuild1 internal plugin;
    CustomExecutorMock internal executor;
    address internal alice;

    bytes32 internal constant SET_TARGET_CONFIG_PERMISSION_ID = keccak256("SET_TARGET_CONFIG_PERMISSION");

    function setUp() public {
        alice = makeAddr("alice");
        daoMock = new DAOMock();
        // Default: hasPermission → true, so any caller can setTargetConfig.
        daoMock.setHasPermissionReturnValueMock(true);
        executor = new CustomExecutorMock();
        plugin = new PluginMockBuild1(IDAO(address(daoMock)));
    }

    // -------------------------------------------------------------------------
    // pluginType
    // -------------------------------------------------------------------------

    function test_pluginType_returnsConstructable() public view {
        assertEq(uint256(plugin.pluginType()), uint256(IPlugin.PluginType.Constructable));
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

        // Event payload includes the struct, encoded as (address, uint8).
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
        // GAP: F-class safety — refuses to set a DAO-typed target with
        // DelegateCall, which would brick the plugin (delegatecall to a DAO
        // contract overwrites plugin storage). The check uses ERC-165
        // `supportsInterface(type(IDAO).interfaceId)`, so a target that
        // does NOT advertise IDAO via ERC-165 (e.g. `DAOMock`) bypasses the
        // guard. Use a tiny ERC-165-claiming stub instead.
        IDAOLikeMock daoLike = new IDAOLikeMock();
        IPlugin.TargetConfig memory cfg =
            IPlugin.TargetConfig({target: address(daoLike), operation: IPlugin.Operation.DelegateCall});
        vm.expectPartialRevert(Plugin.InvalidTargetConfig.selector);
        plugin.setTargetConfig(cfg);
    }

    function test_setTargetConfig_allowsDAOLikeTargetWithCall() public {
        // Inverse of the above: same ERC-165 claim, but Call is allowed.
        IDAOLikeMock daoLike = new IDAOLikeMock();
        IPlugin.TargetConfig memory cfg =
            IPlugin.TargetConfig({target: address(daoLike), operation: IPlugin.Operation.Call});
        plugin.setTargetConfig(cfg);
        assertEq(plugin.getCurrentTargetConfig().target, address(daoLike));
    }

    function test_getCurrentTargetConfig_defaultsToZero() public view {
        IPlugin.TargetConfig memory cfg = plugin.getCurrentTargetConfig();
        assertEq(cfg.target, address(0));
        assertEq(uint256(cfg.operation), uint256(IPlugin.Operation.Call));
    }

    function test_getTargetConfig_fallsBackToDAOWhenTargetUnset() public view {
        // GAP: when currentTargetConfig.target == address(0), the convenience
        // getter must return (dao(), Call) — not the raw stored zero.
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

    function test_execute_routesToDAOIfTargetNotSet() public {
        // No setTargetConfig → fallback (dao, Call) → DAOMock.execute is invoked.
        // DAOMock's execute emits `Executed`; record + verify.
        Action[] memory actions;
        vm.recordLogs();
        plugin.execute(uint256(0xCAFE), actions, 0);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        // DAOMock emits IExecutor.Executed with the plugin as msg.sender.
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (
                logs[i].emitter == address(daoMock)
                    && logs[i].topics[0]
                        == keccak256("Executed(address,bytes32,(address,uint256,bytes)[],uint256,uint256,bytes[])")
            ) {
                assertEq(address(uint160(uint256(logs[i].topics[1]))), address(plugin));
                found = true;
                break;
            }
        }
        assertTrue(found, "DAOMock.execute(Executed) not seen");
    }

    // -------------------------------------------------------------------------
    // execute(address, uint256, Action[], uint256, Operation)
    // — explicit custom target, Call path.
    // -------------------------------------------------------------------------

    function test_execute_customTargetCall_forwardsAndEmitsFromTarget() public {
        Action[] memory actions;
        vm.recordLogs();
        // CustomExecutorMock emits `Executed` for any non-zero, non-123 callId.
        plugin.execute(address(executor), uint256(1), actions, 0, IPlugin.Operation.Call);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (
                logs[i].emitter == address(executor)
                    && logs[i].topics[0]
                        == keccak256("Executed(address,bytes32,(address,uint256,bytes)[],uint256,uint256,bytes[])")
            ) {
                found = true;
                break;
            }
        }
        assertTrue(found, "CustomExecutorMock.Executed not emitted");
    }

    function test_execute_customTargetCall_revertsFromTarget() public {
        // CustomExecutorMock reverts `Failed()` when callId == 0.
        Action[] memory actions;
        vm.expectRevert(CustomExecutorMock.Failed.selector);
        plugin.execute(address(executor), uint256(0), actions, 0, IPlugin.Operation.Call);
    }

    // -------------------------------------------------------------------------
    // execute(...) DelegateCall path
    // -------------------------------------------------------------------------

    function test_execute_customTargetDelegateCall_bubblesRevertMessage() public {
        // callId == 0 → CustomExecutorMock.execute reverts `Failed()`. When
        // invoked via delegatecall, the revert data is bubbled up through
        // Plugin's assembly path.
        Action[] memory actions;
        vm.expectRevert(CustomExecutorMock.Failed.selector);
        plugin.execute(address(executor), uint256(0), actions, 0, IPlugin.Operation.DelegateCall);
    }

    function test_execute_customTargetDelegateCall_revertsDelegateCallFailedOnEmptyRevertData() public {
        // callId == 123 → CustomExecutorMock.execute uses `revert()` with no
        // data. Plugin's delegatecall path then reverts `DelegateCallFailed`.
        Action[] memory actions;
        vm.expectRevert(Plugin.DelegateCallFailed.selector);
        plugin.execute(address(executor), uint256(123), actions, 0, IPlugin.Operation.DelegateCall);
    }

    function test_execute_customTargetDelegateCall_emitsFromConsumerContext() public {
        // For a successful callId, delegatecall runs `executor.execute` in the
        // plugin's storage/event context: the `Executed` log is emitted by the
        // plugin address, not by the executor.
        Action[] memory actions;
        vm.recordLogs();
        plugin.execute(address(executor), uint256(7), actions, 0, IPlugin.Operation.DelegateCall);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (
                logs[i].emitter == address(plugin)
                    && logs[i].topics[0]
                        == keccak256("Executed(address,bytes32,(address,uint256,bytes)[],uint256,uint256,bytes[])")
            ) {
                found = true;
                break;
            }
        }
        assertTrue(found, "Expected Executed emitted from plugin (delegatecall context)");
    }

    // -------------------------------------------------------------------------
    // address(0) target — undefined behaviour, must revert
    // -------------------------------------------------------------------------

    function test_execute_customTargetAddressZero_reverts() public {
        // No explicit address(0) check in source; the call ends up trying to
        // `abi.decode` empty returndata as `(bytes[], uint256)` and panics. The
        // important property is just "this reverts" — the precise message is
        // an implementation detail and may vary across Foundry versions.
        Action[] memory actions;
        vm.expectRevert();
        plugin.execute(address(0), uint256(1), actions, 0, IPlugin.Operation.Call);
    }

    /// Calling `setTargetConfig` a second time overrides the stored value and
    /// emits `TargetSet` again. Lock in: there's no "already set" sentinel —
    /// each call simply overwrites.
    function test_setTargetConfig_secondCallOverridesAndEmitsAgain() public {
        IPlugin.TargetConfig memory first =
            IPlugin.TargetConfig({target: address(executor), operation: IPlugin.Operation.Call});
        IPlugin.TargetConfig memory second =
            IPlugin.TargetConfig({target: makeAddr("other"), operation: IPlugin.Operation.DelegateCall});

        vm.recordLogs();
        plugin.setTargetConfig(first);
        plugin.setTargetConfig(second);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 topic = keccak256("TargetSet((address,uint8))");
        uint256 count;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(plugin) && logs[i].topics[0] == topic) count++;
        }
        assertEq(count, 2, "TargetSet emitted once per call");

        // Final stored config is the second one.
        IPlugin.TargetConfig memory stored = plugin.getCurrentTargetConfig();
        assertEq(stored.target, second.target);
        assertEq(uint256(stored.operation), uint256(second.operation));
    }

    /// `getTargetConfig`'s fallback fires whenever `target == address(0)`,
    /// regardless of the stored `operation`. So storing `(address(0), DelegateCall)`
    /// still returns `(dao(), Call)` — the fallback overrides the operation too.
    function test_getTargetConfig_zeroTargetIgnoresStoredOperation() public {
        // Source rejects the literal `(0, DelegateCall)` only when the target
        // implements IDAO; `address(0)` does not, so the setter accepts it.
        IPlugin.TargetConfig memory cfg =
            IPlugin.TargetConfig({target: address(0), operation: IPlugin.Operation.DelegateCall});
        plugin.setTargetConfig(cfg);

        IPlugin.TargetConfig memory resolved = plugin.getTargetConfig();
        assertEq(resolved.target, address(daoMock));
        assertEq(uint256(resolved.operation), uint256(IPlugin.Operation.Call), "fallback resets operation to Call");
    }

    /// The synthetic XOR-of-3-selectors "interface id" is computed at runtime
    /// in `supportsInterface`. Lock in the frozen literal so any rename of
    /// `setTargetConfig` / `getTargetConfig` / `getCurrentTargetConfig` is
    /// caught at test time (the XOR changes silently otherwise).
    function test_supportsInterface_xorDriftDetector() public view {
        bytes4 computed =
            plugin.setTargetConfig.selector ^ plugin.getTargetConfig.selector ^ plugin.getCurrentTargetConfig.selector;
        assertEq(computed, bytes4(0xafc5b823), "XOR of the 3 target selectors is frozen");
    }
}
