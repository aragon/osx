import {ERC721Balance} from '../../generated/schema';
import {Executed} from '../../generated/templates/DaoTemplateV1_3_0/DAO';
import {handleExecuted} from '../../src/dao/dao_v1_3_0';
import {
  generateActionEntityId,
  generateDeterministicActionId,
  generateDeterministicActionBatchId,
  generateActionBatchEntityId,
} from '../../src/dao/ids';
import {
  generateERC1155TransferEntityId,
  generateTokenEntityId,
} from '../../src/utils/ids';
import {
  ERC20_transfer,
  ERC20_transferFrom,
  ERC721_transferFrom,
  ERC721_safeTransferFromWithData,
  ERC1155_safeTransferFrom,
  ERC1155_safeBatchTransferFrom,
  ERC1155_INTERFACE_ID,
  ERC165_INTERFACE_ID,
} from '../../src/utils/tokens/common';
import {
  DAO_ADDRESS,
  DAO_TOKEN_ADDRESS,
  ERC20_AMOUNT_HALF,
  ADDRESS_THREE,
  ERC20_AMOUNT_FULL,
  CONTRACT_ADDRESS,
  ZERO_BYTES32,
  TOKEN_NAME,
  TOKEN_SYMBOL,
  ERC20_TOTAL_SUPPLY,
  ERC20_DECIMALS,
  ADDRESS_ONE,
  ADDRESS_TWO,
} from '../constants';
import {
  ExtendedERC1155Balance,
  ExtendedERC1155Contract,
  ExtendedERC1155TokenIdBalance,
  ExtendedERC1155Transfer,
} from '../helpers/extended-schema';
import {
  createNewExecutedEvent,
  encodeWithFunctionSelector,
  getBalanceOf,
  getSupportsInterface,
} from './utils';
import {
  generateBalanceEntityId,
  generateDaoEntityId,
  generateTokenIdBalanceEntityId,
  generateTransferEntityId,
  createDummyAction,
  createERC20TokenCalls,
  createERC1155TokenCalls,
} from '@aragon/osx-commons-subgraph';
import {ethereum, Bytes, Address, BigInt} from '@graphprotocol/graph-ts';
import {
  describe,
  test,
  beforeEach,
  afterEach,
  clearStore,
  assert,
  beforeAll,
} from 'matchstick-as';

const eq = assert.fieldEquals;
let daoAddress = Address.fromString(DAO_ADDRESS);
let tokenAddress = Address.fromString(DAO_TOKEN_ADDRESS);
let daoEntityId = generateDaoEntityId(daoAddress);
let tokenEntityId = generateTokenEntityId(tokenAddress);
let balanceEntityId = generateBalanceEntityId(daoAddress, tokenAddress);

