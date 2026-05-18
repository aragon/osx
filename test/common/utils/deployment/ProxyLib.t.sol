// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {ProxyFactory} from "../../../../src/common/utils/deployment/ProxyFactory.sol";
import {IDAO} from "../../../../src/common/dao/IDAO.sol";
import {PluginUUPSUpgradeableMockBuild1} from "../../../mocks/commons/plugin/PluginUUPSUpgradeableMock.sol";
import {PluginCloneableMockBuild1} from "../../../mocks/commons/plugin/PluginCloneableMock.sol";

/// @notice Direct tests for `ProxyFactory` and the `ProxyLib` library it
/// delegates to (`src/common/utils/deployment/`).
///
/// Ports `osx-commons/contracts/test/utils/deployment/proxy-lib.ts` and
/// closes the gaps from `TESTS.md` §7: explicit `ProxyCreated` event
/// emission, immutable `implementation()` getter, init-revert propagation
/// (closes central flaw log F15), and distinct addresses for consecutive
/// deploys.
contract ProxyLibTest is Test {
    /// A non-zero address used as the `IDAO` argument to `initialize` to
    /// distinguish "uninitialized" (dao = address(0)) from "initialized"
    /// (dao = fakeDao). Value chosen for visual clarity in traces.
    address internal constant FAKE_DAO = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

    PluginUUPSUpgradeableMockBuild1 internal uupsImpl;
    PluginCloneableMockBuild1 internal cloneableImpl;
    ProxyFactory internal uupsFactory;
    ProxyFactory internal cloneableFactory;
    bytes internal initCalldata;

    function setUp() public {
        uupsImpl = new PluginUUPSUpgradeableMockBuild1();
        cloneableImpl = new PluginCloneableMockBuild1();
        uupsFactory = new ProxyFactory(address(uupsImpl));
        cloneableFactory = new ProxyFactory(address(cloneableImpl));

        // Both mocks expose `initialize(IDAO)` with identical signatures; the same
        // calldata works for either factory.
        initCalldata = abi.encodeCall(PluginUUPSUpgradeableMockBuild1.initialize, (IDAO(FAKE_DAO)));
    }

    // -------------------------------------------------------------------------
    // implementation() — immutable getter
    // -------------------------------------------------------------------------

    function test_implementation_returnsConstructorArg() public view {
        assertEq(uupsFactory.implementation(), address(uupsImpl));
        assertEq(cloneableFactory.implementation(), address(cloneableImpl));
    }

    // -------------------------------------------------------------------------
    // deployUUPSProxy
    // -------------------------------------------------------------------------

    function test_deployUUPSProxy_initializedWhenCalldataProvided() public {
        address proxyAddr = uupsFactory.deployUUPSProxy(initCalldata);
        PluginUUPSUpgradeableMockBuild1 proxy = PluginUUPSUpgradeableMockBuild1(proxyAddr);

        assertEq(proxy.implementation(), uupsFactory.implementation());
        assertEq(proxy.implementation(), address(uupsImpl));
        assertEq(address(proxy.dao()), FAKE_DAO);
        assertEq(proxy.state1(), 1);
    }

    function test_deployUUPSProxy_uninitializedWhenNoCalldata() public {
        address proxyAddr = uupsFactory.deployUUPSProxy("");
        PluginUUPSUpgradeableMockBuild1 proxy = PluginUUPSUpgradeableMockBuild1(proxyAddr);

        assertEq(proxy.implementation(), address(uupsImpl));
        assertEq(address(proxy.dao()), address(0));
        assertEq(proxy.state1(), 0);
    }

    function test_deployUUPSProxy_emitsProxyCreatedWithDeployedAddress() public {
        vm.recordLogs();
        address proxy = uupsFactory.deployUUPSProxy("");
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expectedTopic = keccak256("ProxyCreated(address)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == expectedTopic && logs[i].emitter == address(uupsFactory)) {
                address emittedProxy = abi.decode(logs[i].data, (address));
                assertEq(emittedProxy, proxy);
                found = true;
                break;
            }
        }
        assertTrue(found, "ProxyCreated not emitted by uupsFactory");
    }

    function test_deployUUPSProxy_revertsIfInitCalldataReverts() public {
        // F15: an init that targets a non-existent selector reverts inside the
        // proxy's constructor delegatecall — the entire deployUUPSProxy call
        // must revert (no silent partial proxy creation).
        bytes memory bogus = abi.encodeWithSelector(bytes4(keccak256("doesNotExist()")));
        vm.expectRevert();
        uupsFactory.deployUUPSProxy(bogus);
    }

    function test_deployUUPSProxy_consecutiveDeploysProduceDistinctAddresses() public {
        address a = uupsFactory.deployUUPSProxy("");
        address b = uupsFactory.deployUUPSProxy("");
        address c = uupsFactory.deployUUPSProxy(initCalldata);
        assertTrue(a != b);
        assertTrue(b != c);
        assertTrue(a != c);
    }

    // -------------------------------------------------------------------------
    // deployMinimalProxy
    // -------------------------------------------------------------------------

    function test_deployMinimalProxy_initializedWhenCalldataProvided() public {
        address proxyAddr = cloneableFactory.deployMinimalProxy(initCalldata);
        PluginCloneableMockBuild1 proxy = PluginCloneableMockBuild1(proxyAddr);

        assertEq(address(proxy.dao()), FAKE_DAO);
        assertEq(proxy.state1(), 1);
    }

    function test_deployMinimalProxy_uninitializedWhenNoCalldata() public {
        address proxyAddr = cloneableFactory.deployMinimalProxy("");
        PluginCloneableMockBuild1 proxy = PluginCloneableMockBuild1(proxyAddr);

        assertEq(address(proxy.dao()), address(0));
        assertEq(proxy.state1(), 0);
    }

    function test_deployMinimalProxy_emitsProxyCreatedWithDeployedAddress() public {
        vm.recordLogs();
        address proxy = cloneableFactory.deployMinimalProxy("");
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 expectedTopic = keccak256("ProxyCreated(address)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == expectedTopic && logs[i].emitter == address(cloneableFactory)) {
                address emittedProxy = abi.decode(logs[i].data, (address));
                assertEq(emittedProxy, proxy);
                found = true;
                break;
            }
        }
        assertTrue(found, "ProxyCreated not emitted by cloneableFactory");
    }

    function test_deployMinimalProxy_revertsIfInitCalldataReverts() public {
        // F15: bogus selector in init calldata reverts inside the post-clone
        // functionCall — the entire deployMinimalProxy reverts.
        bytes memory bogus = abi.encodeWithSelector(bytes4(0xdeadbeef));
        vm.expectRevert();
        cloneableFactory.deployMinimalProxy(bogus);
    }

    function test_deployMinimalProxy_consecutiveDeploysProduceDistinctAddresses() public {
        address a = cloneableFactory.deployMinimalProxy("");
        address b = cloneableFactory.deployMinimalProxy("");
        address c = cloneableFactory.deployMinimalProxy(initCalldata);
        assertTrue(a != b);
        assertTrue(b != c);
        assertTrue(a != c);
    }
}
