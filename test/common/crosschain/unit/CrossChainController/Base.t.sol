// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";

import {
    CrossChainController
} from "@aragon/osx-commons-contracts/src/crosschain/CrossChainController.sol";
import {
    ICrossChainControllerEvents,
    ICrossChainController
} from "@aragon/osx-commons-contracts/src/crosschain/ICrossChainController.sol";
import {
    Errors
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Errors.sol";
import {
    Transaction,
    TransactionState,
    TransactionLib
} from "@aragon/osx-commons-contracts/src/crosschain/lib/Transaction.sol";
import {
    Action
} from "@aragon/osx-commons-contracts/src/executors/IExecutor.sol";
import {
    DaoUnauthorized
} from "@aragon/osx-commons-contracts/src/permission/auth/auth.sol";
import {
    AdapterMock
} from "../../../../mocks/commons/crosschain/AdapterMock.sol";
import {
    CrossChainControllerDAOMock
} from "../../../../mocks/commons/crosschain/CrossChainControllerDAOMock.sol";
import {ERC20Mock} from "../../../../mocks/commons/token/ERC20Mock.sol";
import {
    ActionExecute
} from "../../../../mocks/commons/executors/ActionExecute.sol";

/// @title CrossChainControllerBase
/// @notice Shared fixture for the per-function `CrossChainController` unit
///         tests: deploys the controller + mocks, wires alice with every
///         permission, and provides the envelope / storage-slot helpers each
///         function's test file builds on.
abstract contract CrossChainControllerBase is
    Test,
    ICrossChainControllerEvents
{
    // Events come from `ICrossChainControllerEvents` (inherited), so
    // `vm.expectEmit` can `emit` them without a local redeclaration that could
    // drift from the contract's definitions.

    // -------------------------------------------------------------------------
    // Constants.
    // -------------------------------------------------------------------------
    //
    // Both `CHAIN_ID` and `OTHER_CHAIN_ID` are REMOTE counterparty chains
    // (destination on send, origin on receive) -- never this contract's own
    // chain. `OTHER_CHAIN_ID` is simply a second remote chain, used by tests
    // that need two lanes at once.
    uint256 internal constant CHAIN_ID = 10;
    uint256 internal constant OTHER_CHAIN_ID = 20;
    uint256 internal constant GAS_LIMIT = 200_000;
    uint64 internal constant BRIDGE_CHAIN_ID = 1000;
    uint64 internal constant OTHER_BRIDGE_CHAIN_ID = 2000;

    // -------------------------------------------------------------------------
    // Fixture state.
    // -------------------------------------------------------------------------

    CrossChainControllerDAOMock internal daoMock;
    CrossChainController internal controller;
    AdapterMock internal adapterA;
    AdapterMock internal adapterB;
    ERC20Mock internal feeToken;
    ActionExecute internal actionTarget;

    address internal remoteAdapterA;
    address internal remoteAdapterB;
    address internal feeSinkA;
    address internal feeSinkB;
    address internal alice; // holds every permission
    address internal bob; // holds none

    bytes32 internal FORWARD_MESSAGE_PERMISSION_ID;
    bytes32 internal UPDATE_CONFIG_PERMISSION_ID;
    bytes32 internal RETRY_MESSAGE_PERMISSION_ID;
    bytes32 internal SWEEP_PERMISSION_ID;

    function setUp() public virtual {
        daoMock = new CrossChainControllerDAOMock();
        controller = new CrossChainController(address(daoMock));

        feeToken = new ERC20Mock("Fee", "FEE");
        actionTarget = new ActionExecute();

        remoteAdapterA = makeAddr("remoteAdapterA");
        remoteAdapterB = makeAddr("remoteAdapterB");
        feeSinkA = makeAddr("feeSinkA");
        feeSinkB = makeAddr("feeSinkB");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        // Default adapters: zero fee, native. Most tests that aren't
        // specifically about fee mechanics use these unmodified so they don't
        // need to fund the controller. `AdapterMock` has no setters -- tests
        // that need different fee/messageId/feeSink/revert behaviour deploy
        // their own dedicated instance instead.
        adapterA = new AdapterMock(
            address(controller),
            address(0),
            0,
            bytes32(uint256(1)),
            feeSinkA,
            false,
            false
        );
        adapterB = new AdapterMock(
            address(controller),
            address(0),
            0,
            bytes32(uint256(2)),
            feeSinkB,
            false,
            false
        );

        FORWARD_MESSAGE_PERMISSION_ID = controller
            .FORWARD_MESSAGE_PERMISSION_ID();
        UPDATE_CONFIG_PERMISSION_ID = controller.UPDATE_CONFIG_PERMISSION_ID();
        RETRY_MESSAGE_PERMISSION_ID = controller.RETRY_MESSAGE_PERMISSION_ID();
        SWEEP_PERMISSION_ID = controller.SWEEP_PERMISSION_ID();

        daoMock.setHasPermission(
            address(controller),
            alice,
            FORWARD_MESSAGE_PERMISSION_ID,
            true
        );
        daoMock.setHasPermission(
            address(controller),
            alice,
            UPDATE_CONFIG_PERMISSION_ID,
            true
        );
        daoMock.setHasPermission(
            address(controller),
            alice,
            RETRY_MESSAGE_PERMISSION_ID,
            true
        );
        daoMock.setHasPermission(
            address(controller),
            alice,
            SWEEP_PERMISSION_ID,
            true
        );
    }

    // -------------------------------------------------------------------------
    // Config helpers.
    // -------------------------------------------------------------------------

    function _lane(
        address _local,
        address _remote
    ) internal pure returns (ICrossChainController.ChainConfig memory) {
        return
            ICrossChainController.ChainConfig({
                localAdapter: _local,
                remoteAdapter: _remote
            });
    }

    function _configureLane(
        uint256 _chainId,
        address _local,
        address _remote
    ) internal {
        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = _chainId;
        CrossChainController.ChainConfig[]
            memory configs = new CrossChainController.ChainConfig[](1);
        configs[0] = _lane(_local, _remote);

        vm.prank(alice);
        controller.updateConfig(chainIds, configs);
    }

    // -------------------------------------------------------------------------
    // Envelope helpers.
    // -------------------------------------------------------------------------

    function _emptyActionsPayload() internal pure returns (bytes memory) {
        return abi.encode(new Action[](0));
    }

    /// @dev Builds a `Transaction` envelope carrying `_message` for the given
    ///      origin/nonce. `origin`/`controller`/`destinationChainId` default to
    ///      values that are irrelevant to the receive path (which only decodes
    ///      and hashes), but must be reproduced exactly to predict the txId.
    function _tx(
        uint256 _nonce,
        uint256 _originChainId,
        bytes memory _message
    ) internal view returns (Transaction memory) {
        return
            Transaction({
                nonce: _nonce,
                origin: address(this),
                controller: address(this),
                originChainId: _originChainId,
                destinationChainId: block.chainid,
                message: _message
            });
    }

    /// @dev The encoded envelope bytes handed to `receiveMessage` as `data`.
    function _encodedTx(
        uint256 _nonce,
        uint256 _originChainId,
        bytes memory _message
    ) internal view returns (bytes memory) {
        return TransactionLib.encode(_tx(_nonce, _originChainId, _message));
    }

    /// @dev The txId `receiveMessage` will derive for the matching envelope.
    function _txId(
        uint256 _nonce,
        uint256 _originChainId,
        bytes memory _message
    ) internal view returns (bytes32) {
        return TransactionLib.id(_tx(_nonce, _originChainId, _message));
    }

    /// @dev An encoded envelope wrapping an empty `Action[]` (the common case
    ///      for tests that only care about authentication/refcounting, not the
    ///      executed actions).
    function _encodedEmptyTx(
        uint256 _nonce,
        uint256 _originChainId
    ) internal view returns (bytes memory) {
        return _encodedTx(_nonce, _originChainId, _emptyActionsPayload());
    }

    // -------------------------------------------------------------------------
    // Storage-slot helpers (verified via
    // `forge inspect .../CrossChainController.sol:CrossChainController storageLayout`):
    // slot 0 = `_currentTxNonce`, slot 1 = `_transactionState`,
    // slot 2 = `chainToAdapter`.
    // -------------------------------------------------------------------------

    uint256 internal constant NONCE_SLOT = 0;
    uint256 internal constant TRANSACTION_STATE_SLOT = 1;
    uint256 internal constant CHAIN_TO_ADAPTER_SLOT = 2;

    /// @dev `chainToAdapter[_chainId]` occupies TWO words: word 0 holds
    ///      `localAdapter`; word 1 holds `remoteAdapter`. This returns word 0's
    ///      slot; word 1 is `+ 1`.
    function _chainConfigSlot(
        uint256 _chainId
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(_chainId, CHAIN_TO_ADAPTER_SLOT));
    }
}
