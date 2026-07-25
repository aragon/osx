// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {
    IAny2EVMMessageReceiver
} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import {CrossChainE2EBase} from "./CrossChainE2EBase.sol";
import {Action} from "../../../src/common/executors/IExecutor.sol";
import {
    TransactionLib
} from "../../../src/common/crosschain/lib/Transaction.sol";
import {GuardedTarget, ValueSink} from "../../mocks/commons/crosschain/E2ETargets.sol";

/// @title CrossChainHappyPathTest
/// @notice The paths a correctly wired, correctly funded lane takes.
/// @dev Covers plan section A.
contract CrossChainHappyPathTest is CrossChainE2EBase {
    /// @notice The whole loop: a proposal on the origin DAO ends up executing
    ///         an action on the destination DAO.
    function test_e2e_originProposalExecutesActionOnDestinationDao() public {
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

    /// @notice The same lane carries messages the other way.
    function test_e2e_worksInBothDirections() public {
        bytes32 outbound = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
        _deliverNext(origin, destination);
        _assertExecuted(destination, outbound);

        _on(destination);
        bytes32 inbound = _forwardViaProposal(
            destination,
            origin,
            GAS_LIMIT,
            _cancelPayload(origin)
        );
        _deliverNext(destination, origin);

        _assertExecuted(origin, inbound);
        assertEq(origin.target.cancellations(), 1, "reverse action should run");
        assertEq(origin.target.lastCaller(), address(origin.dao));
    }

    /// @notice A payload carrying several actions, including one that moves
    ///         native currency out of the destination DAO's treasury.
    function test_e2e_multiActionPayloadIncludingValueTransfer() public {
        ValueSink sink = new ValueSink();
        vm.deal(address(destination.dao), 5 ether);

        Action[] memory actions = new Action[](3);
        actions[0] = Action({
            to: address(destination.target),
            value: 0,
            data: abi.encodeCall(GuardedTarget.cancelRootUpdate, ())
        });
        actions[1] = Action({to: address(sink), value: 2 ether, data: ""});
        actions[2] = Action({
            to: address(destination.target),
            value: 0,
            data: abi.encodeCall(GuardedTarget.cancelRootUpdate, ())
        });

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            abi.encode(actions)
        );
        _deliverNext(origin, destination);

        _assertExecuted(destination, txId);
        assertEq(destination.target.cancellations(), 2, "both calls should run");
        assertEq(sink.received(), 2 ether, "value should have moved");
        assertEq(address(destination.dao).balance, 3 ether);
    }

    /// @notice An empty action array is a valid, executable message.
    function test_e2e_emptyPayloadExecutes() public {
        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _emptyPayload()
        );
        (, bool success) = _deliverNext(origin, destination);

        assertTrue(success);
        _assertExecuted(destination, txId);
    }

    /// @notice Consecutive sends take consecutive nonces, which is what makes
    ///         two otherwise identical messages distinct transactions.
    function test_e2e_consecutiveSendsTakeConsecutiveNonces() public {
        bytes memory payload = _cancelPayload(destination);

        bytes32 first = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            payload
        );
        bytes32 second = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            payload
        );

        assertTrue(first != second, "identical payloads must not collide");

        // The nonce starts at 1: `forwardMessage` pre-increments.
        assertEq(
            first,
            TransactionLib.id(
                _encodedTx(origin, destination, 1, address(origin.dao), payload)
            ),
            "first message should carry nonce 1"
        );
        assertEq(
            second,
            TransactionLib.id(
                _encodedTx(origin, destination, 2, address(origin.dao), payload)
            ),
            "second message should carry nonce 2"
        );

        _deliverNext(origin, destination);
        _deliverNext(origin, destination);

        _assertExecuted(destination, first);
        _assertExecuted(destination, second);
        assertEq(destination.target.cancellations(), 2);
    }

    /// @notice CCIP is configured with `allowOutOfOrderExecution`, so a later
    ///         message may be delivered before an earlier one.
    function test_e2e_outOfOrderDeliveryIsAccepted() public {
        bytes memory payload = _cancelPayload(destination);

        bytes32 first = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            payload
        );
        bytes32 second = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            payload
        );

        // Deliver the SECOND message first.
        assertTrue(_deliver(origin, destination, origin.router.messageIdAt(1)));
        _assertExecuted(destination, second);
        _assertUnknown(destination, first);

        assertTrue(_deliver(origin, destination, origin.router.messageIdAt(0)));
        _assertExecuted(destination, first);
    }

    /// @notice One controller serving two destinations. The nonce counter is
    ///         GLOBAL, not per-lane, so the two messages differ by nonce even
    ///         though they travel different lanes.
    function test_e2e_twoLanesFromOneControllerAreIndependent() public {
        Stack memory third = _deployThirdStack();

        bytes32 toB = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
        bytes32 toC = _forwardViaProposal(
            origin,
            third,
            GAS_LIMIT,
            _cancelPayload(third)
        );

        assertEq(
            toB,
            TransactionLib.id(
                _encodedTx(
                    origin,
                    destination,
                    1,
                    address(origin.dao),
                    _cancelPayload(destination)
                )
            ),
            "the Base-bound message should carry nonce 1"
        );
        assertEq(
            toC,
            TransactionLib.id(
                _encodedTx(
                    origin,
                    third,
                    2,
                    address(origin.dao),
                    _cancelPayload(third)
                )
            ),
            "the Arbitrum-bound message should carry nonce 2, not 1"
        );

        _deliverNext(origin, destination);
        _deliverNext(origin, third);

        _assertExecuted(destination, toB);
        _assertExecuted(third, toC);
        assertEq(destination.target.cancellations(), 1);
        assertEq(third.target.cancellations(), 1);
    }

    // -------------------------------------------------------------------------
    // Fee accounting on the happy path
    // -------------------------------------------------------------------------

    /// @notice The native fee comes out of the CONTROLLER's balance -- the
    ///         consequence of the send path being `delegatecall`ed.
    function test_e2e_nativeFeeIsPaidFromTheControllerBalance() public {
        uint256 controllerBefore = address(origin.controller).balance;
        uint256 routerBefore = address(origin.router).balance;
        uint256 daoBefore = address(origin.dao).balance;

        _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );

        assertEq(
            address(origin.controller).balance,
            controllerBefore - FEE,
            "the controller should have paid the fee"
        );
        assertEq(
            address(origin.router).balance,
            routerBefore + FEE,
            "the router should have received the fee"
        );
        assertEq(
            address(origin.dao).balance,
            daoBefore,
            "the DAO's treasury must not be touched"
        );
        assertEq(
            address(origin.adapter).balance,
            0,
            "no funds may ever sit on the adapter"
        );
    }

    /// @notice `quoteFee` prices exactly what the send will charge, even though
    ///         it encodes the CURRENT nonce while the send encodes the next one
    ///         (the two envelopes have the same byte length).
    function test_e2e_quoteMatchesTheFeeCharged() public {
        bytes memory payload = _cancelPayload(destination);

        (address feeTokenAddress, uint256 quoted, uint256 available) = origin
            .controller
            .quoteFee(destination.chainId, GAS_LIMIT, payload);

        assertEq(feeTokenAddress, address(0), "native lane");
        assertEq(quoted, FEE);
        assertEq(available, address(origin.controller).balance);

        uint256 balanceBefore = address(origin.controller).balance;
        _forwardViaProposal(origin, destination, GAS_LIMIT, payload);

        assertEq(
            balanceBefore - address(origin.controller).balance,
            quoted,
            "the send must charge exactly what was quoted"
        );
        assertEq(origin.router.sentAt(0).fee, quoted);
    }

    // -------------------------------------------------------------------------
    // Bridge-level compatibility
    // -------------------------------------------------------------------------

    /// @notice The adapter must advertise `IAny2EVMMessageReceiver`.
    /// @dev Not cosmetic: the real Router runs an `ERC165Checker` probe and
    ///      SILENTLY SKIPS a receiver that fails it, reporting the delivery as
    ///      successful. A false here would lose every inbound message without
    ///      any error surfacing anywhere.
    function test_e2e_adapterAdvertisesTheCcipReceiverInterface() public view {
        assertTrue(
            destination.adapter.supportsInterface(
                type(IAny2EVMMessageReceiver).interfaceId
            ),
            "adapter must be recognised as a CCIP receiver"
        );
        assertTrue(
            destination.adapter.supportsInterface(type(IERC165).interfaceId)
        );
    }

    /// @notice The envelope handed to CCIP is exactly the envelope the
    ///         destination reconstructs and hashes.
    function test_e2e_bridgePayloadIsTheCanonicalEnvelope() public {
        bytes memory payload = _cancelPayload(destination);

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            payload
        );

        bytes memory queued = _queuedPayload(origin, 0);

        assertEq(
            queued,
            _encodedTx(origin, destination, 1, address(origin.dao), payload),
            "the bytes on the wire must be the canonical envelope"
        );
        assertEq(
            TransactionLib.id(queued),
            txId,
            "the txId must be the hash of the bytes on the wire"
        );
    }

    /// @notice The send reaches the destination ADAPTER, attributed to the
    ///         origin CONTROLLER -- the asymmetry the `delegatecall` design
    ///         creates and the trusted-remote check depends on.
    function test_e2e_bridgeSeesTheControllerAsSender() public {
        _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );

        assertEq(
            origin.router.sentAt(0).sender,
            address(origin.controller),
            "CCIP must attribute the message to the controller"
        );
        assertEq(
            origin.router.sentAt(0).receiver,
            address(destination.adapter),
            "the bridge-level receiver is the remote ADAPTER"
        );
        assertEq(
            destination.adapter.trustedRemote(origin.chainId),
            address(origin.controller),
            "and the remote trusts that controller, not the remote adapter"
        );
    }
}
