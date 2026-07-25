// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CrossChainE2EBase} from "./CrossChainE2EBase.sol";
import {Errors} from "../../../src/common/crosschain/lib/Errors.sol";
import {
    TransactionLib,
    Transaction
} from "../../../src/common/crosschain/lib/Transaction.sol";

/// @title CrossChainReplayAndIdentityTest
/// @notice What makes one cross-chain transaction distinct from another, and
///         what stops an authenticated message being replayed somewhere it was
///         not meant to run.
///
/// @dev Covers plan section E.
///
///      Every field the destination authenticates travels INSIDE the envelope,
///      so it is covered by the bridge's payload attestation rather than taken
///      on the adapter's word. The identity of a transaction is the hash of
///      that whole envelope:
///
///        keccak256(nonce, origin, controller, originChainId,
///                  destinationChainId, message)
///
///      Two of those fields exist purely to stop replays that the bridge itself
///      would happily carry out, and both are tested here:
///
///      `destinationChainId` -- because controllers are routinely deployed at
///      the SAME address on every chain (CREATE2 / deterministic deployment),
///      every destination that trusts "the origin controller" trusts the same
///      20 bytes. Without this field, a message authenticated for one chain
///      would authenticate on all of them.
///
///      `originChainId` -- checked against the chain the adapter says the
///      message actually came from, so a message cannot be laundered through a
///      second trusted lane.
contract CrossChainReplayAndIdentityTest is CrossChainE2EBase {
    /// @dev Sends and delivers one message, returning its id and envelope.
    function _deliveredMessage()
        internal
        returns (bytes32 txId, bytes memory encodedTx)
    {
        txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
        encodedTx = _queuedPayload(origin, 0);

        (, bool success) = _deliverNext(origin, destination);
        assertTrue(success);
        _assertExecuted(destination, txId);
    }

    // -------------------------------------------------------------------------
    // Straight replay
    // -------------------------------------------------------------------------

    /// @notice Re-delivering an executed message on its own lane is rejected.
    function test_replay_sameLaneReplayIsRejected() public {
        (bytes32 txId, bytes memory encodedTx) = _deliveredMessage();

        (bool success, bytes memory reason) = _forgeDelivery(
            destination,
            keccak256("replayed"),
            ORIGIN_SELECTOR,
            address(origin.controller),
            encodedTx,
            GAS_LIMIT
        );

        assertFalse(success, "a replay must be rejected");
        assertEq(
            reason,
            abi.encodeWithSelector(
                Errors.MESSAGE_ALREADY_DELIVERED_OR_EXECUTED.selector,
                txId
            )
        );
        assertEq(
            destination.target.cancellations(),
            1,
            "the action must have run exactly once"
        );
    }

    /// @notice Two byte-identical payloads are still two distinct transactions,
    ///         because the nonce differs. No accidental de-duplication.
    function test_replay_identicalPayloadsAreNotDeduplicated() public {
        bytes memory payload = _cancelPayload(destination);

        _forwardViaProposal(origin, destination, GAS_LIMIT, payload);
        _forwardViaProposal(origin, destination, GAS_LIMIT, payload);

        _deliverNext(origin, destination);
        _deliverNext(origin, destination);

        assertEq(
            destination.target.cancellations(),
            2,
            "both messages must execute"
        );
    }

    // -------------------------------------------------------------------------
    // Cross-chain replay
    // -------------------------------------------------------------------------

    /// @notice A message authenticated for one destination cannot be replayed
    ///         on another chain whose adapter trusts the same origin
    ///         controller.
    /// @dev The flagship replay test. The third stack trusts EXACTLY the same
    ///      controller address for the same origin chain -- which is what a
    ///      deterministic multi-chain deployment produces -- so the message
    ///      clears every authentication check the bridge and the adapter can
    ///      make. `destinationChainId` is the only thing standing between a
    ///      Base-bound governance action and it also executing on Arbitrum.
    function test_replay_messageForOneChainIsRejectedOnAnother() public {
        Stack memory third = _deployThirdStack();

        assertEq(
            third.adapter.trustedRemote(origin.chainId),
            destination.adapter.trustedRemote(origin.chainId),
            "both destinations trust the same origin controller"
        );

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
        bytes memory encodedTx = _queuedPayload(origin, 0);

        // The Base-bound message, delivered to the Arbitrum stack.
        (bool success, bytes memory reason) = _forgeDelivery(
            third,
            keccak256("replayed-on-arbitrum"),
            ORIGIN_SELECTOR,
            address(origin.controller),
            encodedTx,
            GAS_LIMIT
        );

        assertFalse(success, "cross-chain replay must be rejected");
        assertEq(reason, abi.encodeWithSelector(
            Errors.INCORRECT_CHAIN_MISMATCH.selector
        ));
        _assertUnknown(third, txId);
        assertEq(third.target.cancellations(), 0);

        // And it still executes where it was actually addressed.
        _deliverNext(origin, destination);
        _assertExecuted(destination, txId);
    }

    /// @notice A message cannot be laundered through a different trusted lane:
    ///         the origin chain it CLAIMS must match the lane it arrived on.
    function test_replay_originChainIdMustMatchTheLaneItArrivedOn() public {
        // An envelope that claims to come from Arbitrum...
        bytes memory forged = TransactionLib.encode(
            Transaction({
                nonce: 1,
                origin: address(origin.dao),
                controller: address(origin.controller),
                originChainId: THIRD_CHAIN_ID,
                destinationChainId: destination.chainId,
                message: _cancelPayload(destination)
            })
        );

        // ...delivered over the Ethereum lane, by the trusted Ethereum sender.
        (bool success, bytes memory reason) = _forgeDelivery(
            destination,
            keccak256("laundered"),
            ORIGIN_SELECTOR,
            address(origin.controller),
            forged,
            GAS_LIMIT
        );

        assertFalse(success, "lane laundering must be rejected");
        assertEq(reason, abi.encodeWithSelector(
            Errors.INCORRECT_CHAIN_MISMATCH.selector
        ));
        assertEq(destination.target.cancellations(), 0);
    }

    // -------------------------------------------------------------------------
    // Identity fields
    // -------------------------------------------------------------------------

    /// @notice The `controller` field participates in identity, so a redeployed
    ///         controller cannot collide with its predecessor's history.
    /// @dev Note what this field is and is not. It is NOT authenticated -- the
    ///      destination never checks it against the address the bridge reports
    ///      as the sender. It exists to keep transaction ids from colliding
    ///      across controller redeployments on the same lane. Authentication is
    ///      the adapter's trusted-remote check, which is what actually gates
    ///      who may put bytes in front of the controller.
    function test_identity_controllerFieldMakesTransactionsDistinct() public {
        bytes memory payload = _cancelPayload(destination);

        Transaction memory transaction = Transaction({
            nonce: 1,
            origin: address(origin.dao),
            controller: address(origin.controller),
            originChainId: origin.chainId,
            destinationChainId: destination.chainId,
            message: payload
        });

        bytes memory fromCurrent = TransactionLib.encode(transaction);

        transaction.controller = makeAddr("previouslyDeployedController");
        bytes memory fromPrevious = TransactionLib.encode(transaction);

        assertTrue(
            TransactionLib.id(fromCurrent) != TransactionLib.id(fromPrevious),
            "the controller field must change the transaction id"
        );

        (bool first, ) = _forgeDelivery(
            destination,
            keccak256("m1"),
            ORIGIN_SELECTOR,
            address(origin.controller),
            fromCurrent,
            GAS_LIMIT
        );
        (bool second, ) = _forgeDelivery(
            destination,
            keccak256("m2"),
            ORIGIN_SELECTOR,
            address(origin.controller),
            fromPrevious,
            GAS_LIMIT
        );

        assertTrue(first && second, "both must be accepted as distinct");
        _assertExecuted(destination, TransactionLib.id(fromCurrent));
        _assertExecuted(destination, TransactionLib.id(fromPrevious));
        assertEq(destination.target.cancellations(), 2);
    }

    /// @notice The `origin` field -- who initiated the send -- likewise
    ///         participates in identity.
    function test_identity_originFieldMakesTransactionsDistinct() public {
        Transaction memory transaction = Transaction({
            nonce: 1,
            origin: address(origin.dao),
            controller: address(origin.controller),
            originChainId: origin.chainId,
            destinationChainId: destination.chainId,
            message: _cancelPayload(destination)
        });

        bytes memory fromDao = TransactionLib.encode(transaction);

        transaction.origin = makeAddr("someOtherPlugin");
        bytes memory fromPlugin = TransactionLib.encode(transaction);

        assertTrue(
            TransactionLib.id(fromDao) != TransactionLib.id(fromPlugin),
            "the origin field must change the transaction id"
        );

        (bool first, ) = _forgeDelivery(
            destination,
            keccak256("m1"),
            ORIGIN_SELECTOR,
            address(origin.controller),
            fromDao,
            GAS_LIMIT
        );
        (bool second, ) = _forgeDelivery(
            destination,
            keccak256("m2"),
            ORIGIN_SELECTOR,
            address(origin.controller),
            fromPlugin,
            GAS_LIMIT
        );

        assertTrue(first && second);
        assertEq(destination.target.cancellations(), 2);
    }

    /// @notice The nonce counter is GLOBAL to the controller, not per lane, and
    ///         a transaction addressed to one lane is unknown on the other.
    function test_identity_nonceIsGlobalAndTransactionsDoNotCrossLanes()
        public
    {
        Stack memory third = _deployThirdStack();

        bytes32 toBase = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
        bytes32 toArbitrum = _forwardViaProposal(
            origin,
            third,
            GAS_LIMIT,
            _cancelPayload(third)
        );

        _deliverNext(origin, destination);
        _deliverNext(origin, third);

        _assertExecuted(destination, toBase);
        _assertExecuted(third, toArbitrum);

        // Neither destination knows anything about the other's transaction.
        _assertUnknown(destination, toArbitrum);
        _assertUnknown(third, toBase);
    }

    /// @notice The bridge's own message id has no bearing on identity: the
    ///         same envelope arriving under a different messageId is still the
    ///         same transaction, and is still rejected as a replay.
    /// @dev `receiveMessage` treats `_messageId` as an emit-only value and
    ///      deliberately does not trust it. This pins that: a bridge that
    ///      re-labels a message cannot use the new label to replay it.
    function test_identity_bridgeMessageIdDoesNotAffectIdentity() public {
        (bytes32 txId, bytes memory encodedTx) = _deliveredMessage();

        (bool success, bytes memory reason) = _forgeDelivery(
            destination,
            keccak256("a-completely-different-bridge-message-id"),
            ORIGIN_SELECTOR,
            address(origin.controller),
            encodedTx,
            GAS_LIMIT
        );

        assertFalse(success);
        assertEq(
            reason,
            abi.encodeWithSelector(
                Errors.MESSAGE_ALREADY_DELIVERED_OR_EXECUTED.selector,
                txId
            )
        );
    }
}
