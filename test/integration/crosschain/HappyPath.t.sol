// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CrossChainE2EBase} from "./CrossChainE2EBase.sol";
import {GuardedTarget} from "../../mocks/commons/crosschain/E2ETargets.sol";

/// @title CrossChainHappyPathTest
/// @notice The paths a correctly wired, correctly funded lane takes.
/// @dev Covers plan section A.
contract CrossChainHappyPathTest is CrossChainE2EBase {
    /// @notice The whole loop: a proposal on the origin DAO ends up executing
    ///         an action on the destination DAO.
    function test_e2e_originProposalExecutesActionOnDestinationDao() public {
        _on(origin);

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );

        assertEq(destination.target.cancellations(), 0, "not delivered yet");

        (, bool success) = _deliverNext(origin, destination);

        assertTrue(success, "bridge-level delivery should succeed");
        _assertExecuted(destination, txId);

        assertEq(destination.target.cancellations(), 1, "action should have run");
        assertEq(
            destination.target.lastCaller(),
            address(destination.dao),
            "the DAO, not the controller or adapter, must be the caller"
        );
    }
}
