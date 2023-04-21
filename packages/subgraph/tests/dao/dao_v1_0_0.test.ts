import {
  afterEach,
  assert,
  beforeAll,
  beforeEach,
  clearStore,
  describe,
  test
} from 'matchstick-as/assembly/index';
import {Address, Bytes, BigInt, ethereum} from '@graphprotocol/graph-ts';

import {
  handleNativeTokenDeposited,
  handleDeposited,
  handleExecuted,
  _handleMetadataSet,
  handleTrustedForwarderSet,
  handleSignatureValidatorSet,
  handleStandardCallbackRegistered,
  handleCallbackReceived
} from '../../src/dao/dao_v1_0_0';
import {
  DAO_ADDRESS,
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  ONE_ETH,
  STRING_DATA,
  ADDRESS_ZERO,
  CONTRACT_ADDRESS,
  ZERO_BYTES32,
  ADDRESS_THREE,
  ADDRESS_FOUR,
  ERC20_AMOUNT_HALF,
  ERC20_AMOUNT_FULL
} from '../constants';
import {createDummyActions, createTokenCalls} from '../utils';
import {
  getBalanceOf,
  createNewExecutedEvent,
  createDaoEntityState,
  createTrustedForwarderSetEvent,
  createSignatureValidatorSetEvent,
  createStandardCallbackRegisteredEvent,
  getSupportsInterface,
  encodeWithFunctionSelector
} from './utils';
import {
  ERC20_transfer,
  ERC20_transferFrom,
  ERC721_safeTransferFromWithData,
  ERC721_transferFrom,
  getTransferId,
  onERC721Received
} from '../../src/utils/tokens/common';
import {
  Action,
  ERC721Balance,
  TransactionActionsProposal
} from '../../generated/schema';
import {Executed} from '../../generated/templates/DaoTemplateV1_0_0/DAO';
import {
  ExtendedDao,
  ExtendedERC20Balance,
  ExtendedERC20Contract,
  ExtendedERC20Transfer,
  ExtendedERC721Balance,
  ExtendedERC721Contract,
  ExtendedERC721Transfer,
  ExtendedNativeBalance,
  ExtendedNativeTransfer
} from '../helpers/extended-schema';

const eq = assert.fieldEquals;

let daoId = Address.fromString(DAO_ADDRESS).toHexString();
let tokenId = Address.fromString(DAO_TOKEN_ADDRESS).toHexString();
let balanceId = daoId.concat('_').concat(tokenId);

let daoTokenContract: ExtendedERC20Contract;
let erc721Contract: ExtendedERC721Contract;

// create Executed event with multiple actions
function createExecutedEvent(
  tuple: ethereum.Value[][],
  selectors: string[],
  isDynamic: boolean,
  execResults: Bytes[],
  failureMap: string
): Executed {
  let actions: ethereum.Tuple[] = [];
  for (let i = 0; i < selectors.length; i++) {
    let functionData = encodeWithFunctionSelector(
      tuple[i],
      selectors[i],
      isDynamic
    );

    let action = createDummyActions(
      DAO_TOKEN_ADDRESS,
      '0',
      functionData.toHexString()
    );

    actions.push(action[0]);
  }

  if (execResults.length == 0) {
    for (let i = 0; i < actions.length; i++) {
      execResults[i] = Bytes.fromHexString('0x11');
    }
  }

  let event = createNewExecutedEvent<Executed>(
    Address.fromHexString(CONTRACT_ADDRESS).toHexString(),
    ZERO_BYTES32,
    actions,
    BigInt.fromString(failureMap),
    execResults,
    Address.fromHexString(DAO_ADDRESS).toHexString(),
    null
  );

  return event;
}

test('Run dao (handleMetadataSet) mappings with mock event', () => {
  // Create state
  let dao = new ExtendedDao().withDefaultValues();
  dao.buildOrUpdate();

  let newMetadata = 'new-metadata';

  // Handle event
  _handleMetadataSet(dao.id, newMetadata);

  // Checks
  // Expected changes
  dao.metadata = newMetadata;

  // Assert dao entity
  dao.assertEntity();

  clearStore();
});

