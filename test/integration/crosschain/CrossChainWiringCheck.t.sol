// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";

import {CrossChainController} from "../../../src/common/crosschain/CrossChainController.sol";
import {CCIPAdapter} from "../../../src/common/crosschain/adapters/CCIP/CCIPAdapter.sol";

import {CCIPRouterMock} from "../../mocks/commons/crosschain/CCIPRouterMock.sol";
import {CrossChainControllerDAOMock} from "../../mocks/commons/crosschain/CrossChainControllerDAOMock.sol";
import {ERC20Mock} from "../../mocks/commons/token/ERC20Mock.sol";

import {CrossChainWiringCheck} from "../../../scripts/crosschain/CrossChainWiringCheck.sol";

/// @notice Unit suite for `CrossChainWiringCheck` (`scripts/crosschain/CrossChainWiringCheck.sol`),
///         proving the checker actually detects every footgun it claims to,
///         rather than trivially reporting "ok" on everything.
/// @dev Setup mirrors `test/common/crosschain/CCIPAdapter.t.sol`: a REAL
///      `CrossChainController` + `CCIPAdapter` pair, owned by a
///      `CrossChainControllerDAOMock` (per-`(where, who, permissionId)`
///      settable, unlike the single global flag on `DAOMock`) so individual
///      permissions can be revoked one at a time.
///
///      `setUp` builds ONE fully-correct lane (chain `CHAIN_BASE`). Every
///      test either:
///        a) leaves it untouched and asserts `check()` reports zero failures
///           across all 12 findings (`9 + 3 * 1` expectation), or
///        b) breaks exactly one aspect of the wiring and asserts the ONE
///           `Finding` that exists to catch it flips from `ok == true` to
///           `ok == false` -- proving the checker is not vacuous.
///
///      `Finding` index layout for a single expectation (`N = 1`), per
///      `CrossChainWiringCheck.check`'s documented, fixed ordering:
///        0  identity
///        1  local-adapter registration
///        2  lane config               (per-expectation, 1 of 1)
///        3  trusted remote            (per-expectation, 1 of 1)
///        4  selector agreement        (per-expectation, 1 of 1)
///        5  permission: EXECUTE_PERMISSION
///        6  permission: FORWARD_MESSAGE_PERMISSION
///        7  permission: UPDATE_CONFIG_PERMISSION
///        8  permission: RETRY_MESSAGE_PERMISSION
///        9  permission: SWEEP_PERMISSION
///        10 permission: UPDATE_ADAPTER_CONFIG_PERMISSION
///        11 fee balance
contract CrossChainWiringCheckTest is Test {
    uint256 internal constant IDX_IDENTITY = 0;
    uint256 internal constant IDX_LOCAL_ADAPTER_REG = 1;
    uint256 internal constant IDX_LANE_CONFIG = 2;
    uint256 internal constant IDX_TRUSTED_REMOTE = 3;
    uint256 internal constant IDX_SELECTOR_AGREEMENT = 4;
    uint256 internal constant IDX_PERM_EXECUTE = 5;
    uint256 internal constant IDX_PERM_FORWARD = 6;
    uint256 internal constant IDX_PERM_UPDATE_CONFIG = 7;
    uint256 internal constant IDX_PERM_RETRY = 8;
    uint256 internal constant IDX_PERM_SWEEP = 9;
    uint256 internal constant IDX_PERM_UPDATE_ADAPTER_CONFIG = 10;
    uint256 internal constant IDX_FEE_BALANCE = 11;
    uint256 internal constant FINDINGS_COUNT_FOR_ONE_LANE = 12; // 9 + 3 * 1

    uint256 internal constant CHAIN_BASE = 8453;
    uint64 internal constant SEL_BASE = 15971525489660198786;
    // A second, real CCIP selector used only to desync the receive-side map
    // away from the controller's send-side config in isolation.
    uint64 internal constant SEL_BASE_SEPOLIA = 10344971235874465080;

    CrossChainControllerDAOMock internal daoMock;
    CrossChainController internal controller;
    CCIPAdapter internal adapter;
    CCIPRouterMock internal router;

    /// @dev The remote chain's CONTROLLER -- the correct `trustedRemote` value.
    address internal remoteController;
    /// @dev The remote chain's ADAPTER -- the correct `chainToAdapter[].remoteAdapter`
    ///      value. NEVER a valid `trustedRemote`.
    address internal remoteAdapter;

    bytes32 internal constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");
    bytes32 internal FORWARD_MESSAGE_PERMISSION_ID;
    bytes32 internal UPDATE_CONFIG_PERMISSION_ID;
    bytes32 internal RETRY_MESSAGE_PERMISSION_ID;
    bytes32 internal SWEEP_PERMISSION_ID;
    bytes32 internal UPDATE_ADAPTER_CONFIG_PERMISSION_ID;

    function setUp() public {
        daoMock = new CrossChainControllerDAOMock();
        controller = new CrossChainController(address(daoMock));
        router = new CCIPRouterMock();

        remoteController = makeAddr("remoteController");
        remoteAdapter = makeAddr("remoteAdapter");

        adapter = new CCIPAdapter(
            address(controller),
            address(router),
            address(0), // native fee token
            _uint256s(CHAIN_BASE),
            _addresses(remoteController), // trusted remotes: remote CONTROLLER
            _uint256s(CHAIN_BASE),
            _uint64s(SEL_BASE)
        );

        FORWARD_MESSAGE_PERMISSION_ID = controller.FORWARD_MESSAGE_PERMISSION_ID();
        UPDATE_CONFIG_PERMISSION_ID = controller.UPDATE_CONFIG_PERMISSION_ID();
        RETRY_MESSAGE_PERMISSION_ID = controller.RETRY_MESSAGE_PERMISSION_ID();
        SWEEP_PERMISSION_ID = controller.SWEEP_PERMISSION_ID();
        UPDATE_ADAPTER_CONFIG_PERMISSION_ID = adapter.UPDATE_ADAPTER_CONFIG_PERMISSION_ID();

        // Lane config (send side): grant this test contract UPDATE_CONFIG_PERMISSION
        // just long enough to call `updateConfig`, mirroring `CCIPAdapter.t.sol`'s
        // `_registerLane` helper.
        daoMock.setHasPermission(address(controller), address(this), UPDATE_CONFIG_PERMISSION_ID, true);
        uint256[] memory ids = _uint256s(CHAIN_BASE);
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = CrossChainController.ChainConfig({
            localAdapter: address(adapter),
            remoteAdapter: remoteAdapter,
            bridgeChainId: SEL_BASE
        });
        controller.updateConfig(ids, configs);
        daoMock.setHasPermission(address(controller), address(this), UPDATE_CONFIG_PERMISSION_ID, false);

        // The full, correct permission set a real deployment must grant to the DAO.
        _grantAllRequiredPermissions();

        // Fee balance: the controller pays natively.
        vm.deal(address(controller), 1 ether);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function _grantAllRequiredPermissions() internal {
        daoMock.setHasPermission(address(daoMock), address(controller), EXECUTE_PERMISSION_ID, true);
        daoMock.setHasPermission(address(controller), address(daoMock), FORWARD_MESSAGE_PERMISSION_ID, true);
        daoMock.setHasPermission(address(controller), address(daoMock), UPDATE_CONFIG_PERMISSION_ID, true);
        daoMock.setHasPermission(address(controller), address(daoMock), RETRY_MESSAGE_PERMISSION_ID, true);
        daoMock.setHasPermission(address(controller), address(daoMock), SWEEP_PERMISSION_ID, true);
        daoMock.setHasPermission(address(adapter), address(daoMock), UPDATE_ADAPTER_CONFIG_PERMISSION_ID, true);
    }

    function _correctExpectations() internal view returns (CrossChainWiringCheck.Expectation[] memory exp) {
        exp = new CrossChainWiringCheck.Expectation[](1);
        exp[0] = CrossChainWiringCheck.Expectation({
            chainId: CHAIN_BASE,
            expectedRemoteController: remoteController,
            expectedRemoteAdapter: remoteAdapter,
            expectedSelector: SEL_BASE
        });
    }

    function _check(CrossChainWiringCheck.Expectation[] memory expectations)
        internal
        view
        returns (CrossChainWiringCheck.Finding[] memory findings, uint256 failures)
    {
        (findings, failures) = CrossChainWiringCheck.check(
            address(controller),
            address(adapter),
            address(daoMock),
            expectations,
            1 // minFeeBalance
        );
    }

    function _uint256s(uint256 _a) internal pure returns (uint256[] memory out) {
        out = new uint256[](1);
        out[0] = _a;
    }

    function _addresses(address _a) internal pure returns (address[] memory out) {
        out = new address[](1);
        out[0] = _a;
    }

    function _uint64s(uint64 _a) internal pure returns (uint64[] memory out) {
        out = new uint64[](1);
        out[0] = _a;
    }

    /// @dev `CrossChainWiringCheck` has only `internal` functions, so a direct
    ///      call to `requireOk` is inlined into the caller with no CALL frame
    ///      of its own -- `vm.expectRevert` has nothing to intercept. Routing
    ///      through `this.` forces a real external call boundary.
    function _requireOkExternal(CrossChainWiringCheck.Finding[] memory findings, uint256 failures) external pure {
        CrossChainWiringCheck.requireOk(findings, failures);
    }

    // =========================================================================
    // Baseline: fully correct wiring.
    // =========================================================================

    function test_check_fullyCorrectWiring_hasZeroFailures() public view {
        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());

        assertEq(findings.length, FINDINGS_COUNT_FOR_ONE_LANE, "finding count must match 9 + 3*N for N=1");
        assertEq(failures, 0, "correctly wired stack must report zero failures");
        for (uint256 i = 0; i < findings.length; i++) {
            assertTrue(findings[i].ok, findings[i].what);
        }
    }

    function test_requireOk_doesNotRevertWhenThereAreNoFailures() public view {
        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());
        CrossChainWiringCheck.requireOk(findings, failures); // must not revert
    }

    // =========================================================================
    // Footgun 1: trusted remote set to the remote ADAPTER instead of the
    //            remote CONTROLLER.
    // =========================================================================

    function test_check_flagsTrustedRemoteSetToRemoteAdapterInsteadOfController() public {
        daoMock.setHasPermission(address(adapter), address(this), UPDATE_ADAPTER_CONFIG_PERMISSION_ID, true);
        // WRONG: copy-pasted the remote ADAPTER where the remote CONTROLLER belongs.
        adapter.setTrustedRemotes(_uint256s(CHAIN_BASE), _addresses(remoteAdapter));
        daoMock.setHasPermission(address(adapter), address(this), UPDATE_ADAPTER_CONFIG_PERMISSION_ID, false);

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());

        assertFalse(findings[IDX_TRUSTED_REMOTE].ok, "trusted-remote-is-remote-adapter footgun must be flagged");
        assertGt(failures, 0);
        // Unaffected: the controller's own lane config never changed.
        assertTrue(findings[IDX_LANE_CONFIG].ok, "lane config must be unaffected by this footgun");
    }

    // =========================================================================
    // Footgun 2: controller lane `remoteAdapter` set to the remote CONTROLLER
    //            instead of the remote ADAPTER.
    // =========================================================================

    function test_check_flagsLaneRemoteAdapterSetToRemoteControllerInsteadOfRemoteAdapter() public {
        daoMock.setHasPermission(address(controller), address(this), UPDATE_CONFIG_PERMISSION_ID, true);
        CrossChainController.ChainConfig[] memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = CrossChainController.ChainConfig({
            localAdapter: address(adapter),
            remoteAdapter: remoteController, // WRONG: should be `remoteAdapter`
            bridgeChainId: SEL_BASE
        });
        controller.updateConfig(_uint256s(CHAIN_BASE), configs);
        daoMock.setHasPermission(address(controller), address(this), UPDATE_CONFIG_PERMISSION_ID, false);

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());

        assertFalse(findings[IDX_LANE_CONFIG].ok, "lane config must flag remoteAdapter != expected remote ADAPTER");
        assertGt(failures, 0);
    }

    // =========================================================================
    // Footgun 3: controller `bridgeChainId` disagreeing with the adapter's
    //            own `_chainIdToSelector` (desync), isolated from the other
    //            checks by touching ONLY the adapter's receive-side map.
    // =========================================================================

    function test_check_flagsBridgeChainIdDesyncBetweenControllerAndAdapter() public {
        daoMock.setHasPermission(address(adapter), address(this), UPDATE_ADAPTER_CONFIG_PERMISSION_ID, true);
        // The adapter's own map now disagrees with the controller's still-unchanged
        // `bridgeChainId` (SEL_BASE) for the same chain id.
        adapter.setChainSelectors(_uint256s(CHAIN_BASE), _uint64s(SEL_BASE_SEPOLIA));
        daoMock.setHasPermission(address(adapter), address(this), UPDATE_ADAPTER_CONFIG_PERMISSION_ID, false);

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());

        assertFalse(findings[IDX_SELECTOR_AGREEMENT].ok, "selector desync between controller and adapter must be flagged");
        assertGt(failures, 0);
        // Isolated: the controller's lane config and the adapter's trusted
        // remote never changed, so both stay green.
        assertTrue(findings[IDX_LANE_CONFIG].ok, "lane config must be unaffected by a receive-side-only desync");
        assertTrue(findings[IDX_TRUSTED_REMOTE].ok, "trusted remote must be unaffected by a receive-side-only desync");
    }

    // =========================================================================
    // Footgun 4: adapter selector map missing entirely (unmapped chain id).
    // =========================================================================

    function test_check_flagsMissingAdapterSelectorMapping() public {
        daoMock.setHasPermission(address(adapter), address(this), UPDATE_ADAPTER_CONFIG_PERMISSION_ID, true);
        // Selector `0` clears the mapping in both directions -- see `CCIPAdapter._setChainSelectors`.
        adapter.setChainSelectors(_uint256s(CHAIN_BASE), _uint64s(0));
        daoMock.setHasPermission(address(adapter), address(this), UPDATE_ADAPTER_CONFIG_PERMISSION_ID, false);

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());

        assertFalse(findings[IDX_SELECTOR_AGREEMENT].ok, "an unmapped adapter selector must be flagged, not silently ignored");
        assertGt(failures, 0);
        assertTrue(findings[IDX_LANE_CONFIG].ok, "lane config must be unaffected by clearing the adapter's own map");
    }

    // =========================================================================
    // Footgun 5: lane not configured at all.
    // =========================================================================

    function test_check_flagsLaneNotConfiguredAtAll() public {
        daoMock.setHasPermission(address(controller), address(this), UPDATE_CONFIG_PERMISSION_ID, true);
        // An all-zero `ChainConfig` clears the lane entirely.
        CrossChainController.ChainConfig[] memory cleared = new CrossChainController.ChainConfig[](1);
        controller.updateConfig(_uint256s(CHAIN_BASE), cleared);
        daoMock.setHasPermission(address(controller), address(this), UPDATE_CONFIG_PERMISSION_ID, false);

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());

        assertFalse(findings[IDX_LANE_CONFIG].ok, "a fully-cleared lane must be flagged as not configured");
        assertGt(failures, 0);
        // A side effect of clearing the adapter's LAST lane: it is
        // de-registered too, so this finding legitimately flips as well.
        assertFalse(
            findings[IDX_LOCAL_ADAPTER_REG].ok,
            "clearing the last lane must also de-register the local adapter"
        );
    }

    // =========================================================================
    // Footgun 6: missing permissions.
    // =========================================================================

    function test_check_flagsMissingExecutePermission() public {
        daoMock.setHasPermission(address(daoMock), address(controller), EXECUTE_PERMISSION_ID, false);

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());

        assertFalse(findings[IDX_PERM_EXECUTE].ok, "missing EXECUTE_PERMISSION must be flagged");
        assertGt(failures, 0);
    }

    function test_check_flagsMissingForwardMessagePermission() public {
        daoMock.setHasPermission(address(controller), address(daoMock), FORWARD_MESSAGE_PERMISSION_ID, false);

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());

        assertFalse(findings[IDX_PERM_FORWARD].ok, "missing FORWARD_MESSAGE_PERMISSION must be flagged");
        assertGt(failures, 0);
    }

    function test_check_flagsMissingUpdateConfigPermission() public {
        daoMock.setHasPermission(address(controller), address(daoMock), UPDATE_CONFIG_PERMISSION_ID, false);

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());

        assertFalse(findings[IDX_PERM_UPDATE_CONFIG].ok, "missing UPDATE_CONFIG_PERMISSION must be flagged");
        assertGt(failures, 0);
    }

    function test_check_flagsMissingRetryMessagePermission() public {
        daoMock.setHasPermission(address(controller), address(daoMock), RETRY_MESSAGE_PERMISSION_ID, false);

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());

        assertFalse(findings[IDX_PERM_RETRY].ok, "missing RETRY_MESSAGE_PERMISSION must be flagged");
        assertGt(failures, 0);
    }

    function test_check_flagsMissingSweepPermission() public {
        daoMock.setHasPermission(address(controller), address(daoMock), SWEEP_PERMISSION_ID, false);

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());

        assertFalse(findings[IDX_PERM_SWEEP].ok, "missing SWEEP_PERMISSION must be flagged");
        assertGt(failures, 0);
    }

    function test_check_flagsMissingUpdateAdapterConfigPermission() public {
        daoMock.setHasPermission(address(adapter), address(daoMock), UPDATE_ADAPTER_CONFIG_PERMISSION_ID, false);

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());

        assertFalse(findings[IDX_PERM_UPDATE_ADAPTER_CONFIG].ok, "missing UPDATE_ADAPTER_CONFIG_PERMISSION must be flagged");
        assertGt(failures, 0);
    }

    // =========================================================================
    // Footgun 7: zero fee balance.
    // =========================================================================

    function test_check_flagsZeroFeeBalance() public {
        vm.deal(address(controller), 0);

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());

        assertFalse(findings[IDX_FEE_BALANCE].ok, "an empty controller must be flagged, regardless of minFeeBalance");
        assertGt(failures, 0);
    }

    /// @dev `minFeeBalance == 0` must not be usable to trivially pass the fee
    ///      check on an empty controller -- see the library's `_checkFeeBalance`.
    function test_check_zeroMinFeeBalanceDoesNotMaskAnEmptyController() public {
        vm.deal(address(controller), 0);

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = CrossChainWiringCheck.check(
            address(controller), address(adapter), address(daoMock), _correctExpectations(), 0
        );

        assertFalse(findings[IDX_FEE_BALANCE].ok, "balance must be non-zero even when minFeeBalance is 0");
        assertGt(failures, 0);
    }

    // =========================================================================
    // requireOk reverts when there is at least one failure.
    // =========================================================================

    function test_requireOk_revertsWhenThereIsAtLeastOneFailure() public {
        daoMock.setHasPermission(address(daoMock), address(controller), EXECUTE_PERMISSION_ID, false);
        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = _check(_correctExpectations());
        assertGt(failures, 0, "precondition: at least one failure");

        vm.expectRevert(
            abi.encodeWithSelector(CrossChainWiringCheck.WiringCheckFailed.selector, failures, findings.length)
        );
        this._requireOkExternal(findings, failures);
    }

    // =========================================================================
    // Identity check (sanity, not one of the seven numbered footguns above).
    // =========================================================================

    function test_check_flagsAdapterPointingAtTheWrongController() public {
        CrossChainController otherController = new CrossChainController(address(daoMock));

        (CrossChainWiringCheck.Finding[] memory findings, uint256 failures) = CrossChainWiringCheck.check(
            address(otherController), address(adapter), address(daoMock), _correctExpectations(), 1
        );

        assertFalse(findings[IDX_IDENTITY].ok, "adapter.CROSS_CHAIN_CONTROLLER() must be checked against the passed-in controller");
        assertGt(failures, 0);
    }
}
