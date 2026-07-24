// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CrossChainControllerBase} from "./Base.t.sol";

/// @notice Tests the transaction identity function (`TransactionLib.id`) that
///         `receiveMessage` derives the txId / dedup key from.
contract CrossChainControllerTransactionIdTest is CrossChainControllerBase {
    function test_isDeterministicAndInputSensitive() public view {
        bytes memory message = _emptyActionsPayload();

        bytes32 id1 = _txId(1, CHAIN_ID, message);
        bytes32 id2 = _txId(1, CHAIN_ID, message);
        assertEq(id1, id2);

        // Different nonce -> different id (the identity-carrying field).
        assertTrue(id1 != _txId(2, CHAIN_ID, message));
        // Different origin chain -> different id.
        assertTrue(id1 != _txId(1, OTHER_CHAIN_ID, message));
    }
}