describe('handleNativeTokenDeposited', () => {
  test('create entities with correct values', () => {
    let dao = new ExtendedDao().withDefaultValues();

    // create event
    let newEvent = dao.createEvent_NativeTokenDeposited(ADDRESS_ONE, ONE_ETH);

    // handle event
    handleNativeTokenDeposited(newEvent);

    // check NativeBalance entity
    let nativeBalance = new ExtendedNativeBalance().withDefaultValues();

    // expected changes
    let balance = BigInt.fromString(ONE_ETH);
    nativeBalance.balance = balance;
    nativeBalance.lastUpdated = newEvent.block.timestamp;
    // assert
    nativeBalance.assertEntity();

    // check NativeTransfer entity
    let txHash = newEvent.transaction.hash;
    let logIndex = newEvent.transactionLogIndex;

    let transferId = getTransferId(txHash, logIndex, 0);
    let nativeTransfer = new ExtendedNativeTransfer().withDefaultValues(
      transferId
    );
    // expected changes
    nativeTransfer.amount = balance;
    nativeTransfer.txHash = txHash;

    nativeTransfer.assertEntity();

    clearStore();
  });
  test('correctly handles multiple events and updates balance', () => {
    let dao = new ExtendedDao().withDefaultValues();

    // create event
    let newEvent = dao.createEvent_NativeTokenDeposited(ADDRESS_ONE, ONE_ETH);

    newEvent.transactionLogIndex = BigInt.fromI32(2);
    handleNativeTokenDeposited(newEvent);

    newEvent.transactionLogIndex = BigInt.fromI32(3);
    handleNativeTokenDeposited(newEvent);

    assert.entityCount('NativeTransfer', 2);
    assert.entityCount('NativeBalance', 1);

    // check NativeBalance entity
    let nativeBalance = new ExtendedNativeBalance().withDefaultValues();

    // expected changes
    let eachAmount = BigInt.fromString(ONE_ETH);
    let finalAmount = eachAmount.plus(eachAmount);
    nativeBalance.balance = finalAmount;
    nativeBalance.lastUpdated = newEvent.block.timestamp;
    // assert
    nativeBalance.assertEntity();

    clearStore();
  });
});

describe('handleDeposited: ', () => {
  beforeAll(() => {
    daoTokenContract = new ExtendedERC20Contract().withDefaultValues();
    let totalSupply = '10';
    daoTokenContract.mockCall_createTokenCalls(totalSupply);
    daoTokenContract.mockCall_balanceOf(DAO_ADDRESS, ERC20_AMOUNT_HALF);
    daoTokenContract.mockCall_balanceOf(DAO_TOKEN_ADDRESS, ERC20_AMOUNT_HALF);
  });

  afterEach(() => {
    clearStore();
  });

  test('ERC20: creates entities with correct values', () => {
    let dao = new ExtendedDao().withDefaultValues();

    let newEvent = dao.createEvent_Deposited(
      ADDRESS_ONE,
      ERC20_AMOUNT_HALF,
      STRING_DATA
    );

    let txHash = newEvent.transaction.hash;
    let logIndex = newEvent.transactionLogIndex;
    let timestamp = newEvent.block.timestamp;

    handleDeposited(newEvent);

    let transferId = getTransferId(txHash, logIndex, 0);

    // check ERC20Contract entity
    daoTokenContract.assertEntity();
    assert.entityCount('ERC20Contract', 1);

    // check ERC20Balance entity
    let erc20Balance = new ExtendedERC20Balance().withDefaultValues();
    // expected changes
    let balance = BigInt.fromString(ERC20_AMOUNT_HALF);
    erc20Balance.balance = balance;
    erc20Balance.lastUpdated = timestamp;
    // assert
    erc20Balance.assertEntity();
    assert.entityCount('ERC20Contract', 1);

    // Check ERC20Transfer
    let erc20Transfer = new ExtendedERC20Transfer().withDefaultValue(
      transferId
    );
    // expected changes
    erc20Transfer.amount = balance;
    erc20Transfer.txHash = txHash;
    // assert
    erc20Transfer.assertEntity();
    assert.entityCount('ERC20Transfer', 1);
  });

  test('ERC20: creates multiple events and updates balance', () => {
    let dao = new ExtendedDao().withDefaultValues();

    let newEvent = dao.createEvent_Deposited(
      ADDRESS_ONE,
      ERC20_AMOUNT_HALF,
      STRING_DATA
    );

    handleDeposited(newEvent);

    // check ERC20Balance entity
    let erc20Balance = new ExtendedERC20Balance().withDefaultValues();
    // expected changes
    let balance = BigInt.fromString(ERC20_AMOUNT_HALF);
    erc20Balance.balance = balance;
    erc20Balance.lastUpdated = newEvent.block.timestamp;
    // assert
    erc20Balance.assertEntity();

    daoTokenContract.mockCall_balanceOf(DAO_ADDRESS, ERC20_AMOUNT_FULL);

    newEvent.transactionLogIndex = BigInt.fromI32(2);
    handleDeposited(newEvent);

    // check ERC20Balance entity for updated balance
    // expected changes
    let balance2 = BigInt.fromString(ERC20_AMOUNT_FULL);
    erc20Balance.balance = balance2;
    // assert
    erc20Balance.assertEntity();
    assert.entityCount('ERC20Transfer', 2);
  });

  test('ETH: creates entities with correct values', () => {
    let token = ADDRESS_ZERO;

    let dao = new ExtendedDao().withDefaultValues();
    dao.token = token;

    let newEvent = dao.createEvent_Deposited(ADDRESS_ONE, ONE_ETH, STRING_DATA);

    let txHash = newEvent.transaction.hash;
    let logIndex = newEvent.transactionLogIndex;
    handleDeposited(newEvent);

    // check NativeBalance entity
    let nativeBalance = new ExtendedNativeBalance().withDefaultValues();

    // expected changes
    let balance = BigInt.fromString(ONE_ETH);
    nativeBalance.balance = balance;
    nativeBalance.lastUpdated = newEvent.block.timestamp;
    // assert
    nativeBalance.assertEntity();

    // Check NativeTransfer
    let transferId = getTransferId(txHash, logIndex, 0);
    let nativeTransfer = new ExtendedNativeTransfer().withDefaultValues(
      transferId
    );
    // expected changes
    nativeTransfer.amount = balance;
    nativeTransfer.txHash = txHash;
    nativeTransfer.reference = STRING_DATA;

    nativeTransfer.assertEntity();
  });

  test('ETH: correctly handles multiple events and updates balance', () => {
    // create event
    let token = ADDRESS_ZERO;

    let dao = new ExtendedDao().withDefaultValues();
    dao.token = token;

    let newEvent = dao.createEvent_Deposited(ADDRESS_ONE, ONE_ETH, STRING_DATA);

    handleDeposited(newEvent);

    newEvent.transactionLogIndex = BigInt.fromI32(2);
    handleDeposited(newEvent);

    let eachAmount = BigInt.fromString(ONE_ETH);
    let finalAmount = eachAmount.plus(eachAmount);

    // check NativeBalance entity
    let nativeBalance = new ExtendedNativeBalance().withDefaultValues();
    // expected changes
    nativeBalance.balance = finalAmount;
    nativeBalance.lastUpdated = newEvent.block.timestamp;
    // assert
    nativeBalance.assertEntity();

    assert.entityCount('NativeTransfer', 2);
    assert.entityCount('NativeBalance', 1);
  });
});

