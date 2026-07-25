// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    IRouterClient
} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";

import {CrossChainE2EBase} from "./CrossChainE2EBase.sol";
import {Errors} from "../../../src/common/crosschain/lib/Errors.sol";
import {
    ICrossChainController
} from "../../../src/common/crosschain/ICrossChainController.sol";
import {
    TransactionLib
} from "../../../src/common/crosschain/lib/Transaction.sol";
import {
    CCIPRelayRouterMock
} from "../../mocks/commons/crosschain/CCIPRelayRouterMock.sol";
import {
    RejectingReceiver,
    ShortReturnAdapterMock
} from "../../mocks/commons/crosschain/E2ETargets.sol";

/// @title CrossChainFeesAndOpsTest
/// @notice Fee payment, fee starvation, malformed lanes and treasury sweeps --
///         the paths an operator runs into rather than a user.
/// @dev Covers plan section G, plus the ERC20 fee half of section A.
contract CrossChainFeesAndOpsTest is CrossChainE2EBase {
    /// @notice A lane whose fee is paid in ERC20 rather than native currency.
    Stack internal erc20Origin;
    Stack internal erc20Destination;

    /// @dev Deploys the ERC20-fee lane lazily: only the fee-token tests need
    ///      it, and it doubles the setup cost of every other test in the file.
    function _useErc20Lane() internal {
        (erc20Origin, erc20Destination) = _deployLane(
            ORIGIN_CHAIN_ID,
            ORIGIN_SELECTOR,
            DESTINATION_CHAIN_ID,
            DESTINATION_SELECTOR,
            address(feeToken)
        );

        feeToken.setBalance(address(erc20Origin.controller), 10 ether);
        _on(erc20Origin);
    }

    // -------------------------------------------------------------------------
    // ERC20 fees
    // -------------------------------------------------------------------------

    /// @notice The ERC20 fee is pulled from the CONTROLLER by the Router, and
    ///         no standing allowance is left behind.
    /// @dev The allowance assertion is the regression test for the original
    ///      missing-`forceApprove` bug, and for the reset that follows it: an
    ///      adapter that approved but never zeroed would leave the controller's
    ///      treasury permanently drainable by the Router.
    function test_e2e_erc20FeeIsPulledFromTheControllerAndAllowanceIsReset()
        public
    {
        _useErc20Lane();

        uint256 controllerBefore = feeToken.balanceOf(
            address(erc20Origin.controller)
        );

        _forwardViaProposal(
            erc20Origin,
            erc20Destination,
            GAS_LIMIT,
            _cancelPayload(erc20Destination)
        );

        assertEq(
            feeToken.balanceOf(address(erc20Origin.controller)),
            controllerBefore - FEE,
            "the controller should have paid the ERC20 fee"
        );
        assertEq(
            feeToken.balanceOf(address(erc20Origin.router)),
            FEE,
            "the router should have pulled the fee"
        );
        assertEq(
            feeToken.allowance(
                address(erc20Origin.controller),
                address(erc20Origin.router)
            ),
            0,
            "no standing allowance may be left on the controller"
        );
        assertEq(
            feeToken.balanceOf(address(erc20Origin.adapter)),
            0,
            "no funds may ever sit on the adapter"
        );
    }

    /// @notice An ERC20-fee lane quotes in that token, and reports the
    ///         controller's balance of it.
    function test_e2e_erc20QuoteReportsTheTokenAndTheBalance() public {
        _useErc20Lane();

        (address token, uint256 fee, uint256 available) = erc20Origin
            .controller
            .quoteFee(
                erc20Destination.chainId,
                GAS_LIMIT,
                _cancelPayload(erc20Destination)
            );

        assertEq(token, address(feeToken));
        assertEq(fee, FEE);
        assertEq(
            available,
            feeToken.balanceOf(address(erc20Origin.controller)),
            "available must be the ERC20 balance, not the native one"
        );
    }

    // -------------------------------------------------------------------------
    // Fee starvation
    // -------------------------------------------------------------------------

    /// @notice An underfunded controller fails with the dedicated ops error,
    ///         and the same send works once it is topped up.
    function test_e2e_insufficientNativeBalanceRevertsThenSucceedsAfterTopUp()
        public
    {
        // Strand the controller just below the fee.
        vm.deal(address(origin.controller), FEE - 1);

        vm.prank(address(origin.dao));
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.INSUFFICIENT_FEE_BALANCE.selector,
                address(0),
                FEE,
                FEE - 1
            )
        );
        origin.controller.forwardMessage(
            destination.chainId,
            GAS_LIMIT,
            _cancelPayload(destination)
        );

        vm.deal(address(origin.controller), 1 ether);

        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
        _deliverNext(origin, destination);

        _assertExecuted(destination, txId);
    }

    /// @notice The same starvation on an ERC20-fee lane names the token.
    function test_e2e_insufficientErc20BalanceRevertsWithTheToken() public {
        _useErc20Lane();
        feeToken.setBalance(address(erc20Origin.controller), FEE - 1);

        vm.prank(address(erc20Origin.dao));
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.INSUFFICIENT_FEE_BALANCE.selector,
                address(feeToken),
                FEE,
                FEE - 1
            )
        );
        erc20Origin.controller.forwardMessage(
            erc20Destination.chainId,
            GAS_LIMIT,
            _cancelPayload(erc20Destination)
        );
    }

    /// @notice A failed send consumes NO nonce: the whole call reverts, so the
    ///         pre-increment is rolled back and the next send is still nonce 1.
    function test_e2e_failedSendDoesNotConsumeANonce() public {
        vm.deal(address(origin.controller), 0);

        vm.prank(address(origin.dao));
        vm.expectRevert();
        origin.controller.forwardMessage(
            destination.chainId,
            GAS_LIMIT,
            _cancelPayload(destination)
        );

        vm.deal(address(origin.controller), 1 ether);

        bytes memory payload = _cancelPayload(destination);
        bytes32 txId = _forwardViaProposal(
            origin,
            destination,
            GAS_LIMIT,
            payload
        );

        assertEq(
            txId,
            TransactionLib.id(
                _encodedTx(origin, destination, 1, address(origin.dao), payload)
            ),
            "the failed send must not have burned nonce 1"
        );
    }

    // -------------------------------------------------------------------------
    // Broken lanes
    // -------------------------------------------------------------------------

    /// @notice A cursed or disabled lane surfaces the Router's own revert,
    ///         bubbled through the `delegatecall`, rather than a generic one.
    function test_e2e_routerRevertBubblesThroughTheDelegatecall() public {
        origin.router.setCursed(true);

        vm.prank(address(origin.dao));
        vm.expectRevert(CCIPRelayRouterMock.Cursed.selector);
        origin.controller.forwardMessage(
            destination.chainId,
            GAS_LIMIT,
            _cancelPayload(destination)
        );
    }

    /// @notice A destination the Router does not serve is rejected by the
    ///         Router itself, with its own error.
    function test_e2e_unsupportedLaneIsRejectedByTheRouter() public {
        // Configure a lane on the controller for a chain the ADAPTER can map
        // but the ROUTER has no peer for.
        _configureLane(origin, THIRD_CHAIN_ID, makeAddr("remoteAdapterC"));

        vm.prank(address(origin.dao));
        vm.expectRevert(
            abi.encodeWithSelector(
                IRouterClient.UnsupportedDestinationChain.selector,
                THIRD_SELECTOR
            )
        );
        origin.controller.forwardMessage(
            THIRD_CHAIN_ID,
            GAS_LIMIT,
            _emptyPayload()
        );
    }

    /// @notice A lane whose local adapter has NO CODE must fail loudly.
    /// @dev The EVM reports success for a `delegatecall` into a codeless
    ///      address. Without the return-size check a proposal would "execute"
    ///      while nothing was ever bridged.
    function test_e2e_codelessLocalAdapterRevertsInsteadOfSilentlySucceeding()
        public
    {
        _configureLaneWithLocalAdapter(
            origin,
            destination.chainId,
            makeAddr("codeless"),
            address(destination.adapter)
        );

        vm.prank(address(origin.dao));
        vm.expectRevert(Errors.MESSAGE_SEND_FAILED.selector);
        origin.controller.forwardMessage(
            destination.chainId,
            GAS_LIMIT,
            _emptyPayload()
        );

        assertEq(origin.router.sentCount(), 0, "nothing may have been bridged");
    }

    /// @notice An adapter that returns fewer than two words is rejected rather
    ///         than decoded past the end of its return data.
    function test_e2e_shortAdapterReturnDataIsRejected() public {
        ShortReturnAdapterMock badAdapter = new ShortReturnAdapterMock();

        _configureLaneWithLocalAdapter(
            origin,
            destination.chainId,
            address(badAdapter),
            address(destination.adapter)
        );

        vm.prank(address(origin.dao));
        vm.expectRevert(Errors.MESSAGE_SEND_FAILED.selector);
        origin.controller.forwardMessage(
            destination.chainId,
            GAS_LIMIT,
            _emptyPayload()
        );
    }

    /// @notice `forwardMessage` is not payable, so no caller can attach value.
    /// @dev The delegatecalled `sendMessage` therefore always sees
    ///      `msg.value == 0`. The controller is funded through its `receive`,
    ///      not through the send.
    function test_e2e_forwardMessageRejectsAttachedValue() public {
        vm.deal(address(origin.dao), 1 ether);

        bytes memory call = abi.encodeCall(
            ICrossChainController.forwardMessage,
            (destination.chainId, GAS_LIMIT, _emptyPayload())
        );

        vm.prank(address(origin.dao));
        // solhint-disable-next-line avoid-low-level-calls
        (bool withValue, ) = address(origin.controller).call{value: 1 ether}(
            call
        );
        assertFalse(withValue, "forwardMessage must not accept value");

        // The identical call without value succeeds, so the rejection above is
        // the non-payable modifier and nothing else.
        vm.prank(address(origin.dao));
        // solhint-disable-next-line avoid-low-level-calls
        (bool withoutValue, ) = address(origin.controller).call(call);
        assertTrue(withoutValue, "the same call without value must succeed");
    }

    // -------------------------------------------------------------------------
    // Sweeping
    // -------------------------------------------------------------------------

    /// @notice Native pre-funding can be moved back to the DAO.
    function test_e2e_sweepReturnsNativeFundingToTheDao() public {
        uint256 daoBefore = address(origin.dao).balance;

        vm.prank(address(origin.dao));
        vm.expectEmit(true, true, false, true, address(origin.controller));
        emit Swept(address(0), address(origin.dao), 5 ether);
        origin.controller.sweep(address(0), address(origin.dao), 5 ether);

        assertEq(address(origin.dao).balance, daoBefore + 5 ether);
    }

    /// @notice ERC20 pre-funding can be moved back to the DAO.
    function test_e2e_sweepReturnsErc20FundingToTheDao() public {
        feeToken.setBalance(address(origin.controller), 3 ether);

        vm.prank(address(origin.dao));
        origin.controller.sweep(
            address(feeToken),
            address(origin.dao),
            3 ether
        );

        assertEq(feeToken.balanceOf(address(origin.dao)), 3 ether);
        assertEq(feeToken.balanceOf(address(origin.controller)), 0);
    }

    /// @notice Sweeping to the zero address is rejected.
    function test_e2e_sweepToZeroAddressReverts() public {
        vm.prank(address(origin.dao));
        vm.expectRevert(Errors.ZERO_ADDRESS.selector);
        origin.controller.sweep(address(0), address(0), 1 ether);
    }

    /// @notice A recipient that rejects the transfer surfaces a named error.
    function test_e2e_sweepToARejectingReceiverReverts() public {
        RejectingReceiver rejector = new RejectingReceiver();

        vm.prank(address(origin.dao));
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.NATIVE_TRANSFER_FAILED.selector,
                address(rejector),
                1 ether
            )
        );
        origin.controller.sweep(address(0), address(rejector), 1 ether);
    }

    /// @notice Sweeping the whole balance strands the next send. The ops
    ///         runbook consequence of the controller being the fee payer.
    function test_e2e_sweepingEverythingStrandsTheNextSend() public {
        vm.prank(address(origin.dao));
        origin.controller.sweep(
            address(0),
            address(origin.dao),
            address(origin.controller).balance
        );

        vm.prank(address(origin.dao));
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.INSUFFICIENT_FEE_BALANCE.selector,
                address(0),
                FEE,
                0
            )
        );
        origin.controller.forwardMessage(
            destination.chainId,
            GAS_LIMIT,
            _emptyPayload()
        );
    }
}
