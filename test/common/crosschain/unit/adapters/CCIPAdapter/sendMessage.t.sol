// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CCIPAdapterBase} from "./Base.t.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {
    CCIPAdapter
} from "@aragon/osx-commons-contracts/src/crosschain/adapters/CCIP/CCIPAdapter.sol";
import {
    BaseAdapter
} from "@aragon/osx-commons-contracts/src/crosschain/adapters/BaseAdapter.sol";
import {
    IBaseAdapter
} from "@aragon/osx-commons-contracts/src/crosschain/adapters/IBaseAdapter.sol";
import {
    Errors
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Errors.sol";
import {ERC20Mock} from "../../../../../mocks/commons/token/ERC20Mock.sol";
import {
    CCIPRouterMock
} from "../../../../../mocks/commons/crosschain/CCIPRouterMock.sol";

contract CCIPAdapterSendMessageTest is CCIPAdapterBase {
    // -------------------------------------------------------------------------
    // `sendMessage` can ONLY be reached via `delegatecall` from the controller.
    // -------------------------------------------------------------------------

    /// @dev THE core guard of the redesign. `onlyDelegatecallFromController`
    ///      checks `address(this) == CROSS_CHAIN_CONTROLLER`, NOT `msg.sender`
    ///      -- so `vm.prank(address(controller))` does nothing here; a direct
    ///      call to the adapter always has `address(this) == address(adapter)`.
    function test_revertsIfCalledDirectly_evenWhenCallerIsTheController()
        public
    {
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.SEND_PATH_NOT_DELEGATECALLED.selector,
                address(adapter)
            )
        );
        vm.prank(address(controller));
        adapter.sendMessage(remoteAdapter, SEL_ETH_MAINNET, 200_000, "");
    }

    function test_revertsIfCalledDirectlyByAnybody() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.SEND_PATH_NOT_DELEGATECALLED.selector,
                address(adapter)
            )
        );
        vm.prank(alice);
        adapter.sendMessage(remoteAdapter, SEL_ETH_MAINNET, 200_000, "");
    }

    /// @dev `RECEIVER_ADDRESS_ZERO` sits BEHIND `onlyDelegatecallFromController`
    ///      and is unreachable through the real controller today. `isolationAdapter`
    ///      + `delegateCallerMock` reproduce the `address(this) ==
    ///      CROSS_CHAIN_CONTROLLER` context directly to prove the check works.
    function test_isolated_revertsIfReceiverIsZero() public {
        bytes memory data = abi.encodeCall(
            IBaseAdapter.sendMessage,
            (address(0), SEL_ETH_MAINNET, 200_000, bytes(""))
        );

        vm.expectRevert(Errors.RECEIVER_ADDRESS_ZERO.selector);
        delegateCallerMock.delegateCall(address(isolationAdapter), data);
    }

    function test_isolated_revertsIfNativeValueSentWhileErc20FeeTokenConfigured()
        public
    {
        bytes memory data = abi.encodeCall(
            IBaseAdapter.sendMessage,
            (remoteAdapter, CHAIN_ETH_MAINNET, 200_000, bytes(""))
        );

        vm.expectRevert(Errors.UNEXPECTED_NATIVE_VALUE.selector);
        delegateCallerMock.delegateCall{value: 1 ether}(
            address(isolationAdapter),
            data
        );
    }

    // -------------------------------------------------------------------------
    // Fees -- the controller pays, the adapter never holds funds.
    // -------------------------------------------------------------------------

    /// @dev Regression test for the missing `forceApprove`: a naive adapter
    ///      that never approves the router would make `CCIPRouterMock`'s
    ///      `transferFrom` pull revert on zero allowance.
    function test_erc20Fee_approvesRouterAndRouterPullsExactFee() public {
        _registerLane(CHAIN_ETH_MAINNET, address(erc20Adapter), remoteAdapter);
        uint256 feeAmount = 3 ether;
        router.setFee(feeAmount);
        feeTokenErc20.setBalance(address(controller), feeAmount);

        bytes32 messageId = controller.forwardMessage(
            CHAIN_ETH_MAINNET,
            200_000,
            "hello"
        );

        assertEq(router.ccipSendCallCount(), 1);
        assertEq(
            feeTokenErc20.balanceOf(address(router)),
            feeAmount,
            "router must have pulled the fee"
        );
        assertEq(messageId, router.nextMessageId());
    }

    function test_erc20Fee_leavesZeroStandingAllowanceOnControllerAfterSend()
        public
    {
        _registerLane(CHAIN_ETH_MAINNET, address(erc20Adapter), remoteAdapter);
        uint256 feeAmount = 3 ether;
        router.setFee(feeAmount);
        feeTokenErc20.setBalance(address(controller), feeAmount);

        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");

        assertEq(
            feeTokenErc20.allowance(address(controller), address(router)),
            0
        );
    }

    function test_erc20Fee_revertsIfControllerBalanceInsufficient() public {
        _registerLane(CHAIN_ETH_MAINNET, address(erc20Adapter), remoteAdapter);
        uint256 feeAmount = 1 ether;
        uint256 available = 0.4 ether;
        router.setFee(feeAmount);
        feeTokenErc20.setBalance(address(controller), available);

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.INSUFFICIENT_FEE_BALANCE.selector,
                address(feeTokenErc20),
                feeAmount,
                available
            )
        );
        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");
    }

    function test_nativeFee_paysExactFeeFromControllerBalance() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter);
        uint256 feeAmount = 0.05 ether;
        router.setFee(feeAmount);
        vm.deal(address(controller), feeAmount);

        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");

        assertEq(
            router.lastMsgValue(),
            feeAmount,
            "router must receive exactly the quoted fee"
        );
        assertEq(address(controller).balance, 0);
        assertEq(
            address(adapter).balance,
            0,
            "adapter must never hold native funds"
        );
    }

    function test_nativeFee_revertsIfControllerBalanceInsufficient() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter);
        uint256 feeAmount = 1 ether;
        uint256 available = 0.5 ether;
        router.setFee(feeAmount);
        vm.deal(address(controller), available);

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.INSUFFICIENT_FEE_BALANCE.selector,
                address(0),
                feeAmount,
                available
            )
        );
        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");
    }

    // -------------------------------------------------------------------------
    // End-to-end: controller.forwardMessage -> [delegatecall] adapter -> router.
    // -------------------------------------------------------------------------

    function test_endToEnd_routesThroughAdapterToRouter() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter);

        uint256 feeAmount = 0.02 ether;
        router.setFee(feeAmount);
        vm.deal(address(controller), feeAmount);

        bytes32 expectedMessageId = keccak256("expected-message-id");
        router.setNextMessageId(expectedMessageId);

        bytes memory payload = _emptyActionsPayload();
        uint256 gasLimit = 300_000;

        bytes32 messageId = controller.forwardMessage(
            CHAIN_ETH_MAINNET,
            gasLimit,
            payload
        );

        assertEq(
            messageId,
            expectedMessageId,
            "controller must surface the router's messageId"
        );

        address decodedReceiver = abi.decode(router.lastReceiver(), (address));
        assertEq(
            decodedReceiver,
            remoteAdapter,
            "router must target the remote adapter"
        );
        // The bridge `data` is the encoded envelope the controller wraps the
        // message in, not the raw `payload`; assert the receiver/selector/fee
        // routing instead of pinning the exact envelope bytes here.
        assertEq(router.lastFeeToken(), address(0));
        assertEq(router.lastDestChainSelector(), SEL_ETH_MAINNET);
        assertEq(router.lastMsgValue(), feeAmount);
        assertEq(
            router.lastCaller(),
            address(controller),
            "CCIP must see the controller as the sender under delegatecall"
        );

        bytes memory expectedExtraArgs = Client._argsToBytes(
            Client.GenericExtraArgsV2({
                gasLimit: gasLimit,
                allowOutOfOrderExecution: true
            })
        );
        assertEq(
            router.lastExtraArgs(),
            expectedExtraArgs,
            "extraArgs must encode the requested gas limit"
        );
    }

    // -------------------------------------------------------------------------
    // Immutables resolve correctly under `delegatecall`.
    // -------------------------------------------------------------------------

    function test_immutables_feeTokenAndRouterSurviveDelegatecall_notMisreadAsControllerStorage()
        public
    {
        _registerLane(CHAIN_ETH_MAINNET, address(erc20Adapter), remoteAdapter);

        uint256 feeAmount = 2 ether;
        router.setFee(feeAmount);
        feeTokenErc20.setBalance(address(controller), feeAmount);

        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");

        assertEq(
            router.lastFeeToken(),
            address(feeTokenErc20),
            "immutable FEE_TOKEN must survive delegatecall"
        );
        assertEq(
            router.lastCaller(),
            address(controller),
            "CCIP_ROUTER must see the controller as caller"
        );
    }

    /// @dev Two adapters, two ERC20 fee tokens, two routers: a send through
    ///      lane A must resolve adapter A's OWN immutables and hit ONLY router A.
    function test_immutables_twoAdaptersRouteExclusivelyToTheirOwnRouterAndFeeToken()
        public
    {
        CCIPRouterMock routerB = new CCIPRouterMock();
        ERC20Mock feeTokenB = new ERC20Mock("Fee Token B", "FEEB");
        CCIPAdapter adapterB = new CCIPAdapter(
            address(controller),
            address(routerB),
            address(feeTokenB),
            new BaseAdapter.TrustedRemoteConfig[](0)
        );

        _registerLane(CHAIN_ETH_MAINNET, address(erc20Adapter), remoteAdapter); // -> router (lane A)
        _registerLane(CHAIN_BASE, address(adapterB), remoteAdapter); // -> routerB (lane B)

        router.setFee(1 ether);
        routerB.setFee(2 ether);
        feeTokenErc20.setBalance(address(controller), 1 ether);
        feeTokenB.setBalance(address(controller), 2 ether);

        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");

        assertEq(router.ccipSendCallCount(), 1);
        assertEq(router.lastFeeToken(), address(feeTokenErc20));
        assertEq(
            routerB.ccipSendCallCount(),
            0,
            "lane A's send must not touch router B at all"
        );
    }

    // -------------------------------------------------------------------------
    // No storage collision with the controller.
    // -------------------------------------------------------------------------

    /// @dev Snapshots the controller's storage byte-for-byte around a successful
    ///      `forwardMessage`, using the REAL `CCIPAdapter`. Layout (per
    ///      `forge inspect .../CrossChainController.sol storageLayout`):
    ///      slot 0 = `_currentTxNonce`, slot 1 = `chainToAdapter`, slot 2 =
    ///      `_transactionState`. Slot 0 legitimately increments on send (checked
    ///      separately); everything else must be untouched, as must the
    ///      adapter's own (separate-address) storage.
    function test_doesNotCollideWithControllerStorage() public {
        _registerLane(CHAIN_ETH_MAINNET, address(adapter), remoteAdapter);

        uint256 feeAmount = 0.02 ether;
        router.setFee(feeAmount);
        vm.deal(address(controller), feeAmount);

        bytes32 chainConfigSlotA = keccak256(
            abi.encode(CHAIN_ETH_MAINNET, uint256(1)) // chainToAdapter at slot 1
        );
        bytes32 chainConfigSlotB = bytes32(uint256(chainConfigSlotA) + 1);

        bytes32 nonceBefore = vm.load(address(controller), bytes32(uint256(0)));
        bytes32 slot1Before = vm.load(address(controller), bytes32(uint256(1)));
        bytes32 slot2Before = vm.load(address(controller), bytes32(uint256(2)));
        bytes32 chainConfigABefore = vm.load(
            address(controller),
            chainConfigSlotA
        );
        bytes32 chainConfigBBefore = vm.load(
            address(controller),
            chainConfigSlotB
        );

        address trustedRemoteBefore = adapter.trustedRemote(CHAIN_ETH_MAINNET);
        uint256 nativeChainIdBefore = adapter.toNativeChainId(
            CHAIN_ETH_MAINNET
        );

        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");

        // Slot 0 (`_currentTxNonce`) is the one word a send legitimately
        // mutates: it must have incremented by exactly one.
        assertEq(
            vm.load(address(controller), bytes32(uint256(0))),
            bytes32(uint256(nonceBefore) + 1),
            "nonce must increment by exactly one"
        );
        assertEq(
            vm.load(address(controller), bytes32(uint256(1))),
            slot1Before,
            "slot 1 mutated by send"
        );
        assertEq(
            vm.load(address(controller), bytes32(uint256(2))),
            slot2Before,
            "slot 2 mutated by send"
        );
        assertEq(
            vm.load(address(controller), chainConfigSlotA),
            chainConfigABefore,
            "chainToAdapter[chainId] slot A mutated by send"
        );
        assertEq(
            vm.load(address(controller), chainConfigSlotB),
            chainConfigBBefore,
            "chainToAdapter[chainId] slot B mutated by send"
        );

        assertEq(
            adapter.trustedRemote(CHAIN_ETH_MAINNET),
            trustedRemoteBefore,
            "adapter's own storage touched by send"
        );
        assertEq(
            adapter.toNativeChainId(CHAIN_ETH_MAINNET),
            nativeChainIdBefore,
            "adapter's own selector-map storage touched by send"
        );
    }

    // -------------------------------------------------------------------------
    // Fee-token immutability trade-off: no `setFeeToken`.
    // -------------------------------------------------------------------------

    /// @dev There is no setter to rotate `FEE_TOKEN` -- it is `immutable`.
    ///      Rotating means deploying a SECOND `CCIPAdapter` and repointing the
    ///      lane via `updateConfig`, which de-registers the old local adapter
    ///      and registers the new one.
    function test_feeTokenRotation_requiresDeployingANewAdapterAndRepointingTheLane()
        public
    {
        ERC20Mock newFeeToken = new ERC20Mock("New Fee Token", "NEWFEE");
        CCIPAdapter newAdapter = new CCIPAdapter(
            address(controller),
            address(router),
            address(newFeeToken),
            new BaseAdapter.TrustedRemoteConfig[](0)
        );

        // Old lane, old fee token: works today.
        _registerLane(CHAIN_ETH_MAINNET, address(erc20Adapter), remoteAdapter);
        assertTrue(
            controller.isRegisteredLocalAdapter(
                address(erc20Adapter),
                CHAIN_ETH_MAINNET
            )
        );

        router.setFee(1 ether);
        feeTokenErc20.setBalance(address(controller), 1 ether);
        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");
        assertEq(router.lastFeeToken(), address(feeTokenErc20));

        // Rotate: repoint the SAME chain id at the new adapter/fee token.
        _registerLane(CHAIN_ETH_MAINNET, address(newAdapter), remoteAdapter);

        assertFalse(
            controller.isRegisteredLocalAdapter(
                address(erc20Adapter),
                CHAIN_ETH_MAINNET
            ),
            "old adapter must lose the right to call receiveMessage once its lane is repointed"
        );
        assertTrue(
            controller.isRegisteredLocalAdapter(
                address(newAdapter),
                CHAIN_ETH_MAINNET
            )
        );

        router.setFee(1 ether);
        newFeeToken.setBalance(address(controller), 1 ether);
        controller.forwardMessage(CHAIN_ETH_MAINNET, 200_000, "");
        assertEq(
            router.lastFeeToken(),
            address(newFeeToken),
            "send must now use the new adapter's fee token"
        );
    }
}