describe('handleCallbackReceived: ', () => {
  beforeAll(() => {
    erc721Contract = new ExtendedERC721Contract().withDefaultValues();
    erc721Contract.mockCall_createTokenCalls();

    getSupportsInterface(DAO_TOKEN_ADDRESS, '0x01ffc9a7', true);
    getSupportsInterface(DAO_TOKEN_ADDRESS, '80ac58cd', true);
    getSupportsInterface(DAO_TOKEN_ADDRESS, '00000000', false);
  });

  describe('ERC721 Received: ', () => {
    test('create entities with correct values', () => {
      let tokenId = BigInt.fromU32(1);
      let tupleArray: Array<ethereum.Value> = [
        ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
        ethereum.Value.fromAddress(Address.fromString(ADDRESS_FOUR)),
        ethereum.Value.fromUnsignedBigInt(tokenId),
        ethereum.Value.fromBytes(Bytes.fromHexString('0x'))
      ];

      let functionData = encodeWithFunctionSelector(
        tupleArray,
        onERC721Received,
        true
      );

      let dao = new ExtendedDao().withDefaultValues();

      let newEvent = dao.createEvent_CallbackReceived(
        onERC721Received,
        functionData
      );

      handleCallbackReceived(newEvent);

      let txHash = newEvent.transaction.hash;
      let logIndex = newEvent.transactionLogIndex;
      let timestamp = newEvent.block.timestamp;

      let transferId = getTransferId(txHash, logIndex, 0);

      // check ERC721Contract entity
      erc721Contract.assertEntity();
      assert.entityCount('ERC721Contract', 1);

      // check ERC721Balance entity
      let erc721Balance = new ExtendedERC721Balance().withDefaultValues();
      // expexted changes
      erc721Balance.tokenIds = [tokenId];
      erc721Balance.lastUpdated = timestamp;
      erc721Balance.assertEntity();
      assert.entityCount('ERC721Balance', 1);

      // Check ERC721Transfer
      let erc721Transfer = new ExtendedERC721Transfer().withDefaultValues(
        transferId
      );
      // expected changes
      erc721Transfer.from = Address.fromHexString(ADDRESS_FOUR);
      erc721Transfer.tokenId = tokenId;
      erc721Transfer.txHash = txHash;
      erc721Transfer.createdAt = timestamp;
      // assert
      erc721Transfer.assertEntity();

      clearStore();
    });

    test('correctly handles multiple events and updates balance', () => {
      let tupleArray: Array<ethereum.Value> = [
        ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
        ethereum.Value.fromAddress(Address.fromString(ADDRESS_FOUR)),
        ethereum.Value.fromUnsignedBigInt(BigInt.fromU32(1)),
        ethereum.Value.fromBytes(Bytes.fromHexString('0x'))
      ];

      let functionData = encodeWithFunctionSelector(
        tupleArray,
        onERC721Received,
        true
      );

      let dao = new ExtendedDao().withDefaultValues();

      let newEvent = dao.createEvent_CallbackReceived(
        onERC721Received,
        functionData
      );

      handleCallbackReceived(newEvent);

      tupleArray[2] = ethereum.Value.fromUnsignedBigInt(BigInt.fromU32(2));
      functionData = encodeWithFunctionSelector(
        tupleArray,
        onERC721Received,
        true
      );
      newEvent = dao.createEvent_CallbackReceived(
        onERC721Received,
        functionData
      );

      // After 1st event
      assert.entityCount('ERC721Contract', 1);
      assert.entityCount('ERC721Transfer', 1);
      assert.entityCount('ERC721Balance', 1);
      // check ERC721Balance entity
      let erc721Balance = new ExtendedERC721Balance().withDefaultValues();
      // expexted changes
      erc721Balance.tokenIds = [BigInt.fromU32(1)];
      erc721Balance.lastUpdated = newEvent.block.timestamp;
      erc721Balance.assertEntity();

      // Change log index so it will enforce to generate new transferId
      // to make sure we can assert ERC721Transfer to be 2.
      newEvent.transactionLogIndex = BigInt.fromI32(2);

      handleCallbackReceived(newEvent);

      // After 1st event
      assert.entityCount('ERC721Contract', 1);
      assert.entityCount('ERC721Transfer', 2);
      assert.entityCount('ERC721Balance', 1);
      // check ERC721Balance entity
      // expexted changes
      erc721Balance.tokenIds = [BigInt.fromU32(1), BigInt.fromU32(2)];
      erc721Balance.assertEntity();
    });
  });
});

