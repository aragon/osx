// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    IRouterClient
} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {
    IAny2EVMMessageReceiver
} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";

/// @notice A pair-able CCIP Router mock that actually DELIVERS messages to a
///         peer router, so both ends of a lane can be exercised in a single
///         Foundry process.
/// @dev DO NOT USE IN PRODUCTION!
///
///      Difference from `CCIPRouterMock` (which is a passive recorder used by
///      the send-side unit tests): this mock models the two halves of a real
///      CCIP lane.
///
///      Send half — `ccipSend`:
///      - charges the fee exactly like the real Router does: `msg.value` must
///        equal the quoted fee for native, or the fee is pulled with
///        `transferFrom` from `msg.sender` for an ERC20 fee token (so a missing
///        `forceApprove` in the adapter still fails here);
///      - derives a `messageId` from the lane, the sender and a per-lane
///        sequence number, mirroring the real Router's "unique per (lane,
///        sender, nonce)" property that the controller's `deriveCallId` relies
///        on;
///      - refuses unconfigured destination selectors, so a lane misconfigured
///        with a bogus `bridgeChainId` fails loudly instead of silently;
///      - queues the message for delivery rather than delivering inline. Real
///        CCIP delivery is a SEPARATE transaction executed later by the DON,
///        and inlining it would hide reentrancy and gas assumptions.
///
///      Receive half — `deliverNext` / `deliver`:
///      - the PEER router (the one registered for the destination selector) is
///        the account that calls `ccipReceive`, which is what the destination
///        adapter's `onlyRouter` check requires;
///      - the `sender` field is `abi.encode(<the account that called
///        ccipSend>)`. Under the controller's `delegatecall` send path that
///        account is the origin CONTROLLER, which is precisely the asymmetry
///        the round-trip test has to prove;
///      - a reverting `ccipReceive` is surfaced to the caller of `deliver`
///        instead of being swallowed, mirroring CCIP's "the message moves to a
///        FAILED state and stays manually executable" semantics closely enough
///        for tests: nothing is marked delivered unless it succeeded.
contract CCIPRelayRouterMock is IRouterClient {
    /// @notice A message accepted by `ccipSend` and awaiting delivery.
    /// @param destinationChainSelector The destination lane.
    /// @param sender The account that called `ccipSend` (the origin controller).
    /// @param receiver The decoded destination receiver (the remote adapter).
    /// @param data The payload.
    /// @param extraArgs The encoded CCIP extra args.
    /// @param feeToken The fee token used (`address(0)` for native).
    /// @param fee The fee charged.
    /// @param delivered Whether `deliver` already succeeded for this message.
    struct SentMessage {
        uint64 destinationChainSelector;
        address sender;
        address receiver;
        bytes data;
        bytes extraArgs;
        address feeToken;
        uint256 fee;
        bool delivered;
    }

    /// @notice This router's own chain selector; used as the
    ///         `sourceChainSelector` of messages it hands to its peers.
    uint64 public immutable LOCAL_CHAIN_SELECTOR;

    /// @notice The fee quoted by `getFee` and required by `ccipSend`.
    uint256 public fee;

    /// @notice destination chain selector -> peer router that delivers there.
    mapping(uint64 => CCIPRelayRouterMock) public peers;

    /// @notice destination chain selector -> number of messages sent, used to
    ///         make message ids unique per lane.
    mapping(uint64 => uint256) public sequenceNumber;

    /// @notice Every message accepted by `ccipSend`, in order.
    SentMessage[] internal _sent;

    /// @notice message id -> index into `_sent`, plus one (0 means "unknown").
    mapping(bytes32 => uint256) internal _indexOfPlusOne;

    /// @notice Mirrors the real Router's event closely enough to assert on.
    event MessageSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address indexed sender,
        address receiver
    );

    /// @notice Emitted once a queued message has been delivered successfully.
    event MessageDelivered(bytes32 indexed messageId, address indexed receiver);

    /// @param _localChainSelector The CCIP selector of the chain this router
    ///        stands in for.
    constructor(uint64 _localChainSelector) {
        LOCAL_CHAIN_SELECTOR = _localChainSelector;
    }

    /// @notice Sets the fee quoted by `getFee` and required by `ccipSend`.
    function setFee(uint256 _fee) external {
        fee = _fee;
    }

    /// @notice Registers the router that serves a destination selector.
    /// @dev Both directions must be registered for a round trip.
    function setPeer(uint64 _destinationChainSelector, CCIPRelayRouterMock _peer) external {
        peers[_destinationChainSelector] = _peer;
    }

    /// @inheritdoc IRouterClient
    function isChainSupported(uint64 _destChainSelector) external view returns (bool) {
        return address(peers[_destChainSelector]) != address(0);
    }

    /// @inheritdoc IRouterClient
    function getFee(uint64 _destChainSelector, Client.EVM2AnyMessage memory) external view returns (uint256) {
        require(address(peers[_destChainSelector]) != address(0), "CCIPRelayRouterMock: unsupported lane");
        return fee;
    }

    /// @inheritdoc IRouterClient
    function ccipSend(uint64 _destinationChainSelector, Client.EVM2AnyMessage calldata _message)
        external
        payable
        returns (bytes32)
    {
        require(address(peers[_destinationChainSelector]) != address(0), "CCIPRelayRouterMock: unsupported lane");

        if (_message.feeToken == address(0)) {
            require(msg.value == fee, "CCIPRelayRouterMock: bad native fee");
        } else {
            require(msg.value == 0, "CCIPRelayRouterMock: unexpected native value");
            // Pull the fee exactly like the real Router: this reverts unless
            // the caller granted an allowance first.
            require(
                IERC20(_message.feeToken).transferFrom(msg.sender, address(this), fee),
                "CCIPRelayRouterMock: transferFrom failed"
            );
        }

        uint256 nonce = sequenceNumber[_destinationChainSelector]++;
        bytes32 messageId = keccak256(
            abi.encode(LOCAL_CHAIN_SELECTOR, _destinationChainSelector, msg.sender, nonce)
        );

        address receiver = abi.decode(_message.receiver, (address));

        _sent.push(
            SentMessage({
                destinationChainSelector: _destinationChainSelector,
                sender: msg.sender,
                receiver: receiver,
                data: _message.data,
                extraArgs: _message.extraArgs,
                feeToken: _message.feeToken,
                fee: fee,
                delivered: false
            })
        );
        _indexOfPlusOne[messageId] = _sent.length;

        emit MessageSent(messageId, _destinationChainSelector, msg.sender, receiver);

        return messageId;
    }

    // -------------------------------------------------------------------------
    // Delivery (the destination-chain half)
    // -------------------------------------------------------------------------

    /// @notice The number of messages accepted so far.
    function sentCount() external view returns (uint256) {
        return _sent.length;
    }

    /// @notice Returns a queued message by index.
    function sentAt(uint256 _index) external view returns (SentMessage memory) {
        return _sent[_index];
    }

    /// @notice Returns a queued message by its id.
    function sentById(bytes32 _messageId) public view returns (SentMessage memory) {
        uint256 idx = _indexOfPlusOne[_messageId];
        require(idx != 0, "CCIPRelayRouterMock: unknown message id");
        return _sent[idx - 1];
    }

    /// @notice The id of the message at `_index`.
    function messageIdAt(uint256 _index) public view returns (bytes32) {
        SentMessage memory m = _sent[_index];
        return keccak256(abi.encode(LOCAL_CHAIN_SELECTOR, m.destinationChainSelector, m.sender, _nonceOf(_index)));
    }

    /// @notice Delivers a queued message through the peer router registered for
    ///         its destination selector.
    /// @dev The PEER is the caller of `ccipReceive`, matching production, where
    ///      the destination chain's Router (not the source one) calls the
    ///      receiver. Reverts if `ccipReceive` reverts, and the message stays
    ///      undelivered so a test can retry it.
    /// @param _messageId The id returned by `ccipSend`.
    function deliver(bytes32 _messageId) public {
        uint256 idx = _indexOfPlusOne[_messageId];
        require(idx != 0, "CCIPRelayRouterMock: unknown message id");

        SentMessage storage m = _sent[idx - 1];
        require(!m.delivered, "CCIPRelayRouterMock: already delivered");

        CCIPRelayRouterMock peer = peers[m.destinationChainSelector];

        peer.executeDelivery(
            Client.Any2EVMMessage({
                messageId: _messageId,
                sourceChainSelector: LOCAL_CHAIN_SELECTOR,
                sender: abi.encode(m.sender),
                data: m.data,
                destTokenAmounts: new Client.EVMTokenAmount[](0)
            }),
            m.receiver
        );

        m.delivered = true;

        emit MessageDelivered(_messageId, m.receiver);
    }

    /// @notice Delivers the oldest not-yet-delivered message.
    /// @return messageId The id of the message that was delivered.
    function deliverNext() external returns (bytes32 messageId) {
        for (uint256 i = 0; i < _sent.length; i++) {
            if (!_sent[i].delivered) {
                messageId = messageIdAt(i);
                deliver(messageId);
                return messageId;
            }
        }
        revert("CCIPRelayRouterMock: nothing to deliver");
    }

    /// @notice Calls `ccipReceive` on a destination receiver.
    /// @dev Called by the SOURCE router on the DESTINATION router, so that
    ///      `msg.sender` seen by the receiver is the destination router. Public
    ///      on purpose: tests use it directly to forge deliveries (e.g. an
    ///      untrusted sender or an unknown source selector) exactly as a
    ///      compromised or misconfigured lane would.
    /// @param _message The CCIP message to deliver.
    /// @param _receiver The destination receiver (the remote adapter).
    function executeDelivery(Client.Any2EVMMessage memory _message, address _receiver) public {
        IAny2EVMMessageReceiver(_receiver).ccipReceive(_message);
    }

    /// @dev Recomputes the per-lane nonce of the message stored at `_index` by
    ///      counting how many earlier messages share its destination selector.
    function _nonceOf(uint256 _index) internal view returns (uint256 nonce) {
        uint64 selector = _sent[_index].destinationChainSelector;
        for (uint256 i = 0; i < _index; i++) {
            if (_sent[i].destinationChainSelector == selector) nonce++;
        }
    }
}
