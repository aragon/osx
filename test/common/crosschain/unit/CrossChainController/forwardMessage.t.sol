// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {CrossChainControllerBase} from "./Base.t.sol";
import {
    CrossChainController
} from "@aragon/osx-commons-contracts/src/crosschain/CrossChainController.sol";
import {
    Errors
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Errors.sol";
import {
    Transaction,
    TransactionLib
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Transaction.sol";
import {
    DaoUnauthorized
} from "@aragon/osx-commons-contracts/src/permission/auth/auth.sol";
import {
    AdapterMock
} from "../../../../mocks/commons/crosschain/AdapterMock.sol";
import {
    MaliciousAdapterMock,
    PwnTarget
} from "../../../../mocks/commons/crosschain/MaliciousAdapterMock.sol";

contract CrossChainControllerForwardMessageTest is CrossChainControllerBase {
    function test_revertsIfChainNotConfigured() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.ADAPTER_NOT_CONFIGURED.selector,
                CHAIN_ID
            )
        );
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_bubblesAdapterRevertReasonVerbatim() public {
        AdapterMock revertingAdapter = new AdapterMock(
            address(controller),
            address(0),
            0,
            bytes32(0),
            feeSinkA,
            true,
            false
        );
        _configureLane(CHAIN_ID, address(revertingAdapter), remoteAdapterA);

        vm.expectRevert("AdapterMock: sendMessage reverted");
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_revertsWithMessageSendFailed_whenAdapterFailsWithNoReturnData()
        public
    {
        RevertNoReasonAdapterStub badAdapter = new RevertNoReasonAdapterStub();
        _configureLane(CHAIN_ID, address(badAdapter), remoteAdapterA);

        vm.expectRevert(Errors.MESSAGE_SEND_FAILED.selector);
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    /// @dev A "successful" delegatecall that returns fewer than 64 bytes cannot
    ///      be a valid `(bytes32 messageId, uint256 fee)` pair. `forwardMessage`
    ///      must fail loudly here too, not `abi.decode` garbage.
    function test_revertsWithMessageSendFailed_whenAdapterReturnsMalformedData()
        public
    {
        ShortReturnAdapterStub badAdapter = new ShortReturnAdapterStub();
        _configureLane(CHAIN_ID, address(badAdapter), remoteAdapterA);

        vm.expectRevert(Errors.MESSAGE_SEND_FAILED.selector);
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    // -------------------------------------------------------------------------
    // Auth + happy path.
    // -------------------------------------------------------------------------

    function test_revertsIfCallerUnauthorized() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector,
                address(daoMock),
                address(controller),
                bob,
                FORWARD_MESSAGE_PERMISSION_ID
            )
        );
        vm.prank(bob);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_happyPathEmitsMessageForwardedAndReturnsMessageId() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);
        bytes32 expectedMessageId = bytes32(uint256(1)); // adapterA's immutable messageId

        bytes memory message = abi.encode("hello");

        // `forwardMessage` stamps nonce = ++_currentTxNonce (1 on first send),
        // origin = msg.sender (alice), originChainId = block.chainid,
        // destinationChainId = CHAIN_ID. The txId is that envelope's id.
        bytes32 expectedTxId = TransactionLib.id(
            Transaction({
                nonce: 1,
                origin: alice,
                originChainId: block.chainid,
                destinationChainId: CHAIN_ID,
                message: message
            })
        );

        vm.expectEmit(true, true, true, true, address(controller));
        emit MessageForwarded(
            CHAIN_ID,
            expectedMessageId,
            expectedTxId,
            address(adapterA),
            remoteAdapterA,
            GAS_LIMIT,
            0
        );

        vm.prank(alice);
        bytes32 messageId = controller.forwardMessage(
            CHAIN_ID,
            GAS_LIMIT,
            message
        );

        assertEq(messageId, expectedMessageId);
    }

    // -------------------------------------------------------------------------
    // Fees -- the fee flow is DIRECT (no hand-over to the adapter).
    // -------------------------------------------------------------------------

    function test_nativeFee_revertsIfControllerBalanceInsufficient() public {
        AdapterMock nativeFeeAdapter = new AdapterMock(
            address(controller),
            address(0),
            1 ether,
            bytes32(uint256(3)),
            feeSinkA,
            false,
            false
        );
        _configureLane(CHAIN_ID, address(nativeFeeAdapter), remoteAdapterA);

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.INSUFFICIENT_FEE_BALANCE.selector,
                address(0),
                1 ether,
                0
            )
        );
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_nativeFee_feeMovesDirectlyFromControllerToSink_adapterBalanceUntouched()
        public
    {
        uint256 requiredFee = 1 ether;
        AdapterMock nativeFeeAdapter = new AdapterMock(
            address(controller),
            address(0),
            requiredFee,
            bytes32(uint256(3)),
            feeSinkA,
            false,
            false
        );
        _configureLane(CHAIN_ID, address(nativeFeeAdapter), remoteAdapterA);
        vm.deal(address(controller), requiredFee + 3 ether); // extra buffer left untouched

        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());

        assertEq(feeSinkA.balance, requiredFee);
        assertEq(address(controller).balance, 3 ether);
        // No hand-over: the adapter CONTRACT itself never held or moved a wei.
        assertEq(address(nativeFeeAdapter).balance, 0);
    }

    function test_erc20Fee_revertsIfControllerBalanceInsufficient() public {
        AdapterMock erc20FeeAdapter = new AdapterMock(
            address(controller),
            address(feeToken),
            100 ether,
            bytes32(uint256(4)),
            feeSinkB,
            false,
            false
        );
        _configureLane(CHAIN_ID, address(erc20FeeAdapter), remoteAdapterA);

        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.INSUFFICIENT_FEE_BALANCE.selector,
                address(feeToken),
                100 ether,
                0
            )
        );
        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());
    }

    function test_erc20Fee_feeMovesDirectlyFromControllerToSink_adapterBalanceUntouched()
        public
    {
        uint256 requiredFee = 100 ether;
        AdapterMock erc20FeeAdapter = new AdapterMock(
            address(controller),
            address(feeToken),
            requiredFee,
            bytes32(uint256(4)),
            feeSinkB,
            false,
            false
        );
        _configureLane(CHAIN_ID, address(erc20FeeAdapter), remoteAdapterA);
        feeToken.setBalance(address(controller), requiredFee + 1 ether); // extra buffer

        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());

        assertEq(feeToken.balanceOf(feeSinkB), requiredFee);
        assertEq(feeToken.balanceOf(address(controller)), 1 ether);
        // No hand-over: the ERC20 never touches the adapter CONTRACT's address.
        assertEq(feeToken.balanceOf(address(erc20FeeAdapter)), 0);
    }

    // -------------------------------------------------------------------------
    // Delegatecall safety: no storage collision, immutables resolve to the
    // CALLED adapter's bytecode.
    // -------------------------------------------------------------------------

    function test_doesNotCollideWithControllerStorage() public {
        _configureLane(CHAIN_ID, address(adapterA), remoteAdapterA);

        bytes32[] memory slots = _controllerSnapshotSlots(CHAIN_ID);
        bytes32[] memory valuesBefore = _loadAll(slots);
        bytes32 gettersHashBefore = _gettersHash(CHAIN_ID, address(adapterA));
        bytes32 nonceBefore = vm.load(address(controller), bytes32(uint256(0)));

        vm.prank(alice);
        bytes32 messageId = controller.forwardMessage(
            CHAIN_ID,
            GAS_LIMIT,
            abi.encode("no collision")
        );
        // Sanity: the send actually happened, this isn't vacuously true.
        assertEq(messageId, bytes32(uint256(1)));

        bytes32[] memory valuesAfter = _loadAll(slots);
        for (uint256 i = 0; i < slots.length; i++) {
            assertEq(valuesAfter[i], valuesBefore[i]);
        }
        assertEq(_gettersHash(CHAIN_ID, address(adapterA)), gettersHashBefore);

        // Slot 0 (`_currentTxNonce`) is the ONE word `forwardMessage`
        // legitimately mutates: it must have incremented by exactly one.
        assertEq(
            vm.load(address(controller), bytes32(uint256(0))),
            bytes32(uint256(nonceBefore) + 1),
            "nonce must increment by exactly one"
        );
    }

    function test_immutablesResolveToConfiguredAdapter_notTheOtherOne_notZero()
        public
    {
        address sinkX = makeAddr("sinkX");
        address sinkY = makeAddr("sinkY");
        bytes32 messageIdX = bytes32(uint256(111));
        bytes32 messageIdY = bytes32(uint256(222));

        AdapterMock adapterX = new AdapterMock(
            address(controller),
            address(0),
            1 ether,
            messageIdX,
            sinkX,
            false,
            false
        );
        AdapterMock adapterY = new AdapterMock(
            address(controller),
            address(feeToken),
            2 ether,
            messageIdY,
            sinkY,
            false,
            false
        );

        _configureLane(CHAIN_ID, address(adapterX), remoteAdapterA);

        // Fund the controller for BOTH adapters' fees, so a bug that read
        // adapterY's immutables (or the controller's own empty storage) could
        // still "succeed" -- only genuinely resolving adapterX's bytecode
        // immutables makes this assert the right values.
        vm.deal(address(controller), 1 ether);
        feeToken.setBalance(address(controller), 2 ether);

        vm.prank(alice);
        bytes32 messageId = controller.forwardMessage(
            CHAIN_ID,
            GAS_LIMIT,
            _emptyActionsPayload()
        );

        assertEq(messageId, messageIdX);
        assertTrue(messageId != messageIdY);
        assertTrue(messageId != bytes32(0));

        assertEq(sinkX.balance, 1 ether);
        assertEq(address(controller).balance, 0);
        assertTrue(address(adapterY).code.length > 0);
        assertEq(sinkY.balance, 0);
        assertEq(feeToken.balanceOf(sinkY), 0);
        assertEq(feeToken.balanceOf(address(controller)), 2 ether);
    }

    // -------------------------------------------------------------------------
    // Residual risk: a malicious local adapter is delegatecalled and can
    // corrupt controller storage + execute on the DAO. Documents that
    // UPDATE_CONFIG_PERMISSION must be DAO-only in production.
    // -------------------------------------------------------------------------

    function test_residualRisk_maliciousAdapterCanCorruptControllerAndExecuteOnDAO()
        public
    {
        PwnTarget target = new PwnTarget();
        bytes32 arbitrarySlot = keccak256(
            "some arbitrary controller storage slot"
        );
        bytes32 arbitraryValue = bytes32(uint256(0xDEADBEEF));

        MaliciousAdapterMock evilAdapter = new MaliciousAdapterMock(
            address(controller),
            address(daoMock),
            address(target),
            arbitrarySlot,
            arbitraryValue
        );

        daoMock.setHasPermission(
            address(daoMock),
            address(controller),
            keccak256("EXECUTE_PERMISSION"),
            true
        );

        _configureLane(CHAIN_ID, address(evilAdapter), remoteAdapterA);

        assertEq(vm.load(address(controller), arbitrarySlot), bytes32(0));
        assertFalse(target.pwned());

        vm.prank(alice);
        controller.forwardMessage(CHAIN_ID, GAS_LIMIT, _emptyActionsPayload());

        assertEq(vm.load(address(controller), arbitrarySlot), arbitraryValue);
        assertTrue(target.pwned());
    }

    // -------------------------------------------------------------------------
    // Snapshot helpers (local to this file -- only forwardMessage needs them).
    // -------------------------------------------------------------------------

    /// @dev EXCLUDES slot 0 (`_currentTxNonce`), which `forwardMessage`
    ///      legitimately increments (checked separately). Slots 1/2 are the
    ///      mapping bases (holding nothing themselves), plus the two concrete
    ///      words `chainToAdapter[_chainId]` occupies.
    function _controllerSnapshotSlots(
        uint256 _chainId
    ) internal pure returns (bytes32[] memory slots) {
        slots = new bytes32[](4);
        slots[0] = bytes32(uint256(1));
        slots[1] = bytes32(uint256(2));
        bytes32 configWord0 = _chainConfigSlot(_chainId);
        slots[2] = configWord0;
        slots[3] = bytes32(uint256(configWord0) + 1);
    }

    function _loadAll(
        bytes32[] memory _slots
    ) internal view returns (bytes32[] memory values) {
        values = new bytes32[](_slots.length);
        for (uint256 i = 0; i < _slots.length; i++) {
            values[i] = vm.load(address(controller), _slots[i]);
        }
    }

    /// @dev Collapses every public getter relevant to a lane/adapter into one
    ///      hash, so before/after comparisons need one local instead of five.
    function _gettersHash(
        uint256 _chainId,
        address _adapter
    ) internal view returns (bytes32) {
        (address local, address remote) = controller.chainToAdapter(_chainId);
        return
            keccak256(
                abi.encode(
                    local,
                    remote,
                    controller.isRegisteredLocalAdapter(_adapter, _chainId)
                )
            );
    }
}

/// @dev A non-conforming "adapter" whose `sendMessage` succeeds but returns
///      too little data to be a valid `(bytes32, uint256)` pair. Matches
///      `IBaseAdapter.sendMessage`'s selector so the controller's delegatecall
///      dispatches into it exactly as a real adapter.
contract ShortReturnAdapterStub {
    function sendMessage(
        address /* receiver */,
        uint256 /* destinationChainId */,
        uint256 /* gasLimit */,
        bytes calldata /* message */
    ) external payable returns (bool) {
        return true;
    }
}

/// @dev A non-conforming "adapter" whose `sendMessage` reverts with NO
///      returndata at all, exercising the `returndata.length == 0` branch of
///      `Errors.MESSAGE_SEND_FAILED()`.
contract RevertNoReasonAdapterStub {
    function sendMessage(
        address /* receiver */,
        uint256 /* destinationChainId */,
        uint256 /* gasLimit */,
        bytes calldata /* message */
    ) external payable returns (bytes32, uint256) {
        revert();
    }
}