describe('handleExecuted', () => {
  afterEach(() => {
    clearStore();
  });

  test('successfuly creates action and proposal if not found', () => {
    let tuple: Array<ethereum.Value> = [ethereum.Value.fromString('')];
    let selector = '0x11111111';

    let execResults = [
      Bytes.fromHexString('0x11'),
      Bytes.fromHexString('0x22')
    ];

    let failureMap = '2';

    let event = createExecutedEvent(
      [tuple, tuple],
      [selector, selector],
      false,
      execResults,
      failureMap
    );

    handleExecuted(event);

    let proposalId = event.params.actor
      .toHexString()
      .concat('_')
      .concat(event.params.callId.toHexString())
      .concat('_')
      .concat(event.transaction.hash.toHexString())
      .concat('_')
      .concat(event.transactionLogIndex.toHexString());

    assert.entityCount('TransactionActionsProposal', 1);
    assert.entityCount('Action', 2);

    eq('TransactionActionsProposal', proposalId, 'id', proposalId);
    eq('TransactionActionsProposal', proposalId, 'failureMap', failureMap);

    for (let i = 0; i < event.params.actions.length; i++) {
      let actionId = proposalId.concat('_').concat(i.toString());

      eq('Action', actionId, 'id', actionId);
      eq('Action', actionId, 'execResult', execResults[i].toHexString());
      eq('Action', actionId, 'dao', DAO_ADDRESS);
      eq('Action', actionId, 'proposal', proposalId);
      eq(
        'Action',
        actionId,
        'data',
        encodeWithFunctionSelector(tuple, selector).toHexString()
      );
    }
  });

  test('successfuly updates action and proposal if found', () => {
    let tuple: Array<ethereum.Value> = [ethereum.Value.fromString('')];
    let selector = '0x11111111';
    let execResult = Bytes.fromHexString('0x11');
    let failureMap = '2';

    let event = createExecutedEvent(
      [tuple],
      [selector],
      false,
      [execResult],
      failureMap
    );

    let proposalId = event.params.actor
      .toHexString()
      .concat('_')
      .concat(event.params.callId.toHexString())
      .concat('_')
      .concat(event.transaction.hash.toHexString())
      .concat('_')
      .concat(event.transactionLogIndex.toHexString());

    let actionId = proposalId.concat('_').concat('0');

    // create proposal
    let proposal = new TransactionActionsProposal(proposalId);
    proposal.dao = event.address.toHexString();
    proposal.createdAt = event.block.timestamp;
    proposal.endDate = event.block.timestamp;
    proposal.startDate = event.block.timestamp;
    proposal.allowFailureMap = BigInt.zero();
    proposal.creator = event.params.actor;
    proposal.executionTxHash = event.transaction.hash;
    proposal.executed = true;
    proposal.save();

    // create action
    let action = new Action(actionId);
    action.to = Address.fromString(DAO_TOKEN_ADDRESS);
    action.data = Bytes.fromHexString('0x');
    action.value = BigInt.zero();
    action.dao = event.address.toHexString();
    action.proposal = proposal.id;
    action.save();

    // Check that before `handleExecute`, execResults are empty
    assert.entityCount('Action', 1);
    assert.entityCount('TransactionActionsProposal', 1);
    assert.assertTrue(action.execResult === null);
    assert.assertTrue(proposal.failureMap === null);

    handleExecuted(event);

    // The action and proposal count should be the same.
    assert.entityCount('Action', 1);
    assert.entityCount('TransactionActionsProposal', 1);

    eq('Action', actionId, 'id', actionId);
    eq('Action', actionId, 'execResult', execResult.toHexString());

    eq('TransactionActionsProposal', proposalId, 'id', proposalId);
    eq('TransactionActionsProposal', proposalId, 'failureMap', failureMap);
  });

  describe('ERC20 action', () => {
    beforeAll(() => {
      createTokenCalls(DAO_TOKEN_ADDRESS, 'name', 'symbol', '6', '10');
      getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, ERC20_AMOUNT_HALF);
      getBalanceOf(DAO_TOKEN_ADDRESS, DAO_TOKEN_ADDRESS, ERC20_AMOUNT_HALF);

      // Even though for ERC20, there's no need to be mocking supportsInterface of ERC721,
      // The below is still required. This is caused by the fact that ERC20's transferFrom
      // And ERC721 transferFrom exactly have the same signature and mapping can't detect,
      // So the test should be agnostic even if ERC721 check gets called first from mapping.
      // Otherwise, without the below mock and if ERC721 check is called from mapping, the test
      // Would fail. https://github.com/LimeChain/matchstick/issues/278#issuecomment-1426884510
      getSupportsInterface(DAO_TOKEN_ADDRESS, '0x01ffc9a7', false);
      getSupportsInterface(DAO_TOKEN_ADDRESS, '80ac58cd', false);
      getSupportsInterface(DAO_TOKEN_ADDRESS, '00000000', false);
    });

    describe('ERC20 transfer action', () => {
      test('creates entities with correct values', () => {
        let transferToken = BigInt.fromU32(10);
        let tupleArray: Array<ethereum.Value> = [
          ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
          ethereum.Value.fromUnsignedBigInt(transferToken)
        ];

        let event = createExecutedEvent(
          [tupleArray],
          [ERC20_transfer],
          false,
          [],
          '0'
        );

        handleExecuted(event);

        let proposalId = event.params.actor
          .toHexString()
          .concat('_')
          .concat(event.params.callId.toHexString())
          .concat('_')
          .concat(event.transaction.hash.toHexString())
          .concat('_')
          .concat(event.transactionLogIndex.toHexString());

        let txHash = event.transaction.hash;
        let logIndex = event.transactionLogIndex;
        let timestamp = event.block.timestamp;

        let transferId = getTransferId(txHash, logIndex, 0);

        // check ERC20Contract entity
        eq('ERC20Contract', tokenId, 'id', tokenId);
        eq('ERC20Contract', tokenId, 'name', 'name');
        eq('ERC20Contract', tokenId, 'symbol', 'symbol');
        assert.entityCount('ERC20Contract', 1);

        // check ERC20Balance entity
        eq('ERC20Balance', balanceId, 'id', balanceId);
        eq('ERC20Balance', balanceId, 'token', tokenId);
        eq('ERC20Balance', balanceId, 'dao', daoId);
        eq('ERC20Balance', balanceId, 'balance', ERC20_AMOUNT_HALF);
        eq('ERC20Balance', balanceId, 'lastUpdated', timestamp.toString());
        assert.entityCount('ERC20Balance', 1);

        // Check ERC20Transfer
        eq('ERC20Transfer', transferId, 'id', transferId);
        eq('ERC20Transfer', transferId, 'dao', daoId);
        eq('ERC20Transfer', transferId, 'amount', transferToken.toString());
        eq('ERC20Transfer', transferId, 'from', DAO_ADDRESS);
        eq('ERC20Transfer', transferId, 'to', ADDRESS_THREE);
        eq('ERC20Transfer', transferId, 'proposal', proposalId);
        eq('ERC20Transfer', transferId, 'type', 'Withdraw');
        eq('ERC20Transfer', transferId, 'txHash', txHash.toHexString());
        eq('ERC20Transfer', transferId, 'createdAt', timestamp.toString());
        assert.entityCount('ERC20Transfer', 1);
      });

      test('correctly handles multiple events and updates balance', () => {
        let tupleArray: Array<ethereum.Value> = [
          ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromU32(10))
        ];

        let event = createExecutedEvent(
          [tupleArray],
          [ERC20_transfer],
          false,
          [],
          '0'
        );

        handleExecuted(event);

        // After 1st event
        assert.entityCount('ERC20Contract', 1);
        assert.entityCount('ERC20Transfer', 1);
        assert.entityCount('ERC20Balance', 1);
        eq('ERC20Balance', balanceId, 'balance', ERC20_AMOUNT_HALF);

        // Mock balance of with different amount
        getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, ERC20_AMOUNT_FULL);

        // Change log index so it will enforce to generate new transferId
        // to make sure we can aserst ERC20Transfer to be 2.
        event.transactionLogIndex = BigInt.fromI32(2);
        handleExecuted(event);

        // After 2nd event
        assert.entityCount('ERC20Contract', 1);
        assert.entityCount('ERC20Transfer', 2);
        assert.entityCount('ERC20Balance', 1);
        eq('ERC20Balance', balanceId, 'balance', ERC20_AMOUNT_FULL);

        // Mock balance to get it back to the same before running this test
        getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, ERC20_AMOUNT_HALF);
      });
    });

    describe('ERC20(transferFrom) action', () => {
      test('creates entities with correct values', () => {
        let transferToken = BigInt.fromU32(10);
        let tupleArray: Array<ethereum.Value> = [
          ethereum.Value.fromAddress(Address.fromString(DAO_ADDRESS)),
          ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
          ethereum.Value.fromUnsignedBigInt(transferToken)
        ];

        let event = createExecutedEvent(
          [tupleArray],
          [ERC20_transferFrom],
          false,
          [],
          '0'
        );

        handleExecuted(event);

        let proposalId = event.params.actor
          .toHexString()
          .concat('_')
          .concat(event.params.callId.toHexString())
          .concat('_')
          .concat(event.transaction.hash.toHexString())
          .concat('_')
          .concat(event.transactionLogIndex.toHexString());

        let txHash = event.transaction.hash;
        let logIndex = event.transactionLogIndex;
        let timestamp = event.block.timestamp;

        let transferId = getTransferId(txHash, logIndex, 0);

        // check ERC20Contract entity
        eq('ERC20Contract', tokenId, 'id', tokenId);
        eq('ERC20Contract', tokenId, 'name', 'name');
        eq('ERC20Contract', tokenId, 'symbol', 'symbol');
        assert.entityCount('ERC20Contract', 1);

        // check ERC20Balance entity
        eq('ERC20Balance', balanceId, 'id', balanceId);
        eq('ERC20Balance', balanceId, 'token', tokenId);
        eq('ERC20Balance', balanceId, 'dao', daoId);
        eq('ERC20Balance', balanceId, 'balance', ERC20_AMOUNT_HALF);
        eq('ERC20Balance', balanceId, 'lastUpdated', timestamp.toString());
        assert.entityCount('ERC20Balance', 1);

        // Check ERC20Transfer
        eq('ERC20Transfer', transferId, 'id', transferId);
        eq('ERC20Transfer', transferId, 'dao', daoId);
        eq('ERC20Transfer', transferId, 'amount', transferToken.toString());
        eq('ERC20Transfer', transferId, 'from', DAO_ADDRESS);
        eq('ERC20Transfer', transferId, 'to', ADDRESS_THREE);
        eq('ERC20Transfer', transferId, 'proposal', proposalId);
        eq('ERC20Transfer', transferId, 'type', 'Withdraw');
        eq('ERC20Transfer', transferId, 'txHash', txHash.toHexString());
        eq('ERC20Transfer', transferId, 'createdAt', timestamp.toString());
        assert.entityCount('ERC20Transfer', 1);
      });

      test('correctly handles multiple events and update balance', () => {
        let tupleArray: Array<ethereum.Value> = [
          ethereum.Value.fromAddress(Address.fromString(DAO_ADDRESS)),
          ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromU32(10))
        ];

        let event = createExecutedEvent(
          [tupleArray],
          [ERC20_transferFrom],
          false,
          [],
          '0'
        );

        handleExecuted(event);

        assert.entityCount('ERC20Contract', 1);
        assert.entityCount('ERC20Balance', 1);
        assert.entityCount('ERC20Transfer', 1);
        eq('ERC20Balance', balanceId, 'balance', ERC20_AMOUNT_HALF);

        // Mock balance of with different amount
        getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, ERC20_AMOUNT_FULL);

        // Change log index so it will enforce to generate new transferId
        // to make sure we can aserst ERC20Transfer to be 2.
        event.transactionLogIndex = BigInt.fromI32(2);
        handleExecuted(event);

        assert.entityCount('ERC20Contract', 1);
        assert.entityCount('ERC20Balance', 1);
        assert.entityCount('ERC20Transfer', 2);
        eq('ERC20Balance', balanceId, 'balance', ERC20_AMOUNT_FULL);

        // Mock balance to get it back to the same before running this test
        getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, ERC20_AMOUNT_HALF);
      });
    });
  });

  describe('ERC721 action', () => {
    beforeAll(() => {
      createTokenCalls(DAO_TOKEN_ADDRESS, 'name', 'symbol', null, null);

      getSupportsInterface(DAO_TOKEN_ADDRESS, '0x01ffc9a7', true);
      getSupportsInterface(DAO_TOKEN_ADDRESS, '80ac58cd', true);
      getSupportsInterface(DAO_TOKEN_ADDRESS, '00000000', false);
    });

    beforeEach(() => {
      let entity = new ERC721Balance(balanceId);
      entity.dao = daoId;
      entity.tokenIds = [
        BigInt.fromI32(4),
        BigInt.fromI32(8),
        BigInt.fromI32(12)
      ];
      entity.lastUpdated = BigInt.fromI32(2);
      entity.token = tokenId;
      entity.save();
    });

    describe('ERC721 transferFrom', () => {
      test('create entities with correct values', () => {
        let transferToKen = BigInt.fromU32(8);

        let tupleArray: Array<ethereum.Value> = [
          ethereum.Value.fromAddress(Address.fromString(DAO_ADDRESS)),
          ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
          ethereum.Value.fromUnsignedBigInt(transferToKen)
        ];

        let event = createExecutedEvent(
          [tupleArray],
          [ERC721_transferFrom],
          false,
          [],
          '0'
        );

        let txHash = event.transaction.hash;
        let logIndex = event.transactionLogIndex;
        let timestamp = event.block.timestamp;

        let transferId = getTransferId(txHash, logIndex, 0);

        handleExecuted(event);

        let proposalId = event.params.actor
          .toHexString()
          .concat('_')
          .concat(event.params.callId.toHexString())
          .concat('_')
          .concat(event.transaction.hash.toHexString())
          .concat('_')
          .concat(event.transactionLogIndex.toHexString());

        // check ERC721Contract entity
        eq('ERC721Contract', tokenId, 'id', tokenId);
        eq('ERC721Contract', tokenId, 'name', 'name');
        eq('ERC721Contract', tokenId, 'symbol', 'symbol');
        assert.entityCount('ERC721Contract', 1);

        // check ERC721Balance entity
        eq('ERC721Balance', balanceId, 'id', balanceId);
        eq('ERC721Balance', balanceId, 'token', tokenId);
        eq('ERC721Balance', balanceId, 'dao', daoId);
        eq('ERC721Balance', balanceId, 'tokenIds', '[4, 12]');
        eq('ERC721Balance', balanceId, 'lastUpdated', timestamp.toString());
        assert.entityCount('ERC721Balance', 1);

        // Check ERC721Transfer
        eq('ERC721Transfer', transferId, 'id', transferId);
        eq('ERC721Transfer', transferId, 'dao', daoId);
        eq('ERC721Transfer', transferId, 'tokenId', transferToKen.toString());
        eq('ERC721Transfer', transferId, 'from', DAO_ADDRESS);
        eq('ERC721Transfer', transferId, 'to', ADDRESS_THREE);
        eq('ERC721Transfer', transferId, 'proposal', proposalId);
        eq('ERC721Transfer', transferId, 'type', 'Withdraw');
        eq('ERC721Transfer', transferId, 'txHash', txHash.toHexString());
        eq('ERC721Transfer', transferId, 'createdAt', timestamp.toString());
        assert.entityCount('ERC721Transfer', 1);
      });

      test('correctly handles multiple events and updates balance', () => {
        let from = ethereum.Value.fromAddress(Address.fromString(DAO_ADDRESS));
        let to = ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE));
        let transferToken1 = ethereum.Value.fromUnsignedBigInt(
          BigInt.fromU32(8)
        );
        let transferToken2 = ethereum.Value.fromUnsignedBigInt(
          BigInt.fromU32(12)
        );

        let tuple1: Array<ethereum.Value> = [from, to, transferToken1];
        let tuple2: Array<ethereum.Value> = [from, to, transferToken2];

        let event = createExecutedEvent(
          [tuple1, tuple2],
          [ERC721_transferFrom, ERC721_transferFrom],
          false,
          [],
          '0'
        );

        handleExecuted(event);

        assert.entityCount('ERC721Contract', 1);
        assert.entityCount('ERC721Balance', 1);
        assert.entityCount('ERC721Transfer', 2);
        eq('ERC721Balance', balanceId, 'tokenIds', '[4]');
      });
    });

    describe('ERC721 safeTransferFrom with data', () => {
      test('create entities with correct values', () => {
        let transferToKen = BigInt.fromU32(8);

        let tupleArray: Array<ethereum.Value> = [
          ethereum.Value.fromAddress(Address.fromString(DAO_ADDRESS)),
          ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
          ethereum.Value.fromUnsignedBigInt(transferToKen),
          ethereum.Value.fromBytes(Bytes.fromHexString('0x'))
        ];

        let event = createExecutedEvent(
          [tupleArray],
          [ERC721_safeTransferFromWithData],
          true,
          [],
          '0'
        );

        let txHash = event.transaction.hash;
        let logIndex = event.transactionLogIndex;
        let timestamp = event.block.timestamp;

        let transferId = getTransferId(txHash, logIndex, 0);

        handleExecuted(event);

        let proposalId = event.params.actor
          .toHexString()
          .concat('_')
          .concat(event.params.callId.toHexString())
          .concat('_')
          .concat(event.transaction.hash.toHexString())
          .concat('_')
          .concat(event.transactionLogIndex.toHexString());

        // check ERC721Contract entity
        eq('ERC721Contract', tokenId, 'id', tokenId);
        eq('ERC721Contract', tokenId, 'name', 'name');
        eq('ERC721Contract', tokenId, 'symbol', 'symbol');
        assert.entityCount('ERC721Contract', 1);

        // check ERC721Balance entity
        eq('ERC721Balance', balanceId, 'id', balanceId);
        eq('ERC721Balance', balanceId, 'token', tokenId);
        eq('ERC721Balance', balanceId, 'dao', daoId);
        eq('ERC721Balance', balanceId, 'tokenIds', '[4, 12]');
        eq('ERC721Balance', balanceId, 'lastUpdated', timestamp.toString());
        assert.entityCount('ERC721Balance', 1);

        // Check ERC721Transfer
        eq('ERC721Transfer', transferId, 'id', transferId);
        eq('ERC721Transfer', transferId, 'dao', daoId);
        eq('ERC721Transfer', transferId, 'tokenId', transferToKen.toString());
        eq('ERC721Transfer', transferId, 'from', DAO_ADDRESS);
        eq('ERC721Transfer', transferId, 'to', ADDRESS_THREE);
        eq('ERC721Transfer', transferId, 'proposal', proposalId);
        eq('ERC721Transfer', transferId, 'type', 'Withdraw');
        eq('ERC721Transfer', transferId, 'txHash', txHash.toHexString());
        eq('ERC721Transfer', transferId, 'createdAt', timestamp.toString());
        assert.entityCount('ERC721Transfer', 1);
      });

      test('correctly handles multiple events and updates balance', () => {
        let from = ethereum.Value.fromAddress(Address.fromString(DAO_ADDRESS));
        let to = ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE));
        let data = ethereum.Value.fromBytes(Bytes.fromHexString('0x'));

        let transferToken1 = ethereum.Value.fromUnsignedBigInt(
          BigInt.fromU32(8)
        );
        let transferToken2 = ethereum.Value.fromUnsignedBigInt(
          BigInt.fromU32(12)
        );

        let tuple1: Array<ethereum.Value> = [from, to, transferToken1, data];
        let tuple2: Array<ethereum.Value> = [from, to, transferToken2, data];

        let event = createExecutedEvent(
          [tuple1, tuple2],
          [ERC721_safeTransferFromWithData, ERC721_safeTransferFromWithData],
          true,
          [],
          '0'
        );

        handleExecuted(event);

        assert.entityCount('ERC721Contract', 1);
        assert.entityCount('ERC721Balance', 1);
        assert.entityCount('ERC721Transfer', 2);
        eq('ERC721Balance', balanceId, 'tokenIds', '[4]');
      });
    });
  });
});