describe('handleExecuted', () => {
  afterEach(() => {
    clearStore();
  });

  test('successfuly creates action and actionBatch', () => {
    let tuple: Array<ethereum.Value> = [ethereum.Value.fromString('')];
    let selector = '0x11111111';

    let execResults = [
      Bytes.fromHexString('0x11'),
      Bytes.fromHexString('0x22'),
    ];

    let allowFailureMap = '2';
    let failureMap = '2';

    let event = createExecutedEvent(
      [tuple, tuple],
      [selector, selector],
      allowFailureMap,
      false,
      execResults,
      failureMap
    );

    handleExecuted(event);

    const deterministicID = generateDeterministicActionBatchId(
      event.params.actor,
      event.address,
      event.params.callId
    );

    let actionBatchEntityId = generateActionBatchEntityId(
      event.params.actor,
      event.address,
      event.params.callId,
      event.transaction.hash,
      event.transactionLogIndex
    );

    assert.entityCount('ActionBatch', 1);
    assert.entityCount('Action', 2);

    eq('ActionBatch', actionBatchEntityId, 'id', actionBatchEntityId);
    eq('ActionBatch', actionBatchEntityId, 'failureMap', failureMap);
    eq('ActionBatch', actionBatchEntityId, 'allowFailureMap', allowFailureMap);

    assert.fieldEquals(
      'ActionBatch',
      actionBatchEntityId,
      'deterministicId',
      deterministicID
    );

    for (let i = 0; i < event.params.actions.length; i++) {
      const deterministicActionID = generateDeterministicActionId(
        event.params.actor,
        event.address,
        event.params.callId,
        i
      );

      let actionEntityId = generateActionEntityId(
        event.params.actor,
        event.address,
        event.params.callId,
        i,
        event.transaction.hash,
        event.transactionLogIndex
      );

      eq('Action', actionEntityId, 'id', actionEntityId);
      eq('Action', actionEntityId, 'execResult', execResults[i].toHexString());
      eq('Action', actionEntityId, 'dao', DAO_ADDRESS);
      eq('Action', actionEntityId, 'actionBatch', actionBatchEntityId);
      eq('Action', actionEntityId, 'deterministicId', deterministicActionID);
      eq(
        'Action',
        actionEntityId,
        'data',
        encodeWithFunctionSelector(tuple, selector).toHexString()
      );
    }
  });

  test('Duplicate deterministic ids will point to different proposals and actions', () => {
    let tuple: Array<ethereum.Value> = [ethereum.Value.fromString('')];
    let selector = '0x11111111';

    let execResults = [
      Bytes.fromHexString('0x11'),
      Bytes.fromHexString('0x22'),
    ];

    let allowFailureMap = '2';
    let failureMap = '2';

    // event 0 has 2 actions
    let event0 = createExecutedEvent(
      [tuple, tuple],
      [selector, selector],
      allowFailureMap,
      false,
      execResults,
      failureMap
    );

    // event1 has 1 action
    let event1 = createExecutedEvent(
      [tuple],
      [selector],
      allowFailureMap,
      false,
      execResults,
      failureMap
    );

    // increment the log index to make sure the transaction actions are different
    // for the two events even if they are in the same block
    event1.logIndex = event1.logIndex.plus(BigInt.fromI32(1));
    event1.transactionLogIndex = event1.logIndex;

    assert.entityCount('Action', 0);
    assert.entityCount('ActionBatch', 0);

    handleExecuted(event0);
    handleExecuted(event1);

    // The action and proposal count should be the same.
    assert.entityCount('ActionBatch', 2);
    assert.entityCount('Action', 3);
  });

  describe('ERC20 action', () => {
    beforeAll(() => {
      createERC20TokenCalls(
        DAO_TOKEN_ADDRESS,
        ERC20_TOTAL_SUPPLY,
        TOKEN_NAME,
        TOKEN_SYMBOL,
        ERC20_DECIMALS
      );
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
      getSupportsInterface(DAO_TOKEN_ADDRESS, 'ffffffff', false);
    });

    describe('ERC20 transfer action', () => {
      beforeAll(() => {
        createERC20TokenCalls(
          DAO_TOKEN_ADDRESS,
          ERC20_TOTAL_SUPPLY,
          TOKEN_NAME,
          TOKEN_SYMBOL
        );

        getSupportsInterface(DAO_TOKEN_ADDRESS, ERC165_INTERFACE_ID, true);
        getSupportsInterface(DAO_TOKEN_ADDRESS, 'ffffffff', false);
      });

      test('creates entities with correct values', () => {
        let transferToken = BigInt.fromU32(10);
        let tupleArray: Array<ethereum.Value> = [
          ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
          ethereum.Value.fromUnsignedBigInt(transferToken),
        ];

        let event = createExecutedEvent(
          [tupleArray],
          [ERC20_transfer],
          '0',
          false,
          [],
          '0'
        );

        handleExecuted(event);

        let actionBatchEntityId = generateActionBatchEntityId(
          event.params.actor,
          event.address,
          event.params.callId,
          event.transaction.hash,
          event.transactionLogIndex
        );
        let txHash = event.transaction.hash;
        let logIndex = event.transactionLogIndex;
        let timestamp = event.block.timestamp;

        let transferId = generateTransferEntityId(txHash, logIndex, 0);

        // check ERC20Contract entity
        eq('ERC20Contract', tokenEntityId, 'id', tokenEntityId);
        eq('ERC20Contract', tokenEntityId, 'name', TOKEN_NAME);
        eq('ERC20Contract', tokenEntityId, 'symbol', TOKEN_SYMBOL);
        assert.entityCount('ERC20Contract', 1);

        // check ERC20Balance entity
        eq('ERC20Balance', balanceEntityId, 'id', balanceEntityId);
        eq('ERC20Balance', balanceEntityId, 'token', tokenEntityId);
        eq('ERC20Balance', balanceEntityId, 'dao', daoEntityId);
        eq('ERC20Balance', balanceEntityId, 'balance', ERC20_AMOUNT_HALF);
        eq(
          'ERC20Balance',
          balanceEntityId,
          'lastUpdated',
          timestamp.toString()
        );
        assert.entityCount('ERC20Balance', 1);

        // Check ERC20Transfer
        eq('ERC20Transfer', transferId, 'id', transferId);
        eq('ERC20Transfer', transferId, 'dao', daoEntityId);
        eq('ERC20Transfer', transferId, 'amount', transferToken.toString());
        eq('ERC20Transfer', transferId, 'from', DAO_ADDRESS);
        eq('ERC20Transfer', transferId, 'to', ADDRESS_THREE);
        eq('ERC20Transfer', transferId, 'actionBatch', actionBatchEntityId);
        eq('ERC20Transfer', transferId, 'type', 'Withdraw');
        eq('ERC20Transfer', transferId, 'txHash', txHash.toHexString());
        eq('ERC20Transfer', transferId, 'createdAt', timestamp.toString());
        assert.entityCount('ERC20Transfer', 1);
      });

      test('correctly handles multiple events and updates balance', () => {
        let tupleArray: Array<ethereum.Value> = [
          ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromU32(10)),
        ];

        let event = createExecutedEvent(
          [tupleArray],
          [ERC20_transfer],
          '0',
          false,
          [],
          '0'
        );

        handleExecuted(event);

        // After 1st event
        assert.entityCount('ERC20Contract', 1);
        assert.entityCount('ERC20Transfer', 1);
        assert.entityCount('ERC20Balance', 1);
        eq('ERC20Balance', balanceEntityId, 'balance', ERC20_AMOUNT_HALF);

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
        eq('ERC20Balance', balanceEntityId, 'balance', ERC20_AMOUNT_FULL);

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
          ethereum.Value.fromUnsignedBigInt(transferToken),
        ];

        let event = createExecutedEvent(
          [tupleArray],
          [ERC20_transferFrom],
          '0',
          false,
          [],
          '0'
        );

        handleExecuted(event);

        let actionBatchEntityId = generateActionBatchEntityId(
          event.params.actor,
          event.address,
          event.params.callId,
          event.transaction.hash,
          event.transactionLogIndex
        );
        let txHash = event.transaction.hash;
        let logIndex = event.transactionLogIndex;
        let timestamp = event.block.timestamp;

        let transferId = generateTransferEntityId(txHash, logIndex, 0);

        // check ERC20Contract entity
        eq('ERC20Contract', tokenEntityId, 'id', tokenEntityId);
        eq('ERC20Contract', tokenEntityId, 'name', TOKEN_NAME);
        eq('ERC20Contract', tokenEntityId, 'symbol', TOKEN_SYMBOL);
        assert.entityCount('ERC20Contract', 1);

        // check ERC20Balance entity
        eq('ERC20Balance', balanceEntityId, 'id', balanceEntityId);
        eq('ERC20Balance', balanceEntityId, 'token', tokenEntityId);
        eq('ERC20Balance', balanceEntityId, 'dao', daoEntityId);
        eq('ERC20Balance', balanceEntityId, 'balance', ERC20_AMOUNT_HALF);
        eq(
          'ERC20Balance',
          balanceEntityId,
          'lastUpdated',
          timestamp.toString()
        );
        assert.entityCount('ERC20Balance', 1);

        // Check ERC20Transfer
        eq('ERC20Transfer', transferId, 'id', transferId);
        eq('ERC20Transfer', transferId, 'dao', daoEntityId);
        eq('ERC20Transfer', transferId, 'amount', transferToken.toString());
        eq('ERC20Transfer', transferId, 'from', DAO_ADDRESS);
        eq('ERC20Transfer', transferId, 'to', ADDRESS_THREE);
        eq('ERC20Transfer', transferId, 'actionBatch', actionBatchEntityId);
        eq('ERC20Transfer', transferId, 'type', 'Withdraw');
        eq('ERC20Transfer', transferId, 'txHash', txHash.toHexString());
        eq('ERC20Transfer', transferId, 'createdAt', timestamp.toString());
        assert.entityCount('ERC20Transfer', 1);
      });

      test('correctly handles multiple events and update balance', () => {
        let tupleArray: Array<ethereum.Value> = [
          ethereum.Value.fromAddress(Address.fromString(DAO_ADDRESS)),
          ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
          ethereum.Value.fromUnsignedBigInt(BigInt.fromU32(10)),
        ];

        let event = createExecutedEvent(
          [tupleArray],
          [ERC20_transferFrom],
          '0',
          false,
          [],
          '0'
        );

        handleExecuted(event);

        assert.entityCount('ERC20Contract', 1);
        assert.entityCount('ERC20Balance', 1);
        assert.entityCount('ERC20Transfer', 1);
        eq('ERC20Balance', balanceEntityId, 'balance', ERC20_AMOUNT_HALF);

        // Mock balance of with different amount
        getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, ERC20_AMOUNT_FULL);

        // Change log index so it will enforce to generate new transferId
        // to make sure we can aserst ERC20Transfer to be 2.
        event.transactionLogIndex = BigInt.fromI32(2);
        handleExecuted(event);

        assert.entityCount('ERC20Contract', 1);
        assert.entityCount('ERC20Balance', 1);
        assert.entityCount('ERC20Transfer', 2);
        eq('ERC20Balance', balanceEntityId, 'balance', ERC20_AMOUNT_FULL);

        // Mock balance to get it back to the same before running this test
        getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, ERC20_AMOUNT_HALF);
      });
    });
  });

  describe('ERC721 action', () => {
    beforeAll(() => {
      createERC20TokenCalls(
        DAO_TOKEN_ADDRESS,
        ERC20_TOTAL_SUPPLY,
        TOKEN_NAME,
        TOKEN_SYMBOL
      );

      getSupportsInterface(DAO_TOKEN_ADDRESS, '0x01ffc9a7', true);
      getSupportsInterface(DAO_TOKEN_ADDRESS, '80ac58cd', true);
      getSupportsInterface(DAO_TOKEN_ADDRESS, 'ffffffff', false);
    });

    beforeEach(() => {
      let entity = new ERC721Balance(balanceEntityId);
      entity.dao = daoEntityId;
      entity.tokenIds = [
        BigInt.fromI32(4),
        BigInt.fromI32(8),
        BigInt.fromI32(12),
      ];
      entity.lastUpdated = BigInt.fromI32(2);
      entity.token = tokenEntityId;
      entity.save();
    });

    describe('ERC721 transferFrom', () => {
      test('create entities with correct values', () => {
        let transferToKen = BigInt.fromU32(8);

        let tupleArray: Array<ethereum.Value> = [
          ethereum.Value.fromAddress(Address.fromString(DAO_ADDRESS)),
          ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
          ethereum.Value.fromUnsignedBigInt(transferToKen),
        ];

        let event = createExecutedEvent(
          [tupleArray],
          [ERC721_transferFrom],
          '0',
          false,
          [],
          '0'
        );

        let txHash = event.transaction.hash;
        let logIndex = event.transactionLogIndex;
        let timestamp = event.block.timestamp;

        let transferId = generateTransferEntityId(txHash, logIndex, 0);

        handleExecuted(event);

        let actionBatchEntityId = generateActionBatchEntityId(
          event.params.actor,
          event.address,
          event.params.callId,
          event.transaction.hash,
          event.transactionLogIndex
        );

        // check ERC721Contract entity
        eq('ERC721Contract', tokenEntityId, 'id', tokenEntityId);
        eq('ERC721Contract', tokenEntityId, 'name', TOKEN_NAME);
        eq('ERC721Contract', tokenEntityId, 'symbol', TOKEN_SYMBOL);
        assert.entityCount('ERC721Contract', 1);

        // check ERC721Balance entity
        eq('ERC721Balance', balanceEntityId, 'id', balanceEntityId);
        eq('ERC721Balance', balanceEntityId, 'token', tokenEntityId);
        eq('ERC721Balance', balanceEntityId, 'dao', daoEntityId);
        eq('ERC721Balance', balanceEntityId, 'tokenIds', '[4, 12]');
        eq(
          'ERC721Balance',
          balanceEntityId,
          'lastUpdated',
          timestamp.toString()
        );
        assert.entityCount('ERC721Balance', 1);

        // Check ERC721Transfer
        eq('ERC721Transfer', transferId, 'id', transferId);
        eq('ERC721Transfer', transferId, 'dao', daoEntityId);
        eq('ERC721Transfer', transferId, 'tokenId', transferToKen.toString());
        eq('ERC721Transfer', transferId, 'from', DAO_ADDRESS);
        eq('ERC721Transfer', transferId, 'to', ADDRESS_THREE);
        eq('ERC721Transfer', transferId, 'actionBatch', actionBatchEntityId);
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
          '0',
          false,
          [],
          '0'
        );

        handleExecuted(event);

        assert.entityCount('ERC721Contract', 1);
        assert.entityCount('ERC721Balance', 1);
        assert.entityCount('ERC721Transfer', 2);
        eq('ERC721Balance', balanceEntityId, 'tokenIds', '[4]');
      });
    });

    describe('ERC721 safeTransferFrom with data', () => {
      test('create entities with correct values', () => {
        let transferToKen = BigInt.fromU32(8);

        let tupleArray: Array<ethereum.Value> = [
          ethereum.Value.fromAddress(Address.fromString(DAO_ADDRESS)),
          ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
          ethereum.Value.fromUnsignedBigInt(transferToKen),
          ethereum.Value.fromBytes(Bytes.fromHexString('0x')),
        ];

        let event = createExecutedEvent(
          [tupleArray],
          [ERC721_safeTransferFromWithData],
          '0',
          true,
          [],
          '0'
        );

        let txHash = event.transaction.hash;
        let logIndex = event.transactionLogIndex;
        let timestamp = event.block.timestamp;

        let transferId = generateTransferEntityId(txHash, logIndex, 0);

        handleExecuted(event);

        let actionBatchEntityId = generateActionBatchEntityId(
          event.params.actor,
          event.address,
          event.params.callId,
          event.transaction.hash,
          event.transactionLogIndex
        );
        // check ERC721Contract entity
        eq('ERC721Contract', tokenEntityId, 'id', tokenEntityId);
        eq('ERC721Contract', tokenEntityId, 'name', TOKEN_NAME);
        eq('ERC721Contract', tokenEntityId, 'symbol', TOKEN_SYMBOL);
        assert.entityCount('ERC721Contract', 1);

        // check ERC721Balance entity
        eq('ERC721Balance', balanceEntityId, 'id', balanceEntityId);
        eq('ERC721Balance', balanceEntityId, 'token', tokenEntityId);
        eq('ERC721Balance', balanceEntityId, 'dao', daoEntityId);
        eq('ERC721Balance', balanceEntityId, 'tokenIds', '[4, 12]');
        eq(
          'ERC721Balance',
          balanceEntityId,
          'lastUpdated',
          timestamp.toString()
        );
        assert.entityCount('ERC721Balance', 1);

        // Check ERC721Transfer
        eq('ERC721Transfer', transferId, 'id', transferId);
        eq('ERC721Transfer', transferId, 'dao', daoEntityId);
        eq('ERC721Transfer', transferId, 'tokenId', transferToKen.toString());
        eq('ERC721Transfer', transferId, 'from', DAO_ADDRESS);
        eq('ERC721Transfer', transferId, 'to', ADDRESS_THREE);
        eq('ERC721Transfer', transferId, 'actionBatch', actionBatchEntityId);
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
          '0',
          true,
          [],
          '0'
        );

        handleExecuted(event);

        assert.entityCount('ERC721Contract', 1);
        assert.entityCount('ERC721Balance', 1);
        assert.entityCount('ERC721Transfer', 2);
        eq('ERC721Balance', balanceEntityId, 'tokenIds', '[4]');
      });
    });
  });
  describe('ERC1155 action', () => {
    beforeAll(() => {
      createERC1155TokenCalls(
        DAO_TOKEN_ADDRESS,
        '0',
        'https://example.org/{id}.json'
      );
      createERC1155TokenCalls(
        DAO_TOKEN_ADDRESS,
        '1',
        'https://example.org/{id}.json'
      );
      createERC1155TokenCalls(
        DAO_TOKEN_ADDRESS,
        '2',
        'https://example.org/{id}.json'
      );
      getSupportsInterface(DAO_TOKEN_ADDRESS, ERC1155_INTERFACE_ID, true);
      getSupportsInterface(DAO_TOKEN_ADDRESS, 'ffffffff', false);
    });
    beforeEach(() => {
      clearStore();
    });

    describe('ERC1155 safeTransferFrom', () => {
      test('create entities with correct values', () => {
        let transferToken = BigInt.fromU32(0);
        let amount = BigInt.fromU32(10);

        let tupleArray: Array<ethereum.Value> = [
          ethereum.Value.fromAddress(Address.fromString(DAO_ADDRESS)), // from
          ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)), // to
          ethereum.Value.fromUnsignedBigInt(transferToken), // tokenId
          ethereum.Value.fromUnsignedBigInt(amount), // amount
          ethereum.Value.fromBytes(Bytes.fromHexString('0x')), // data
        ];
        let event = createExecutedEvent(
          [tupleArray],
          [ERC1155_safeTransferFrom],
          '0',
          true,
          [],
          '0'
        );
        handleExecuted(event);

        let timestamp = event.block.timestamp;

        // check ERC1155Contract entity
        assert.entityCount('ERC1155Contract', 1);
        let erc1155Contract = new ExtendedERC1155Contract().withDefaultValues();
        erc1155Contract.assertEntity();

        // check ERC1155Balance entity
        assert.entityCount('ERC1155Balance', 1);
        let erc1155Balance = new ExtendedERC1155Balance().withDefaultValues();
        erc1155Balance.lastUpdated = timestamp;
        erc1155Balance.assertEntity();

        // check ERC1155TokenIdBalance entity
        assert.entityCount('ERC1155TokenIdBalance', 1);
        let erc1155TokenIdBalance =
          new ExtendedERC1155TokenIdBalance().withDefaultValues();
        erc1155TokenIdBalance.amount = amount;
        erc1155TokenIdBalance.lastUpdated = timestamp;
        erc1155TokenIdBalance.assertEntity();

        // check ERC1155Transfer entity
        let txHash = event.transaction.hash;
        let logIndex = event.transactionLogIndex;
        let transferId = generateERC1155TransferEntityId(
          txHash,
          logIndex,
          0,
          0
        );
        let actionBatchEntityId = generateActionBatchEntityId(
          event.params.actor,
          event.address,
          event.params.callId,
          event.transaction.hash,
          event.transactionLogIndex
        );
        assert.entityCount('ERC1155Transfer', 1);
        let erc1155Transfer = new ExtendedERC1155Transfer().withDefaultValues();
        erc1155Transfer.id = transferId;
        erc1155Transfer.amount = amount;
        erc1155Transfer.from = Address.fromHexString(daoEntityId);
        erc1155Transfer.to = Address.fromHexString(ADDRESS_THREE);
        erc1155Transfer.actionBatch = actionBatchEntityId;
        erc1155Transfer.type = 'Withdraw';
        erc1155Transfer.txHash = txHash;
        erc1155Transfer.createdAt = timestamp;
        erc1155Transfer.assertEntity();
      });
      test('correctly handles multiple events and updates balance', () => {
        let amount = BigInt.fromU32(10);
        let transferTokens = [BigInt.fromU32(0), BigInt.fromU32(1)];
        let tuples: ethereum.Value[][] = [];
        for (let i = 0; i < transferTokens.length; i++) {
          tuples.push([
            ethereum.Value.fromAddress(Address.fromString(DAO_ADDRESS)),
            ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)),
            ethereum.Value.fromUnsignedBigInt(transferTokens[i]),
            ethereum.Value.fromUnsignedBigInt(amount),
            ethereum.Value.fromBytes(Bytes.fromHexString('0x')),
          ]);
        }

        let event = createExecutedEvent(
          tuples,
          [ERC1155_safeTransferFrom, ERC1155_safeTransferFrom],
          '0',
          true,
          [],
          '0'
        );
        handleExecuted(event);

        let erc1155TokenIdBalanceIdArray: string[] = [];
        for (let i = 0; i < transferTokens.length; i++) {
          erc1155TokenIdBalanceIdArray.push(
            generateTokenIdBalanceEntityId(
              daoAddress,
              tokenAddress,
              transferTokens[i]
            )
          );
        }

        assert.entityCount('ERC1155Contract', 1);
        assert.entityCount('ERC1155Transfer', 2);
        assert.entityCount('ERC1155Balance', 1);
        assert.entityCount('ERC1155TokenIdBalance', 2);
      });
    });
    describe('ERC1155 safeBatchTransferFrom', () => {
      test('create entities with correct values', () => {
        let tokenIds = [
          BigInt.fromI32(0),
          BigInt.fromI32(1),
          BigInt.fromI32(2),
        ];
        let amounts = [
          BigInt.fromI32(10),
          BigInt.fromI32(10),
          BigInt.fromI32(10),
        ];
        let tupleArray: Array<ethereum.Value> = [
          ethereum.Value.fromAddress(Address.fromString(DAO_ADDRESS)), // from
          ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)), // to
          ethereum.Value.fromUnsignedBigIntArray(tokenIds), // tokenIds
          ethereum.Value.fromUnsignedBigIntArray(amounts), // amounts
          ethereum.Value.fromBytes(Bytes.fromHexString('0x')), // data
        ];
        let event = createExecutedEvent(
          [tupleArray],
          [ERC1155_safeBatchTransferFrom],
          '0',
          true,
          [],
          '0'
        );
        handleExecuted(event);

        let timestamp = event.block.timestamp;
        let tokenIdBalanceIdArray: string[] = [];
        // iterate over tokenIds
        for (let i = 0; i < tokenIds.length; i++) {
          tokenIdBalanceIdArray.push(
            generateTokenIdBalanceEntityId(
              daoAddress,
              tokenAddress,
              tokenIds[i]
            )
          );
        }
        // check ERC1155Contract entity
        assert.entityCount('ERC1155Contract', 1);
        let erc1155Contract = new ExtendedERC1155Contract().withDefaultValues();
        erc1155Contract.assertEntity();
        // check ERC1155Balance entity
        assert.entityCount('ERC1155Balance', 1);
        let erc1155Balance = new ExtendedERC1155Balance().withDefaultValues();
        erc1155Balance.lastUpdated = timestamp;
        erc1155Balance.assertEntity();
        // check ERC1155TokenIdBalance entity
        assert.entityCount('ERC1155TokenIdBalance', 3);
        for (let i = 0; i < tokenIds.length; i++) {
          let erc1155TokenIdBalance =
            new ExtendedERC1155TokenIdBalance().withDefaultValues();
          erc1155TokenIdBalance.id = tokenIdBalanceIdArray[i];
          erc1155TokenIdBalance.tokenId = tokenIds[i];
          erc1155TokenIdBalance.amount = amounts[i];
          erc1155TokenIdBalance.lastUpdated = timestamp;
          erc1155TokenIdBalance.balance = balanceEntityId;
          erc1155TokenIdBalance.assertEntity();
        }
        // check ERC1155Transfer entity
        let txHash = event.transaction.hash;
        let logIndex = event.transactionLogIndex;
        let actionBatchEntityId = generateActionBatchEntityId(
          event.params.actor,
          event.address,
          event.params.callId,
          event.transaction.hash,
          event.transactionLogIndex
        );
        for (let i = 0; i < tokenIds.length; i++) {
          let erc1155Transfer =
            new ExtendedERC1155Transfer().withDefaultValues();
          erc1155Transfer.id = generateERC1155TransferEntityId(
            txHash,
            logIndex,
            0,
            i
          );
          // appeend index to transferId to make sure it is unique
          erc1155Transfer.amount = amounts[i];
          erc1155Transfer.from = Address.fromHexString(daoEntityId);
          erc1155Transfer.to = Address.fromHexString(ADDRESS_THREE);
          erc1155Transfer.tokenId = tokenIds[i];
          erc1155Transfer.actionBatch = actionBatchEntityId;
          erc1155Transfer.type = 'Withdraw';
          erc1155Transfer.txHash = txHash;
          erc1155Transfer.createdAt = timestamp;
          erc1155Transfer.assertEntity();
        }
      });
      test('correctly handles multiple events and updates balance', () => {
        let tokenIds = [
          [BigInt.fromI32(0), BigInt.fromI32(1), BigInt.fromI32(2)],
          [BigInt.fromI32(0), BigInt.fromI32(1), BigInt.fromI32(2)],
        ];
        let amounts = [
          [BigInt.fromI32(10), BigInt.fromI32(10), BigInt.fromI32(10)],
          [BigInt.fromI32(30), BigInt.fromI32(30), BigInt.fromI32(30)],
        ];
        let tuples: ethereum.Value[][] = [];
        for (let i = 0; i < tokenIds.length; i++) {
          tuples.push([
            ethereum.Value.fromAddress(Address.fromString(DAO_ADDRESS)), // from
            ethereum.Value.fromAddress(Address.fromString(ADDRESS_THREE)), // to
            ethereum.Value.fromUnsignedBigIntArray(tokenIds[i]), // tokenIds
            ethereum.Value.fromUnsignedBigIntArray(amounts[i]), // amounts
            ethereum.Value.fromBytes(Bytes.fromHexString('0x')), // data
          ]);
        }
        let event = createExecutedEvent(
          tuples,
          [ERC1155_safeBatchTransferFrom, ERC1155_safeBatchTransferFrom],
          '0',
          true,
          [],
          '0'
        );
        handleExecuted(event);
        let erc1155TokenIdBalanceIdArray: string[] = [];
        for (let i = 0; i < tokenIds[0].length; i++) {
          erc1155TokenIdBalanceIdArray.push(
            generateTokenIdBalanceEntityId(
              daoAddress,
              tokenAddress,
              tokenIds[0][i]
            )
          );
        }
        // check ERC ontract entity
        assert.entityCount('ERC1155Contract', 1);
        let erc1155Contract = new ExtendedERC1155Contract().withDefaultValues();
        erc1155Contract.assertEntity();
        // check ERC1155Balance entity
        assert.entityCount('ERC1155Transfer', 6);
        assert.entityCount('ERC1155Balance', 1);
        assert.entityCount('ERC1155TokenIdBalance', 3);
      });
    });
  });
});

