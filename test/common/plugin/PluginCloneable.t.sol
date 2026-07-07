// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {PluginCloneable} from "../../../src/common/plugin/PluginCloneable.sol";
import {IPlugin} from "../../../src/common/plugin/IPlugin.sol";
import {IDAO} from "../../../src/common/dao/IDAO.sol";
import {IProtocolVersion} from "../../../src/common/utils/versioning/IProtocolVersion.sol";
import {DaoUnauthorized} from "../../../src/common/permission/auth/auth.sol";
import {Action} from "../../../src/common/executors/IExecutor.sol";
import {PluginCloneableMockBuild1, PluginCloneableMockBad} from "../../mocks/commons/plugin/PluginCloneableMock.sol";
import {CustomExecutorMock} from "../../mocks/commons/plugin/CustomExecutorMock.sol";
import {DAOMock} from "../../mocks/commons/dao/DAOMock.sol";

/// @dev A contract that ERC-165-claims to be `IDAO`. Used to trigger the
/// `PluginCloneable._setTargetConfig` defensive check.
contract IDAOLikeMock {
    function supportsInterface(bytes4 _interfaceId) external pure returns (bool) {
        return _interfaceId == type(IDAO).interfaceId || _interfaceId == type(IERC165).interfaceId;
    }
}

/// @notice Direct tests for the `PluginCloneable` abstract contract in
/// `src/common/plugin/PluginCloneable.sol`.
///
/// Ports `osx-commons/contracts/test/plugin/plugin-clonable.ts` (453 lines, 24
/// cases). Adds the `Initializable` surface (init OK, disabled-on-impl,
/// re-init via guard, `__PluginCloneable_init` outside `onlyInitializing`),
/// `pluginType == Cloneable`, the `InvalidTargetConfig` guard, and the full
/// execute/delegatecall matrix shared with `Plugin.t.sol`.
contract PluginCloneableTest is Test {
    DAOMock internal daoMock;
    PluginCloneableMockBuild1 internal impl;
    PluginCloneableMockBuild1 internal plugin;
    CustomExecutorMock internal executor;
    address internal alice;

    function setUp() public {
        alice = makeAddr("alice");
        daoMock = new DAOMock();
        daoMock.setHasPermissionReturnValueMock(true);
        executor = new CustomExecutorMock();

        // Deploy the implementation (constructor calls `_disableInitializers`)
        // then clone it, initialize the clone, and use it as the plugin under
        // test. Matches the production lifecycle.
        impl = new PluginCloneableMockBuild1();
        plugin = PluginCloneableMockBuild1(Clones.clone(address(impl)));
        plugin.initialize(IDAO(address(daoMock)));
    }

    // -------------------------------------------------------------------------
    // Initializable
    // -------------------------------------------------------------------------

    function test_initialize_setsDaoAndState() public view {
        assertEq(address(plugin.dao()), address(daoMock));
        assertEq(plugin.state1(), 1);
    }

    function test_initialize_disabledOnImplementation() public {
        // Constructor of the impl calls `_disableInitializers`, so calling
        // `initialize` directly on the implementation reverts.
        vm.expectRevert("Initializable: contract is already initialized");
        impl.initialize(IDAO(address(daoMock)));
    }

    function test_initialize_revertsIfCalledTwice() public {
        vm.expectRevert("Initializable: contract is already initialized");
        plugin.initialize(IDAO(address(daoMock)));
    }

    function test_initInternal_revertsIfCalledOutsideInitializer() public {
        // `PluginCloneableMockBad.notAnInitializer` calls
        // `__PluginCloneable_init` without the `initializer` modifier.
        PluginCloneableMockBad badImpl = new PluginCloneableMockBad();
        PluginCloneableMockBad bad = PluginCloneableMockBad(Clones.clone(address(badImpl)));
        vm.expectRevert("Initializable: contract is not initializing");
        bad.notAnInitializer(IDAO(address(daoMock)));
    }

    // -------------------------------------------------------------------------
    // pluginType
    // -------------------------------------------------------------------------

    function test_pluginType_returnsCloneable() public view {
        assertEq(uint256(plugin.pluginType()), uint256(IPlugin.PluginType.Cloneable));
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
        vm.expectPartialRevert(PluginCloneable.InvalidTargetConfig.selector);
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

    function test_execute_routesToDAOIfTargetNotSet() public {
        bytes32 executedTopic = keccak256("Executed(address,bytes32,(address,uint256,bytes)[],uint256,uint256,bytes[])");
        Action[] memory actions;
        vm.recordLogs();
        plugin.execute(uint256(0xCAFE), actions, 0);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(daoMock) && logs[i].topics[0] == executedTopic) {
                assertEq(address(uint160(uint256(logs[i].topics[1]))), address(plugin));
                found = true;
                break;
            }
        }
        assertTrue(found, "DAOMock.execute(Executed) not seen");
    }

    // -------------------------------------------------------------------------
    // execute(address, ...) explicit target — Call path.
    // -------------------------------------------------------------------------

    function test_execute_customTargetCall_forwardsAndEmitsFromTarget() public {
        bytes32 executedTopic = keccak256("Executed(address,bytes32,(address,uint256,bytes)[],uint256,uint256,bytes[])");
        Action[] memory actions;
        vm.recordLogs();
        plugin.execute(address(executor), uint256(1), actions, 0, IPlugin.Operation.Call);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(executor) && logs[i].topics[0] == executedTopic) {
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

    // -------------------------------------------------------------------------
    // execute(...) DelegateCall path
    // -------------------------------------------------------------------------

    function test_execute_customTargetDelegateCall_bubblesRevertMessage() public {
        Action[] memory actions;
        vm.expectRevert(CustomExecutorMock.Failed.selector);
        plugin.execute(address(executor), uint256(0), actions, 0, IPlugin.Operation.DelegateCall);
    }

    function test_execute_customTargetDelegateCall_revertsDelegateCallFailedOnEmptyRevertData() public {
        Action[] memory actions;
        vm.expectRevert(PluginCloneable.DelegateCallFailed.selector);
        plugin.execute(address(executor), uint256(123), actions, 0, IPlugin.Operation.DelegateCall);
    }

    function test_execute_customTargetDelegateCall_emitsFromConsumerContext() public {
        bytes32 executedTopic = keccak256("Executed(address,bytes32,(address,uint256,bytes)[],uint256,uint256,bytes[])");
        Action[] memory actions;
        vm.recordLogs();
        plugin.execute(address(executor), uint256(7), actions, 0, IPlugin.Operation.DelegateCall);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(plugin) && logs[i].topics[0] == executedTopic) {
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
    // Cloneable-specific surface
    // -------------------------------------------------------------------------

    /// Clones produced via `Clones.clone` follow EIP-1167: a 45-byte runtime
    /// shim that delegate-calls into the implementation. If OZ ever switches
    /// to a different minimal-proxy encoding (or one of the alternate forms),
    /// this length check catches the change.
    function test_clone_runtimeCodeLengthMatchesEIP1167() public view {
        assertEq(address(plugin).code.length, 45, "EIP-1167 minimal proxy is 45 bytes");
    }

    /// PluginCloneable is NOT UUPS-upgradeable — it must NOT advertise
    /// `IERC1822Proxiable`. The sibling `PluginUUPSUpgradeable` does support
    /// this interface; the negative answer here is what distinguishes the
    /// two roles at the ERC-165 layer.
    function test_supportsInterface_doesNotSupportERC1822Proxiable() public view {
        // ERC-1822 ProxiableUUID has interfaceId 0x52d1902d
        // (selector of `proxiableUUID()`).
        assertFalse(plugin.supportsInterface(bytes4(0x52d1902d)));
    }
}