test('Run dao (handleTrustedForwarderSet) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(DAO_ADDRESS).toHexString();
  createDaoEntityState(entityID, ADDRESS_ONE, DAO_TOKEN_ADDRESS);

  let trustedForwarder = ADDRESS_ONE;

  let newEvent = createTrustedForwarderSetEvent(trustedForwarder, DAO_ADDRESS);
  // handle event
  handleTrustedForwarderSet(newEvent);

  // checks
  assert.fieldEquals('Dao', entityID, 'id', entityID);
  assert.fieldEquals(
    'Dao',
    entityID,
    'trustedForwarder',
    Address.fromString(ADDRESS_ONE).toHexString()
  );

  clearStore();
});

test('Run dao (handleSignatureValidatorSet) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(DAO_ADDRESS).toHexString();
  createDaoEntityState(entityID, ADDRESS_ONE, DAO_TOKEN_ADDRESS);

  let signatureValidator = ADDRESS_ONE;

  let newEvent = createSignatureValidatorSetEvent(
    signatureValidator,
    DAO_ADDRESS
  );
  // handle event
  handleSignatureValidatorSet(newEvent);

  // checks
  assert.fieldEquals('Dao', entityID, 'id', entityID);
  assert.fieldEquals(
    'Dao',
    entityID,
    'signatureValidator',
    Address.fromString(ADDRESS_ONE).toHexString()
  );

  clearStore();
});

