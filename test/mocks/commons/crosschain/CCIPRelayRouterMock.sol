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
import {
    CallWithExactGas
} from "@chainlink/contracts/src/v0.8/shared/call/CallWithExactGas.sol";

/// @notice A pair-able CCIP Router mock that actually DELIVERS messages to a
///         peer router, so both ends of a lane can be exercised in a single
///         Foundry process.
/// @dev DO NOT USE IN PRODUCTION!
///
///      Difference from `CCIPRouterMock` (a passive recorder used by the
///      send-side unit tests): this mock models BOTH halves of a real CCIP
///      lane, and models them asynchronously.
///
///      SEND HALF -- `ccipSend`:
///      - charges the fee exactly like the real Router: `msg.value` must equal
///        the quoted fee for native (CCIP does not refund overpayment), or the
///        fee is pulled with `transferFrom` for an ERC20 fee token, so a
///        missing `forceApprove` in the adapter still fails here;
///      - validates the receiver encoding and the `extraArgs` tag the way the
///        real Router does, so a malformed `EVM2AnyMessage` fails loudly;
///      - refuses unconfigured destination selectors, so a lane misconfigured
///        with a bogus chain id fails loudly instead of silently;
///      - QUEUES the message instead of delivering it inline. Real CCIP
///        delivery is a SEPARATE transaction executed later by the DON, and
///        inlining it would hide every reentrancy and gas assumption this
///        suite exists to test.
///
///      RECEIVE HALF -- `deliverNext` / `deliver` / `manualExecute`:
///      - the PEER router (the one registered for the destination selector) is
///        the account that calls `ccipReceive`, which is what the destination
///        adapter's `onlyRouter` check requires;
///      - the `sender` field is `abi.encode(<the account that called
///        ccipSend>)`. Under the controller's `delegatecall` send path that
///        account is the origin CONTROLLER, which is precisely the asymmetry
///        the round-trip tests have to prove;
///      - the call goes through `CallWithExactGas`, with the gas limit decoded
///        from `extraArgs` -- verbatim what `Router.routeMessage` does. This is
///        what makes the gas scenarios real rather than simulated;
///      - a failed delivery does NOT revert the caller of `deliver`. It returns
///        `success == false` and leaves the message queued, mirroring CCIP,
///        where a reverting `ccipReceive` moves the message to a FAILED state
///        that stays manually executable. `manualExecute` replays it with an
///        overridden gas limit, which is exactly CCIP's manual execution.
contract CCIPRelayRouterMock is IRouterClient {
    /// @notice A message accepted by `ccipSend` and awaiting delivery.
    /// @param destinationChainSelector The destination lane.
    /// @param sender The account that called `ccipSend` (the origin controller).
    /// @param receiver The decoded destination receiver (the remote adapter).
    /// @param data The payload.
    /// @param gasLimit The gas limit decoded from `extraArgs`.
    /// @param feeToken The fee token used (`address(0)` for native).
    /// @param fee The fee charged.
    /// @param executed Whether a delivery attempt has already succeeded.
    /// @param attempts How many delivery attempts were made.
    struct SentMessage {
        uint64 destinationChainSelector;
        address sender;
        address receiver;
        bytes data;
        uint256 gasLimit;
        address feeToken;
        uint256 fee;
        bool executed;
        uint256 attempts;
    }

    /// @notice Mirrors the real Router's `GAS_FOR_CALL_EXACT_CHECK`.
    uint16 public constant GAS_FOR_CALL_EXACT_CHECK = 5_000;

    /// @notice Mirrors `Internal.MAX_RET_BYTES`.
    uint16 public constant MAX_RET_BYTES = 4 + 4 * 32;

    /// @notice This router's own chain selector; used as the
    ///         `sourceChainSelector` of messages it hands to its peers.
    uint64 public immutable LOCAL_CHAIN_SELECTOR;

    /// @notice The fee quoted by `getFee` and required by `ccipSend`.
    uint256 public fee;

    /// @notice When true, `ccipSend` reverts. Stands in for an RMN curse or a
    ///         disabled lane.
    bool public cursed;

    /// @notice destination chain selector -> peer router that delivers there.
    mapping(uint64 => CCIPRelayRouterMock) public peers;

    /// @notice destination chain selector -> number of messages sent, used to
    ///         make message ids unique per lane.
    mapping(uint64 => uint64) public sequenceNumber;

    /// @notice Every message accepted by `ccipSend`, in order.
    SentMessage[] internal _sent;

    /// @notice message id -> index into `_sent`, plus one (0 means "unknown").
    mapping(bytes32 => uint256) internal _indexOfPlusOne;

    /// @notice The return data of the most recent delivery attempt. Lets a test
    ///         assert WHY a CCIP-level delivery failed.
    bytes public lastDeliveryReturnData;

    // `UnsupportedDestinationChain` and `InvalidMsgValue` are inherited from
    // `IRouterClient`, so a test can expect the very same selectors the real
    // Router reverts with.

    /// @notice Thrown when the lane is cursed.
    error Cursed();

    /// @notice Thrown when the receiver bytes are not a valid EVM address.
    error InvalidAddress(bytes encodedAddress);

    /// @notice Thrown when `extraArgs` carries an unrecognised tag.
    error InvalidExtraArgsTag();

    /// @notice Thrown when the native `msg.value` is not exactly the fee.
    error InvalidNativeFee(uint256 expected, uint256 actual);

    /// @notice Thrown when a message id is not known to this router.
    error UnknownMessageId(bytes32 messageId);

    /// @notice Thrown when re-executing a message that already succeeded.
    error AlreadyExecuted(bytes32 messageId);

    /// @notice Thrown when there is nothing left to deliver.
    error NothingToDeliver();

    /// @notice Mirrors the real Router's event closely enough to assert on.
    event MessageSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address indexed sender,
        address receiver
    );

    /// @notice Emitted after every delivery attempt, successful or not.
    event MessageExecuted(
        bytes32 indexed messageId,
        address indexed receiver,
        bool success,
        bytes returnData
    );

    /// @param _localChainSelector The CCIP selector of the chain this router
    ///        stands in for.
    constructor(uint64 _localChainSelector) {
        LOCAL_CHAIN_SELECTOR = _localChainSelector;
    }

    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    /// @notice Sets the fee quoted by `getFee` and required by `ccipSend`.
    function setFee(uint256 _fee) external {
        fee = _fee;
    }

    /// @notice Makes `ccipSend` revert, standing in for a cursed/disabled lane.
    function setCursed(bool _cursed) external {
        cursed = _cursed;
    }

    /// @notice Registers the router that serves a destination selector.
    /// @dev Both directions must be registered for a round trip.
    function setPeer(
        uint64 _destinationChainSelector,
        CCIPRelayRouterMock _peer
    ) external {
        peers[_destinationChainSelector] = _peer;
    }

    // -------------------------------------------------------------------------
    // Send half
    // -------------------------------------------------------------------------

    /// @inheritdoc IRouterClient
    function isChainSupported(
        uint64 _destChainSelector
    ) external view returns (bool) {
        return address(peers[_destChainSelector]) != address(0);
    }

    /// @inheritdoc IRouterClient
    function getFee(
        uint64 _destChainSelector,
        Client.EVM2AnyMessage memory
    ) external view returns (uint256) {
        if (address(peers[_destChainSelector]) == address(0)) {
            revert UnsupportedDestinationChain(_destChainSelector);
        }

        return fee;
    }

    /// @inheritdoc IRouterClient
    function ccipSend(
        uint64 _destinationChainSelector,
        Client.EVM2AnyMessage calldata _message
    ) external payable returns (bytes32) {
        if (cursed) revert Cursed();

        if (address(peers[_destinationChainSelector]) == address(0)) {
            revert UnsupportedDestinationChain(_destinationChainSelector);
        }

        // Receiver validation, mirroring the real Router: exactly one word,
        // and neither zero nor a precompile.
        if (_message.receiver.length != 32) {
            revert InvalidAddress(_message.receiver);
        }
        uint256 decodedReceiver = abi.decode(_message.receiver, (uint256));
        if (decodedReceiver > type(uint160).max || decodedReceiver < 10) {
            revert InvalidAddress(_message.receiver);
        }

        if (_message.feeToken == address(0)) {
            // CCIP does not refund overpayment, so the adapter must quote and
            // pay exactly. Requiring equality here pins that.
            if (msg.value != fee) revert InvalidNativeFee(fee, msg.value);
        } else {
            if (msg.value != 0) revert InvalidMsgValue();

            // Pull the fee exactly like the real Router: this reverts unless
            // the caller granted an allowance first.
            require(
                IERC20(_message.feeToken).transferFrom(
                    msg.sender,
                    address(this),
                    fee
                ),
                "CCIPRelayRouterMock: transferFrom failed"
            );
        }

        uint64 sequence = sequenceNumber[_destinationChainSelector]++;
        bytes32 messageId = keccak256(
            abi.encode(
                LOCAL_CHAIN_SELECTOR,
                _destinationChainSelector,
                msg.sender,
                sequence
            )
        );

        // Safe: the range check above already rejected anything wider than
        // `uint160`, exactly as the real Router does.
        // forge-lint: disable-next-line(unsafe-typecast)
        address receiver = address(uint160(decodedReceiver));

        _sent.push(
            SentMessage({
                destinationChainSelector: _destinationChainSelector,
                sender: msg.sender,
                receiver: receiver,
                data: _message.data,
                gasLimit: _gasLimitOf(_message.extraArgs),
                feeToken: _message.feeToken,
                fee: fee,
                executed: false,
                attempts: 0
            })
        );
        _indexOfPlusOne[messageId] = _sent.length;

        emit MessageSent(
            messageId,
            _destinationChainSelector,
            msg.sender,
            receiver
        );

        return messageId;
    }

    // -------------------------------------------------------------------------
    // Receive half
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
    function sentById(
        bytes32 _messageId
    ) external view returns (SentMessage memory) {
        return _sent[_indexOf(_messageId)];
    }

    /// @notice The id of the message at `_index`.
    function messageIdAt(uint256 _index) public view returns (bytes32) {
        SentMessage storage message = _sent[_index];

        return
            keccak256(
                abi.encode(
                    LOCAL_CHAIN_SELECTOR,
                    message.destinationChainSelector,
                    message.sender,
                    _sequenceOf(_index)
                )
            );
    }

    /// @notice Delivers a queued message with the gas limit it was sent with.
    /// @param _messageId The id returned by `ccipSend`.
    /// @return success Whether `ccipReceive` succeeded.
    function deliver(bytes32 _messageId) public returns (bool success) {
        return _execute(_messageId, _sent[_indexOf(_messageId)].gasLimit);
    }

    /// @notice Delivers the oldest message that has not yet succeeded.
    /// @return messageId The id of the message that was attempted.
    /// @return success Whether `ccipReceive` succeeded.
    function deliverNext() external returns (bytes32 messageId, bool success) {
        for (uint256 i = 0; i < _sent.length; i++) {
            if (!_sent[i].executed) {
                messageId = messageIdAt(i);
                return (messageId, deliver(messageId));
            }
        }

        revert NothingToDeliver();
    }

    /// @notice Replays a failed message with an overridden gas limit.
    /// @dev This is CCIP manual execution: after the smart-execution window a
    ///      failed message can be re-executed by anyone, optionally with more
    ///      gas than the sender originally paid for.
    /// @param _messageId The id returned by `ccipSend`.
    /// @param _gasOverride The gas limit to hand the receiver this time.
    /// @return success Whether `ccipReceive` succeeded.
    function manualExecute(
        bytes32 _messageId,
        uint256 _gasOverride
    ) external returns (bool success) {
        return _execute(_messageId, _gasOverride);
    }

    /// @notice Calls `ccipReceive` on a destination receiver with exact gas.
    /// @dev Called by the SOURCE router ON the DESTINATION router, so the
    ///      `msg.sender` the receiver sees is the destination router -- which
    ///      is what its `onlyRouter` check requires.
    ///
    ///      Public on purpose: tests use it directly to FORGE deliveries (an
    ///      untrusted sender, an unknown source selector, a doctored payload)
    ///      exactly as a compromised or misconfigured lane would. The real
    ///      Router's equivalent, `routeMessage`, is `onlyOffRamp`; that
    ///      restriction is what the fork suite exercises.
    /// @param _message The CCIP message to deliver.
    /// @param _receiver The destination receiver (the remote adapter).
    /// @param _gasLimit The exact gas to give the receiver.
    /// @return success Whether the call succeeded.
    /// @return returnData The (truncated) return data of the call.
    function executeDelivery(
        Client.Any2EVMMessage memory _message,
        address _receiver,
        uint256 _gasLimit
    ) public returns (bool success, bytes memory returnData) {
        bytes memory payload = abi.encodeWithSelector(
            IAny2EVMMessageReceiver.ccipReceive.selector,
            _message
        );

        (success, returnData, ) = CallWithExactGas
            ._callWithExactGasSafeReturnData(
                payload,
                _receiver,
                _gasLimit,
                GAS_FOR_CALL_EXACT_CHECK,
                MAX_RET_BYTES
            );

        emit MessageExecuted(
            _message.messageId,
            _receiver,
            success,
            returnData
        );
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    /// @dev Runs one delivery attempt of a queued message through the peer
    ///      router. Records the outcome; a failure leaves the message queued.
    function _execute(
        bytes32 _messageId,
        uint256 _gasLimit
    ) internal returns (bool success) {
        SentMessage storage message = _sent[_indexOf(_messageId)];

        if (message.executed) revert AlreadyExecuted(_messageId);

        message.attempts++;

        bytes memory returnData;
        (success, returnData) = peers[message.destinationChainSelector]
            .executeDelivery(
                Client.Any2EVMMessage({
                    messageId: _messageId,
                    sourceChainSelector: LOCAL_CHAIN_SELECTOR,
                    sender: abi.encode(message.sender),
                    data: message.data,
                    destTokenAmounts: new Client.EVMTokenAmount[](0)
                }),
                message.receiver,
                _gasLimit
            );

        lastDeliveryReturnData = returnData;

        if (success) message.executed = true;
    }

    /// @dev Index of a known message id, or reverts.
    function _indexOf(bytes32 _messageId) internal view returns (uint256) {
        uint256 index = _indexOfPlusOne[_messageId];
        if (index == 0) revert UnknownMessageId(_messageId);

        return index - 1;
    }

    /// @dev Recomputes the per-lane sequence number of the message stored at
    ///      `_index` by counting how many earlier messages share its lane.
    function _sequenceOf(uint256 _index) internal view returns (uint64 seq) {
        uint64 selector = _sent[_index].destinationChainSelector;

        for (uint256 i = 0; i < _index; i++) {
            if (_sent[i].destinationChainSelector == selector) seq++;
        }
    }

    /// @dev Decodes the gas limit out of `extraArgs`, validating the tag the
    ///      way the real Router does. An empty `extraArgs` means the CCIP
    ///      default; an unknown tag is rejected.
    function _gasLimitOf(
        bytes calldata _extraArgs
    ) internal pure returns (uint256) {
        if (_extraArgs.length == 0) return 200_000;

        // Truncation to the leading four bytes IS the tag read; this mirrors
        // the real Router's `_fromBytes`.
        // forge-lint: disable-next-line(unsafe-typecast)
        bytes4 tag = bytes4(_extraArgs);

        if (tag == Client.GENERIC_EXTRA_ARGS_V2_TAG) {
            return
                abi
                    .decode(_extraArgs[4:], (Client.GenericExtraArgsV2))
                    .gasLimit;
        } else if (tag == Client.EVM_EXTRA_ARGS_V1_TAG) {
            return abi.decode(_extraArgs[4:], (uint256));
        }

        revert InvalidExtraArgsTag();
    }
}
