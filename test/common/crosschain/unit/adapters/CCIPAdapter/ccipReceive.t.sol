// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CCIPAdapterBase} from "./Base.t.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {
    CCIPAdapter
} from "@aragon/osx-commons-contracts/src/crosschain/adapters/CCIP/CCIPAdapter.sol";
import {
    Errors
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Errors.sol";
import {
    ChainIds
} from "@aragon/osx-commons-contracts/src/crosschain/lib/ChainIds.sol";
import {
    Transaction,
    TransactionLib
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Transaction.sol";

contract CCIPAdapterCcipReceiveTest is CCIPAdapterBase {
    function test_revertsIfCallerNotRouter() public {
        Client.Any2EVMMessage memory message = _buildInbound(
            SEL_ETH_MAINNET,
            remoteController,
            ""
        );

        vm.expectRevert(Errors.CALLER_NOT_CCIP_ROUTER.selector);
        vm.prank(alice);
        adapter.ccipReceive(message);
    }

    function test_revertsIfDecodedSenderIsZero() public {
        Client.Any2EVMMessage memory message = _buildInbound(
            SEL_ETH_MAINNET,
            address(0),
            ""
        );

        vm.expectRevert(Errors.REMOTE_NOT_TRUSTED.selector);
        vm.prank(address(router));
        adapter.ccipReceive(message);
    }

    function test_revertsIfSenderIsAnArbitraryUntrustedAddress() public {
        address untrusted = makeAddr("untrusted");
        Client.Any2EVMMessage memory message = _buildInbound(
            SEL_ETH_MAINNET,
            untrusted,
            ""
        );

        vm.expectRevert(Errors.REMOTE_NOT_TRUSTED.selector);
        vm.prank(address(router));
        adapter.ccipReceive(message);
    }

    function test_revertsIfSenderIsRemoteAdapterInsteadOfRemoteController()
        public
    {
        Client.Any2EVMMessage memory message = _buildInbound(
            SEL_ETH_MAINNET,
            remoteAdapter,
            ""
        );

        vm.expectRevert(Errors.REMOTE_NOT_TRUSTED.selector);
        vm.prank(address(router));
        adapter.ccipReceive(message);
    }

    /// @dev The success path: sender IS the remote CONTROLLER. The inbound
    ///      `data` is an encoded `Transaction` envelope (not a raw `Action[]`),
    ///      and the emitted id is the envelope's `TransactionLib.id` derived
    ///      from the decoded payload -- NOT a bridge-messageId-derived call id.
    ///      `messageId` survives only as an event field.
    function test_succeedsWhenSenderIsRemoteControllerAndForwardsToController()
        public
    {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter);

        Transaction memory transaction = Transaction({
            nonce: 1,
            origin: remoteController,
            originChainId: CHAIN_ETH_MAINNET,
            destinationChainId: block.chainid,
            message: _emptyActionsPayload()
        });
        bytes memory payload = TransactionLib.encode(transaction);
        bytes32 expectedTxId = TransactionLib.id(transaction);

        bytes32 messageId = keccak256("msg-1");

        Client.Any2EVMMessage memory message = _buildInbound(
            SEL_ETH_MAINNET,
            remoteController,
            payload
        );
        message.messageId = messageId;

        vm.expectEmit(true, true, true, true, address(controller));
        emit MessageReceived(CHAIN_ETH_MAINNET, messageId, expectedTxId);

        vm.prank(address(router));
        adapter.ccipReceive(message);
    }

    /// @dev A message arriving from a selector never mapped to a standard chain
    ///      id must revert, not be silently treated as chain `0`.
    function test_revertsForUnmappedSourceSelector() public {
        uint64 unmappedSelector = 1234567890; // not in the adapter's map
        Client.Any2EVMMessage memory message = _buildInbound(
            unmappedSelector,
            remoteController,
            ""
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.UNKNOWN_NATIVE_CHAIN_ID.selector,
                uint256(unmappedSelector)
            )
        );
        vm.prank(address(router));
        adapter.ccipReceive(message);
    }

    // -------------------------------------------------------------------------
    // The DELEGATE_CALL_FORBIDDEN receive-path guard.
    // -------------------------------------------------------------------------

    /// @dev Proves that reaching the RECEIVE path under `delegatecall` reverts.
    ///      The native<->standard map is hardcoded pure logic, so no storage is
    ///      needed for it -- `SEL_ETH_MAINNET` resolves to `ChainIds.ETHEREUM`
    ///      on its own. The ONLY storage read on the way to `_forwardMessage` is
    ///      `_trustedRemotes[originChainId]` (slot 0), which under `delegatecall`
    ///      resolves against `delegateCallerMock`'s own (otherwise empty)
    ///      storage. We plant a matching trusted-remote entry there via
    ///      `vm.store` so the trusted-remote check passes and execution genuinely
    ///      reaches `_forwardMessage`, tripping `DELEGATE_CALL_FORBIDDEN`
    ///      specifically rather than `REMOTE_NOT_TRUSTED` first.
    function test_delegatecalledIntoAdapter_revertsWithDelegateCallForbidden()
        public
    {
        // `fromNativeChainId(SEL_ETH_MAINNET)` is pure and returns this.
        uint256 originChainId = ChainIds.ETHEREUM;
        address fakeTrustedSender = makeAddr(
            "fakeTrustedSenderForDelegatecallProbe"
        );

        // `_trustedRemotes[originChainId] = fakeTrustedSender` at slot 0,
        // computed against `delegateCallerMock`'s own (otherwise empty) storage.
        bytes32 trustedRemoteSlot = keccak256(
            abi.encode(originChainId, uint256(0))
        );
        vm.store(
            address(delegateCallerMock),
            trustedRemoteSlot,
            bytes32(uint256(uint160(fakeTrustedSender)))
        );

        Client.Any2EVMMessage memory message = _buildInbound(
            SEL_ETH_MAINNET,
            fakeTrustedSender,
            ""
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.DELEGATE_CALL_FORBIDDEN.selector,
                address(delegateCallerMock), // address(this) during the delegatecalled execution
                address(adapter) // the adapter's immutable `_selfAddress`
            )
        );
        vm.prank(address(router)); // `onlyRouter` checks msg.sender, preserved across delegatecall.
        delegateCallerMock.delegateCall(
            address(adapter),
            abi.encodeCall(CCIPAdapter.ccipReceive, (message))
        );
    }
}