test('Run dao (handleStandardCallbackRegistered) mappings with mock event', () => {
  // create state
  let daoAddress = Address.fromString(DAO_ADDRESS).toHexString();
  createDaoEntityState(daoAddress, ADDRESS_ONE, DAO_TOKEN_ADDRESS);

  let newEvent = createStandardCallbackRegisteredEvent(
    '0xaaaaaaaa',
    '0xaaaaaaab',
    '0xaaaaaaac',
    DAO_ADDRESS
  );
  // handle event
  handleStandardCallbackRegistered(newEvent);

  newEvent = createStandardCallbackRegisteredEvent(
    '0xbbaaaaaa',
    '0xbbaaaaab',
    '0xbbaaaaac',
    DAO_ADDRESS
  );

  // handle event
  handleStandardCallbackRegistered(newEvent);

  // checks
  let entityID = `${daoAddress}_0xaaaaaaaa`;
  assert.fieldEquals('StandardCallback', entityID, 'id', entityID);
  assert.fieldEquals('StandardCallback', entityID, 'interfaceId', '0xaaaaaaaa');
  assert.fieldEquals(
    'StandardCallback',
    entityID,
    'callbackSelector',
    '0xaaaaaaab'
  );
  assert.fieldEquals('StandardCallback', entityID, 'magicNumber', '0xaaaaaaac');

  entityID = `${daoAddress}_0xbbaaaaaa`;
  assert.fieldEquals('StandardCallback', entityID, 'id', entityID);
  assert.fieldEquals('StandardCallback', entityID, 'interfaceId', '0xbbaaaaaa');
  assert.fieldEquals(
    'StandardCallback',
    entityID,
    'callbackSelector',
    '0xbbaaaaab'
  );
  assert.fieldEquals('StandardCallback', entityID, 'magicNumber', '0xbbaaaaac');

  clearStore();
});
