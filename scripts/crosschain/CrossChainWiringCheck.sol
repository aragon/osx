// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {IDAO} from "../../src/common/dao/IDAO.sol";
import {CrossChainController} from "../../src/common/crosschain/CrossChainController.sol";
import {CCIPAdapter} from "../../src/common/crosschain/adapters/CCIP/CCIPAdapter.sol";

/// @title CrossChainWiringCheck
/// @notice Deployment-time wiring verification for a `CrossChainController` +
///         `CCIPAdapter` pair, kept as a `library` (rather than baked into a
///         `Script`) purely so it is unit-testable with `forge test` against
///         mocked controllers/adapters/DAOs.
/// @dev COLLECTS FAILURES, DOES NOT REVERT ON THE FIRST ONE. A deployment-time
///      checker that stops at the first problem hides every problem behind
///      it, which is exactly the wrong property for something meant to be run
///      once, read carefully, and acted on. Every check below always runs and
///      always produces a `Finding`; `requireOk` is the caller's opportunity
///      to fail loudly (e.g. in CI) once every finding has been printed.
///
///      Mirrors, and is intentionally redundant with, the two consistency
///      helpers already on-chain (`BaseAdapter.assertTrustedRemotesMatchControllers`
///      and `.assertChainSelectorsMatchController`): those revert on the first
///      mismatch and are meant to be called from a governance-facing script
///      right before/after `updateConfig`, while this library is meant to be
///      run stand-alone, read top-to-bottom, and gives a full report even when
///      several things are wrong at once. See `VerifyCrossChain.s.sol`.
library CrossChainWiringCheck {
    /// @notice Thrown by `requireOk` when at least one `Finding` failed.
    /// @param failures The number of failing findings.
    /// @param total The total number of findings produced.
    error WiringCheckFailed(uint256 failures, uint256 total);

    /// @notice `EXECUTE_PERMISSION` as defined by `DAO.sol`. Re-declared here
    ///         (rather than imported) because it lives on the concrete `DAO`
    ///         implementation, not on `IDAO`, and this library only depends on
    ///         the interface.
    bytes32 internal constant EXECUTE_PERMISSION_ID =
        keccak256("EXECUTE_PERMISSION");

    /// @notice What a single remote lane is expected to look like, supplied by
    ///         the deployer/operator (there is nothing fully on-chain to
    ///         cross-check the REMOTE controller against -- see
    ///         `BaseAdapter.assertTrustedRemotesMatchControllers`).
    /// @param chainId The remote standard chain id.
    /// @param expectedRemoteController The remote chain's `CrossChainController`.
    ///        Belongs in the LOCAL ADAPTER's trusted-remote map.
    /// @param expectedRemoteAdapter The remote chain's `CCIPAdapter` (the
    ///        bridge-level receiver). Belongs in the LOCAL CONTROLLER's lane
    ///        config (`chainToAdapter[chainId].remoteAdapter`).
    /// @param expectedSelector The CCIP chain selector of the remote chain.
    struct Expectation {
        uint256 chainId;
        address expectedRemoteController;
        address expectedRemoteAdapter;
        uint64 expectedSelector;
    }

    /// @notice A single verification outcome.
    /// @param ok Whether the check passed.
    /// @param what A short, stable label identifying which check this is.
    /// @param detail A human-readable explanation, including every address
    ///        involved, so a failure is actionable without re-reading source.
    struct Finding {
        bool ok;
        string what;
        string detail;
    }

    // -------------------------------------------------------------------------
    // Entry point
    // -------------------------------------------------------------------------

    /// @notice Runs every wiring check and returns the full report.
    /// @dev Finding count is exactly `9 + 3 * expectations.length`:
    ///      1 (identity) + 1 (local-adapter registration) +
    ///      3 * N (per-expectation: lane config, trusted remote, selector
    ///      agreement) + 6 (permissions) + 1 (fee balance).
    /// @param controller The `CrossChainController` under test.
    /// @param adapter The `CCIPAdapter` under test.
    /// @param dao The DAO both `controller` and `adapter` should be authorized by.
    /// @param expectations The expected remote lane configuration, one per
    ///        remote chain the local pair should be wired to.
    /// @param minFeeBalance The minimum fee-token balance the controller must
    ///        hold. Must itself be non-zero; see `_checkFeeBalance`.
    /// @return findings Every check performed, in a fixed, documented order.
    /// @return failures The number of findings with `ok == false`.
    function check(
        address controller,
        address adapter,
        address dao,
        Expectation[] memory expectations,
        uint256 minFeeBalance
    ) internal view returns (Finding[] memory findings, uint256 failures) {
        uint256 n = expectations.length;
        findings = new Finding[](9 + 3 * n);
        uint256 idx = 0;

        findings[idx++] = _checkIdentity(controller, adapter, dao);
        findings[idx++] = _checkLocalAdapterRegistration(controller, adapter, n);

        for (uint256 i = 0; i < n; i++) {
            findings[idx++] = _checkLaneConfig(controller, adapter, expectations[i]);
        }
        for (uint256 i = 0; i < n; i++) {
            findings[idx++] = _checkTrustedRemote(controller, adapter, expectations[i]);
        }
        for (uint256 i = 0; i < n; i++) {
            findings[idx++] = _checkSelectorAgreement(controller, adapter, expectations[i]);
        }

        Finding[6] memory permFindings = _checkPermissions(controller, adapter, dao);
        for (uint256 i = 0; i < 6; i++) {
            findings[idx++] = permFindings[i];
        }

        findings[idx++] = _checkFeeBalance(controller, adapter, minFeeBalance);

        for (uint256 i = 0; i < findings.length; i++) {
            if (!findings[i].ok) failures++;
        }
    }

    /// @notice Reverts with `WiringCheckFailed` if any finding failed.
    /// @dev Intended to be called after every finding has already been
    ///      printed (see `VerifyCrossChain.s.sol`), so the revert reason only
    ///      needs to summarize, not enumerate.
    /// @param findings The findings produced by `check`.
    /// @param failures The failure count produced by `check`.
    function requireOk(
        Finding[] memory findings,
        uint256 failures
    ) internal pure {
        if (failures != 0) {
            revert WiringCheckFailed(failures, findings.length);
        }
    }

    // -------------------------------------------------------------------------
    // 1. Identity: adapter <-> controller <-> dao cross-references.
    // -------------------------------------------------------------------------

    function _checkIdentity(
        address controllerAddr,
        address adapterAddr,
        address daoAddr
    ) private view returns (Finding memory) {
        CrossChainController controller = CrossChainController(payable(controllerAddr));
        CCIPAdapter adapter = CCIPAdapter(adapterAddr);

        address adapterController = adapter.CROSS_CHAIN_CONTROLLER();
        address controllerDao = address(controller.dao());
        address adapterDao = address(adapter.dao());

        bool ok = adapterController == controllerAddr &&
            controllerDao == daoAddr &&
            adapterDao == daoAddr;

        string memory detail = string.concat(
            "adapter.CROSS_CHAIN_CONTROLLER()=", Strings.toHexString(adapterController),
            " (expected controller=", Strings.toHexString(controllerAddr), "); "
        );
        detail = string.concat(detail, "controller.dao()=", Strings.toHexString(controllerDao));
        detail = string.concat(detail, ", adapter.dao()=", Strings.toHexString(adapterDao));
        detail = string.concat(detail, " (expected dao=", Strings.toHexString(daoAddr), ")");

        return Finding({
            ok: ok,
            what: "identity: adapter.CROSS_CHAIN_CONTROLLER == controller && controller.dao == adapter.dao == dao",
            detail: detail
        });
    }

    // -------------------------------------------------------------------------
    // 2. The adapter must be registered as a local adapter for exactly as many
    //    lanes as expectations were supplied.
    // -------------------------------------------------------------------------

    function _checkLocalAdapterRegistration(
        address controllerAddr,
        address adapterAddr,
        uint256 expectedLaneCount
    ) private view returns (Finding memory) {
        CrossChainController controller = CrossChainController(payable(controllerAddr));

        bool isRegistered = controller.isRegisteredLocalAdapter(adapterAddr);
        uint256 laneCount = controller.localAdapterLaneCount(adapterAddr);

        bool ok = isRegistered && laneCount == expectedLaneCount;

        return Finding({
            ok: ok,
            what: "controller.isRegisteredLocalAdapter(adapter) && controller.localAdapterLaneCount(adapter) == expectations.length",
            detail: string.concat(
                "adapter=", Strings.toHexString(adapterAddr),
                " isRegisteredLocalAdapter=", isRegistered ? "true" : "false",
                ", localAdapterLaneCount=", Strings.toString(laneCount),
                " (expected=", Strings.toString(expectedLaneCount), ")"
            )
        });
    }

    // -------------------------------------------------------------------------
    // 3. Per-expectation lane config on the CONTROLLER (send side).
    // -------------------------------------------------------------------------

    function _checkLaneConfig(
        address controllerAddr,
        address adapterAddr,
        Expectation memory expectation
    ) private view returns (Finding memory) {
        CrossChainController controller = CrossChainController(payable(controllerAddr));

        (address localAdapter, address remoteAdapter, uint64 bridgeChainId) =
            controller.chainToAdapter(expectation.chainId);

        bool fullyConfigured = localAdapter != address(0) &&
            remoteAdapter != address(0) &&
            bridgeChainId != 0;
        bool ok = fullyConfigured &&
            localAdapter == adapterAddr &&
            remoteAdapter == expectation.expectedRemoteAdapter &&
            bridgeChainId == expectation.expectedSelector;

        string memory detail = string.concat(
            "chainId=", Strings.toString(expectation.chainId),
            ": localAdapter=", Strings.toHexString(localAdapter),
            " (expected=", Strings.toHexString(adapterAddr), "), "
        );
        detail = string.concat(
            detail,
            "remoteAdapter=", Strings.toHexString(remoteAdapter),
            " (expected remote ADAPTER=", Strings.toHexString(expectation.expectedRemoteAdapter), "), "
        );
        detail = string.concat(
            detail,
            "bridgeChainId=", Strings.toString(uint256(bridgeChainId)),
            " (expected selector=", Strings.toString(uint256(expectation.expectedSelector)), ")"
        );
        if (!fullyConfigured) {
            detail = string.concat(detail, " -- LANE NOT CONFIGURED (some field is zero)");
        }

        return Finding({
            ok: ok,
            what: "controller.chainToAdapter(chainId): fully configured, localAdapter == adapter, remoteAdapter == expected remote ADAPTER, bridgeChainId == expected selector",
            detail: detail
        });
    }

    // -------------------------------------------------------------------------
    // 4. Per-expectation trusted remote on the ADAPTER (receive side).
    // -------------------------------------------------------------------------

    function _checkTrustedRemote(
        address controllerAddr,
        address adapterAddr,
        Expectation memory expectation
    ) private view returns (Finding memory) {
        CrossChainController controller = CrossChainController(payable(controllerAddr));
        CCIPAdapter adapter = CCIPAdapter(adapterAddr);

        address trusted = adapter.trustedRemote(expectation.chainId);
        (, address configuredRemoteAdapter, ) = controller.chainToAdapter(expectation.chainId);

        bool isRemoteAdapterConfused = trusted != address(0) &&
            configuredRemoteAdapter != address(0) &&
            trusted == configuredRemoteAdapter;

        bool ok = trusted != address(0) &&
            trusted == expectation.expectedRemoteController &&
            !isRemoteAdapterConfused;

        string memory detail = string.concat(
            "chainId=", Strings.toString(expectation.chainId),
            ": trustedRemote=", Strings.toHexString(trusted),
            " (expected remote CONTROLLER=", Strings.toHexString(expectation.expectedRemoteController), "), "
        );
        detail = string.concat(detail, "lane remoteAdapter=", Strings.toHexString(configuredRemoteAdapter));
        if (isRemoteAdapterConfused) {
            detail = string.concat(
                detail,
                " -- FOOTGUN: trusted remote points at the remote ADAPTER instead of the remote CONTROLLER; ",
                "every inbound message from this chain will be rejected as untrusted"
            );
        }

        return Finding({
            ok: ok,
            what: "adapter.trustedRemote(chainId) == expected remote CONTROLLER, non-zero, and != the lane's remoteAdapter",
            detail: detail
        });
    }

    // -------------------------------------------------------------------------
    // 5. Per-expectation chain-id <-> selector agreement between the
    //    controller's send-side config and the adapter's receive-side map.
    // -------------------------------------------------------------------------

    function _checkSelectorAgreement(
        address controllerAddr,
        address adapterAddr,
        Expectation memory expectation
    ) private view returns (Finding memory) {
        CrossChainController controller = CrossChainController(payable(controllerAddr));
        CCIPAdapter adapter = CCIPAdapter(adapterAddr);

        (, , uint64 controllerBridgeChainId) = controller.chainToAdapter(expectation.chainId);

        bool forwardOk;
        uint256 forwardValue;
        try adapter.toNativeChainId(expectation.chainId) returns (uint256 v) {
            forwardOk = true;
            forwardValue = v;
        } catch {
            forwardOk = false;
        }

        bool reverseOk;
        uint256 reverseValue;
        try adapter.fromNativeChainId(uint256(expectation.expectedSelector)) returns (uint256 v) {
            reverseOk = true;
            reverseValue = v;
        } catch {
            reverseOk = false;
        }

        bool ok = forwardOk &&
            forwardValue == uint256(controllerBridgeChainId) &&
            reverseOk &&
            reverseValue == expectation.chainId;

        string memory forwardStr = forwardOk
            ? Strings.toString(forwardValue)
            : "REVERTED (UNKNOWN_CHAIN_ID -- unmapped on the adapter)";
        string memory reverseStr = reverseOk
            ? Strings.toString(reverseValue)
            : "REVERTED (UNKNOWN_NATIVE_CHAIN_ID -- unmapped on the adapter)";

        string memory detail = string.concat(
            "chainId=", Strings.toString(expectation.chainId),
            ": controller.bridgeChainId=", Strings.toString(uint256(controllerBridgeChainId)),
            ", adapter.toNativeChainId(chainId)=", forwardStr
        );
        detail = string.concat(
            detail,
            "; expectedSelector=", Strings.toString(uint256(expectation.expectedSelector)),
            ", adapter.fromNativeChainId(expectedSelector)=", reverseStr
        );

        return Finding({
            ok: ok,
            what: "adapter.toNativeChainId(chainId) == controller.chainToAdapter(chainId).bridgeChainId && adapter.fromNativeChainId(selector) == chainId",
            detail: detail
        });
    }

    // -------------------------------------------------------------------------
    // 6. Permissions.
    // -------------------------------------------------------------------------

    /// @dev Fixed-size array (not `Finding[] memory` built with `push`,
    ///      unavailable for memory arrays) so the caller can splice it into
    ///      the full report with a plain loop.
    function _checkPermissions(
        address controllerAddr,
        address adapterAddr,
        address daoAddr
    ) private view returns (Finding[6] memory findings) {
        CrossChainController controller = CrossChainController(payable(controllerAddr));
        CCIPAdapter adapter = CCIPAdapter(adapterAddr);
        findings[0] = _permissionFinding(
            _hasPermission(daoAddr, daoAddr, controllerAddr, EXECUTE_PERMISSION_ID),
            "EXECUTE_PERMISSION",
            daoAddr,
            controllerAddr,
            EXECUTE_PERMISSION_ID,
            "controller (who) must hold EXECUTE_PERMISSION on the DAO (where) so its inbound messages can execute DAO actions"
        );

        bytes32 forwardId = controller.FORWARD_MESSAGE_PERMISSION_ID();
        findings[1] = _permissionFinding(
            _hasPermission(daoAddr, controllerAddr, daoAddr, forwardId),
            "FORWARD_MESSAGE_PERMISSION",
            controllerAddr,
            daoAddr,
            forwardId,
            "the DAO (who), or its governance plugin, must hold FORWARD_MESSAGE_PERMISSION on the controller (where) to originate outbound messages"
        );

        bytes32 updateConfigId = controller.UPDATE_CONFIG_PERMISSION_ID();
        findings[2] = _permissionFinding(
            _hasPermission(daoAddr, controllerAddr, daoAddr, updateConfigId),
            "UPDATE_CONFIG_PERMISSION",
            controllerAddr,
            daoAddr,
            updateConfigId,
            "the DAO (who) ONLY must hold UPDATE_CONFIG_PERMISSION on the controller (where) -- this is effectively root on the DAO, see CrossChainController's security note; NEVER grant it to an EOA"
        );

        bytes32 retryId = controller.RETRY_MESSAGE_PERMISSION_ID();
        findings[3] = _permissionFinding(
            _hasPermission(daoAddr, controllerAddr, daoAddr, retryId),
            "RETRY_MESSAGE_PERMISSION",
            controllerAddr,
            daoAddr,
            retryId,
            "the DAO (who) must hold RETRY_MESSAGE_PERMISSION on the controller (where) to retry failed inbound messages"
        );

        bytes32 sweepId = controller.SWEEP_PERMISSION_ID();
        findings[4] = _permissionFinding(
            _hasPermission(daoAddr, controllerAddr, daoAddr, sweepId),
            "SWEEP_PERMISSION",
            controllerAddr,
            daoAddr,
            sweepId,
            "the DAO (who) must hold SWEEP_PERMISSION on the controller (where) to recover pre-funded fee assets"
        );

        bytes32 updateAdapterConfigId = adapter.UPDATE_ADAPTER_CONFIG_PERMISSION_ID();
        findings[5] = _permissionFinding(
            _hasPermission(daoAddr, adapterAddr, daoAddr, updateAdapterConfigId),
            "UPDATE_ADAPTER_CONFIG_PERMISSION",
            adapterAddr,
            daoAddr,
            updateAdapterConfigId,
            "the DAO (who) must hold UPDATE_ADAPTER_CONFIG_PERMISSION on the adapter (where) to manage trusted remotes / chain selectors"
        );
    }

    /// @dev Reads a permission through a raw `staticcall` rather than a typed
    ///      call. A wiring check must be able to REPORT a broken deployment,
    ///      and the most broken deployments are exactly the ones where `dao`
    ///      is not a conforming `IDAO` — a stale address, an EOA, a
    ///      proxy that was never initialized. A typed call to a codeless
    ///      address reverts in THIS frame (Solidity's `extcodesize` guard),
    ///      which `try/catch` cannot intercept, and would abort the whole
    ///      report instead of failing one finding.
    /// @return granted True only if the call succeeded and returned `true`.
    function _hasPermission(
        address daoAddr,
        address where,
        address who,
        bytes32 permissionId
    ) private view returns (bool granted) {
        (bool success, bytes memory data) = daoAddr.staticcall(
            abi.encodeCall(IDAO.hasPermission, (where, who, permissionId, ""))
        );
        return success && data.length == 32 && abi.decode(data, (bool));
    }

    function _permissionFinding(
        bool granted,
        string memory permissionName,
        address where,
        address who,
        bytes32 permissionId,
        string memory note
    ) private pure returns (Finding memory) {
        string memory detail = string.concat(
            "dao.hasPermission(where=", Strings.toHexString(where),
            ", who=", Strings.toHexString(who),
            ", id=", Strings.toHexString(uint256(permissionId), 32)
        );
        detail = string.concat(detail, ")=", granted ? "true" : "false");
        detail = string.concat(detail, " -- ", note);

        return Finding({
            ok: granted,
            what: string.concat("permission: ", permissionName),
            detail: detail
        });
    }

    // -------------------------------------------------------------------------
    // 7. Fee balance.
    // -------------------------------------------------------------------------

    function _checkFeeBalance(
        address controllerAddr,
        address adapterAddr,
        uint256 minFeeBalance
    ) private view returns (Finding memory) {
        CCIPAdapter adapter = CCIPAdapter(adapterAddr);
        address feeToken = adapter.FEE_TOKEN();

        uint256 balance = feeToken == address(0)
            ? controllerAddr.balance
            : IERC20(feeToken).balanceOf(controllerAddr);

        // `minFeeBalance == 0` would trivially pass a plain `balance >=
        // minFeeBalance` comparison even with an empty controller, defeating
        // the whole point of this check; require the balance to actually be
        // non-zero regardless of what threshold the operator passed in.
        bool ok = balance > 0 && balance >= minFeeBalance;

        string memory detail = string.concat(
            "feeToken=", feeToken == address(0) ? "native" : Strings.toHexString(feeToken),
            ", controller=", Strings.toHexString(controllerAddr)
        );
        detail = string.concat(detail, ", balance=", Strings.toString(balance));
        detail = string.concat(detail, ", minFeeBalance=", Strings.toString(minFeeBalance));

        return Finding({
            ok: ok,
            what: "controller holds enough fee-token balance to pay for at least one send (balance > 0 && balance >= minFeeBalance)",
            detail: detail
        });
    }
}
