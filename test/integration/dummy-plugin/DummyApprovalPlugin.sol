// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {PluginUUPSUpgradeable} from "../../../src/common/plugin/PluginUUPSUpgradeable.sol";
import {IDAO} from "../../../src/common/dao/IDAO.sol";
import {Action} from "../../../src/common/executors/IExecutor.sol";

/// @notice ────────── DUMMY PLUGIN — TEST FIXTURE ONLY ──────────
///
/// This is NOT a real governance plugin. It is a deliberately minimal
/// upgradeable test fixture used by the integration smoke tests to drive a
/// generic "propose → approve → execute" flow against the DAO + PSP stack.
///
/// V1 surface:
///   - `propose(actions)`   — caller with PROPOSE_PERMISSION queues actions
///   - `approve()`          — single approver flips the approval bit
///   - `executeAfterApproval()` — anyone can trigger once approved; the
///                                plugin forwards the queued actions to the
///                                DAO via `_execute`
///
/// Do not confuse this with TokenVoting, Multisig, Admin, or any other
/// production Aragon plugin.
contract DummyApprovalPluginV1 is PluginUUPSUpgradeable {
    bytes32 public constant PROPOSE_PERMISSION_ID = keccak256("DUMMY_PROPOSE_PERMISSION");
    bytes32 public constant APPROVE_PERMISSION_ID = keccak256("DUMMY_APPROVE_PERMISSION");

    bool public approved;
    bool public hasProposal;
    Action[] internal pendingActions;

    error NoProposal();
    error MissingApproval();
    error ProposalActive();

    event Proposed(uint256 actionCount);
    event Approved();
    event Executed();

    function initialize(IDAO _dao) external initializer {
        __PluginUUPSUpgradeable_init(_dao);
    }

    /// @dev Variant used to identify the build at runtime in tests.
    function version() public pure virtual returns (uint8) {
        return 1;
    }

    function propose(Action[] memory _actions) external auth(PROPOSE_PERMISSION_ID) {
        if (hasProposal && approved) revert ProposalActive();
        delete pendingActions;
        for (uint256 i = 0; i < _actions.length; i++) {
            pendingActions.push(_actions[i]);
        }
        approved = false;
        hasProposal = true;
        emit Proposed(_actions.length);
    }

    function approve() external auth(APPROVE_PERMISSION_ID) {
        if (!hasProposal) revert NoProposal();
        approved = true;
        emit Approved();
    }

    function executeAfterApproval() external virtual {
        if (!hasProposal) revert NoProposal();
        if (!approved) revert MissingApproval();
        Action[] memory actions = pendingActions;
        approved = false;
        hasProposal = false;
        delete pendingActions;
        _execute(bytes32(uint256(uint160(address(this)))), actions, 0);
        emit Executed();
    }
}

/// @notice Dummy V2 — adds genuine new behaviour over V1 so the
/// `prepareUpdate` path actually has something to test post-upgrade:
///
///   - `executionCount` (new state var, appended after V1's storage so
///     the layout is safe) — tracks total successful executions
///   - `executeAfterApproval` override — bumps the counter on each
///     successful run
///   - `cancel()` (new function) — proposer can abort a pending,
///     un-executed proposal; emits `Cancelled`
///
/// `initializeFrom(uint16)` (reinitializer(2)) is what PSP's `applyUpdate`
/// calls via `upgradeToAndCall`. It records the prior build so the smoke
/// test can prove the reinitializer actually ran.
contract DummyApprovalPluginV2 is DummyApprovalPluginV1 {
    uint8 public upgradedFromBuild;
    uint256 public executionCount;

    error NotProposer();

    event Cancelled();
    event Executed2(uint256 newExecutionCount);

    function version() public pure virtual override returns (uint8) {
        return 2;
    }

    /// @notice Re-initialize after upgrading from a prior build. The
    /// `reinitializer(2)` modifier locks this to a one-shot call per proxy.
    function initializeFrom(uint16 _fromBuild) external reinitializer(2) {
        upgradedFromBuild = uint8(_fromBuild);
    }

    /// @notice Override: bump `executionCount` on each successful execute.
    function executeAfterApproval() external override {
        if (!hasProposal) revert NoProposal();
        if (!approved) revert MissingApproval();
        Action[] memory actions = pendingActions;
        approved = false;
        hasProposal = false;
        delete pendingActions;
        _execute(bytes32(uint256(uint160(address(this)))), actions, 0);

        // New V2 behaviour: count the execution after the inner call
        // succeeds (revert in `_execute` rolls this back).
        unchecked {
            ++executionCount;
        }
        emit Executed2(executionCount);
    }

    /// @notice V2-only capability: the caller holding PROPOSE_PERMISSION
    /// may cancel the current pending proposal at any point before its
    /// `executeAfterApproval` lands. Locks in that V2 added a function
    /// that V1 never exposed.
    function cancel() external auth(PROPOSE_PERMISSION_ID) {
        if (!hasProposal) revert NoProposal();
        hasProposal = false;
        approved = false;
        delete pendingActions;
        emit Cancelled();
    }
}