describe('Testing ID generation', () => {
  test('Deterministic ID generation', () => {
    const caller = Address.fromString(ADDRESS_ONE);
    const daoAddress = Address.fromString(ADDRESS_TWO);
    const callId = '0xc0ffee';
    const index = 255;

    const actionId = generateDeterministicActionId(
      caller,
      daoAddress,
      Bytes.fromHexString(callId),
      index
    );

    assert.stringEquals(
      actionId,
      [
        caller.toHexString(),
        daoAddress.toHexString(),
        callId,
        index.toString(),
      ].join('_')
    );
  });

  test('ID generation with Tx data', () => {
    const caller = Address.fromString(ADDRESS_ONE);
    const daoAddress = Address.fromString(ADDRESS_TWO);
    const callId = ZERO_BYTES32;
    const index = 255;
    const txHash = Bytes.fromHexString('0x1234567890abcdef');
    const logIndex = BigInt.fromI32(12345);

    const actionId = generateActionEntityId(
      caller,
      daoAddress,
      Bytes.fromHexString(callId),
      index,
      txHash,
      logIndex
    );

    // Assemblyscript can only concat if all are strings
    // make sure your bytes are casted correctly
    assert.stringEquals(
      actionId,
      [
        caller.toHexString(),
        daoAddress.toHexString(),
        callId,
        index.toString(),
        txHash.toHexString(),
        logIndex.toString(),
      ].join('_')
    );
  });
});

// create Executed event with multiple actions
function createExecutedEvent(
  tuple: ethereum.Value[][],
  selectors: string[],
  allowFailureMap: string,
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

    let action = createDummyAction(
      DAO_TOKEN_ADDRESS,
      '0',
      functionData.toHexString()
    );

    actions.push(action as ethereum.Tuple);
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
    BigInt.fromString(allowFailureMap)
  );

  return event;
}
