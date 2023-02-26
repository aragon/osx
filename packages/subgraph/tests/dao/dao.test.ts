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
} from '../../src/dao/dao';
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
  createNewNativeTokenDepositedEvent,
  createNewDepositedEvent,
  getBalanceOf,
  createNewExecutedEvent,
  createCallbackReceivedEvent,
  createDaoEntityState,
  createTrustedForwarderSetEvent,
  createSignatureValidatorSetEvent,
  createStandardCallbackRegisteredEvent,
  getSupportsInterface
} from './utils';
import {
  ERC20_transfer,
  ERC20_transferFrom,
  ERC721_safeTransferFromWithData,
  ERC721_transferFrom,
  getTransferId,
  onERC721Received
} from '../../src/utils/tokens/common';
import {ERC721Balance} from '../../generated/schema';
import {Executed} from '../../generated/templates/DaoTemplate/DAO';

const eq = assert.fieldEquals;

let daoId = Address.fromString(DAO_ADDRESS).toHexString();
let tokenId = Address.fromString(DAO_TOKEN_ADDRESS).toHexString();
let balanceId = daoId.concat('_').concat(tokenId);

function encodeWithFunctionSelector(
  tuple: Array<ethereum.Value>,
  funcSelector: string,
  isDynamic: boolean = false
): Bytes {
  // ethereum.decode inside subgraph doesn't append 0x00...20 while the actual event
  // thrown from the real network includes this appended offset. Due to this, mappings contain
  // extra logic(appending the offset to the actual calldata in order to do ethereum.decode).
  // Due to this, from the tests, we need to append it as well. Note that this rule only applies
  // when the emitted event contains at least 1 dynamic type.
  let index = isDynamic == true ? 66 : 2;

  let calldata = ethereum
    .encode(ethereum.Value.fromTuple(changetype<ethereum.Tuple>(tuple)))!
    .toHexString()
    .substring(index);

  let functionData = funcSelector.concat(calldata);

  return Bytes.fromHexString(functionData);
}

// create Executed event with multiple actions
function createExecutedEvent(
  tuple: ethereum.Value[][],
  selectors: string[],
  isDynamic: boolean = false
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

  let event = createNewExecutedEvent(
    Address.fromHexString(CONTRACT_ADDRESS).toHexString(),
    ZERO_BYTES32,
    actions,
    [Bytes.fromUTF8('')],
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );

  return event;
}

test('Run dao (handleMetadataSet) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(DAO_ADDRESS).toHexString();
  createDaoEntityState(entityID, ADDRESS_ONE, DAO_TOKEN_ADDRESS);

  let metadata = 'new-metadata';

  // handle event
  _handleMetadataSet(entityID, metadata);

  // checks
  assert.fieldEquals('Dao', entityID, 'id', entityID);
  assert.fieldEquals('Dao', entityID, 'metadata', metadata);

  clearStore();
});

describe('handleNativeTokenDeposited', () => {
  test('create entities with correct values', () => {
    // create event
    let newEvent = createNewNativeTokenDepositedEvent(
      ADDRESS_ONE,
      ONE_ETH,
      DAO_ADDRESS
    );

    let txHash = newEvent.transaction.hash;
    let logIndex = newEvent.transactionLogIndex;
    let timestamp = newEvent.block.timestamp;

    let transferId = getTransferId(txHash, logIndex, 0);
    let balanceId = daoId.concat('_').concat(ADDRESS_ZERO);

    // handle event
    handleNativeTokenDeposited(newEvent);

    // check NativeBalance entity
    eq('NativeBalance', balanceId, 'id', balanceId);
    eq('NativeBalance', balanceId, 'dao', daoId);
    eq('NativeBalance', balanceId, 'balance', ONE_ETH);
    eq('NativeBalance', balanceId, 'lastUpdated', timestamp.toString());

    eq('NativeTransfer', transferId, 'id', transferId);
    eq('NativeTransfer', transferId, 'dao', daoId);
    eq('NativeTransfer', transferId, 'from', ADDRESS_ONE);
    eq('NativeTransfer', transferId, 'to', DAO_ADDRESS);
    eq('NativeTransfer', transferId, 'amount', ONE_ETH);
    eq('NativeTransfer', transferId, 'type', 'Deposit');
    eq('NativeTransfer', transferId, 'reference', 'Native Deposit');
    eq('NativeTransfer', transferId, 'txHash', txHash.toHexString());
    eq('NativeTransfer', transferId, 'createdAt', timestamp.toString());

    clearStore();
  });
  test('correctly handles multiple events and updates balance', () => {
    // create event
    let newEvent = createNewNativeTokenDepositedEvent(
      ADDRESS_ONE,
      ONE_ETH,
      DAO_ADDRESS
    );

    newEvent.transactionLogIndex = BigInt.fromI32(2);
    handleNativeTokenDeposited(newEvent);

    newEvent.transactionLogIndex = BigInt.fromI32(3);
    handleNativeTokenDeposited(newEvent);

    let balanceId = daoId.concat('_').concat(ADDRESS_ZERO);

    let eachAmount = BigInt.fromString(ONE_ETH);
    let finalAmount = eachAmount.plus(eachAmount).toString();

    assert.entityCount('NativeTransfer', 2);
    assert.entityCount('NativeBalance', 1);
    eq('NativeBalance', balanceId, 'balance', finalAmount);

    clearStore();
  });
});

describe('handleDeposited: ', () => {
  beforeAll(() => {
    createTokenCalls(DAO_TOKEN_ADDRESS, 'DAO Token', 'DAOT', '6', '10');
    getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, ERC20_AMOUNT_HALF);
    getBalanceOf(DAO_TOKEN_ADDRESS, DAO_TOKEN_ADDRESS, ERC20_AMOUNT_HALF);
  });

  afterEach(() => {
    clearStore();
  });

  test('ERC20: creates entities with correct values', () => {
    let newEvent = createNewDepositedEvent(
      ADDRESS_ONE,
      DAO_TOKEN_ADDRESS,
      ERC20_AMOUNT_HALF,
      STRING_DATA,
      DAO_ADDRESS
    );

    let txHash = newEvent.transaction.hash;
    let logIndex = newEvent.transactionLogIndex;
    let timestamp = newEvent.block.timestamp;

    handleDeposited(newEvent);

    let transferId = getTransferId(txHash, logIndex, 0);

    // check ERC20Contract entity
    eq('ERC20Contract', tokenId, 'id', tokenId);
    eq('ERC20Contract', tokenId, 'name', 'DAO Token');
    eq('ERC20Contract', tokenId, 'symbol', 'DAOT');
    eq('ERC20Contract', tokenId, 'decimals', '6');
    assert.entityCount('ERC20Contract', 1);

    // check ERC20Balance entity
    eq('ERC20Balance', balanceId, 'id', balanceId);
    eq('ERC20Balance', balanceId, 'token', tokenId);
    eq('ERC20Balance', balanceId, 'dao', daoId);
    eq('ERC20Balance', balanceId, 'balance', ERC20_AMOUNT_HALF);
    eq('ERC20Balance', balanceId, 'lastUpdated', timestamp.toString());
    assert.entityCount('ERC20Contract', 1);

    // Check ERC20Transfer
    let from = newEvent.params.sender.toHexString();
    eq('ERC20Transfer', transferId, 'id', transferId);
    eq('ERC20Transfer', transferId, 'dao', daoId);
    eq('ERC20Transfer', transferId, 'token', tokenId);
    eq('ERC20Transfer', transferId, 'amount', ERC20_AMOUNT_HALF);
    eq('ERC20Transfer', transferId, 'from', from);
    eq('ERC20Transfer', transferId, 'to', DAO_ADDRESS);
    // eq('ERC20Transfer', transferId, 'proposal', '');  TODO:
    eq('ERC20Transfer', transferId, 'type', 'Deposit');
    eq('ERC20Transfer', transferId, 'txHash', txHash.toHexString());
    eq('ERC20Transfer', transferId, 'createdAt', timestamp.toString());
    assert.entityCount('ERC20Transfer', 1);
  });

  test('ERC20: creates multiple events and updates balance', () => {
    let newEvent = createNewDepositedEvent(
      ADDRESS_ONE,
      DAO_TOKEN_ADDRESS,
      ERC20_AMOUNT_HALF,
      STRING_DATA,
      DAO_ADDRESS
    );

    handleDeposited(newEvent);
    eq('ERC20Balance', balanceId, 'balance', ERC20_AMOUNT_HALF);

    getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, ERC20_AMOUNT_FULL);

    newEvent.transactionLogIndex = BigInt.fromI32(2);
    handleDeposited(newEvent);

    eq('ERC20Balance', balanceId, 'balance', ERC20_AMOUNT_FULL);
    assert.entityCount('ERC20Transfer', 2);
  });

  test('ETH: creates entities with correct values', () => {
    let token = ADDRESS_ZERO;

    let newEvent = createNewDepositedEvent(
      ADDRESS_ONE,
      token,
      ONE_ETH,
      STRING_DATA,
      DAO_ADDRESS
    );

    let txHash = newEvent.transaction.hash;
    let logIndex = newEvent.transactionLogIndex;
    let timestamp = newEvent.block.timestamp;
    let from = newEvent.params.sender.toHexString();
    handleDeposited(newEvent);

    let tokenId = Address.fromString(token).toHexString();
    let balanceId = daoId.concat('_').concat(tokenId);
    let transferId = getTransferId(txHash, logIndex, 0);

    // check NativeBalance entity
    eq('NativeBalance', balanceId, 'id', balanceId);
    eq('NativeBalance', balanceId, 'dao', daoId);
    eq('NativeBalance', balanceId, 'balance', ONE_ETH);
    eq('NativeBalance', balanceId, 'lastUpdated', timestamp.toString());

    // Check NativeTransfer
    eq('NativeTransfer', transferId, 'id', transferId);
    eq('NativeTransfer', transferId, 'dao', daoId);
    eq('NativeTransfer', transferId, 'amount', ONE_ETH);
    eq('NativeTransfer', transferId, 'from', from);
    eq('NativeTransfer', transferId, 'to', DAO_ADDRESS);
    // eq('NativeTransfer', transferId, 'proposal', '');  TODO:
    eq('NativeTransfer', transferId, 'type', 'Deposit');
    eq('NativeTransfer', transferId, 'txHash', txHash.toHexString());
    eq('NativeTransfer', transferId, 'createdAt', timestamp.toString());
  });

  test('ETH: correctly handles multiple events and updates balance', () => {
    // create event
    let token = ADDRESS_ZERO;
    let newEvent = createNewDepositedEvent(
      ADDRESS_ONE,
      token,
      ONE_ETH,
      STRING_DATA,
      DAO_ADDRESS
    );

    handleDeposited(newEvent);

    newEvent.transactionLogIndex = BigInt.fromI32(2);
    handleDeposited(newEvent);

    let balanceId = daoId.concat('_').concat(ADDRESS_ZERO);

    let eachAmount = BigInt.fromString(ONE_ETH);
    let finalAmount = eachAmount.plus(eachAmount).toString();

    assert.entityCount('NativeTransfer', 2);
    assert.entityCount('NativeBalance', 1);
    eq('NativeBalance', balanceId, 'balance', finalAmount);
  });
});

describe('handleCallbackReceived: ', () => {
  beforeAll(() => {
    createTokenCalls(DAO_TOKEN_ADDRESS, 'name', 'symbol', null, null);

    getSupportsInterface(DAO_TOKEN_ADDRESS, '0x01ffc9a7', true);
    getSupportsInterface(DAO_TOKEN_ADDRESS, '80ac58cd', true);
    getSupportsInterface(DAO_TOKEN_ADDRESS, '00000000', false);
  });

  describe('ERC721 Received: ', () => {
    test('create entities with correct values', () => {
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

      let newEvent = createCallbackReceivedEvent(
        DAO_ADDRESS,
        Bytes.fromHexString(onERC721Received),
        DAO_TOKEN_ADDRESS,
        functionData
      );

      handleCallbackReceived(newEvent);

      let txHash = newEvent.transaction.hash;
      let logIndex = newEvent.transactionLogIndex;
      let timestamp = newEvent.block.timestamp;

      let transferId = getTransferId(txHash, logIndex, 0);

      // check ERC721Contract entity
      eq('ERC721Contract', tokenId, 'id', tokenId);
      eq('ERC721Contract', tokenId, 'name', 'name');
      eq('ERC721Contract', tokenId, 'symbol', 'symbol');
      assert.entityCount('ERC721Contract', 1);

      // check ERC721Balance entity
      eq('ERC721Balance', balanceId, 'id', balanceId);
      eq('ERC721Balance', balanceId, 'token', tokenId);
      eq('ERC721Balance', balanceId, 'dao', daoId);
      eq('ERC721Balance', balanceId, 'tokenIds', '[1]');
      eq('ERC721Balance', balanceId, 'lastUpdated', timestamp.toString());
      assert.entityCount('ERC721Balance', 1);

      // Check ERC721Transfer
      eq('ERC721Transfer', transferId, 'id', transferId);
      eq('ERC721Transfer', transferId, 'dao', daoId);
      eq('ERC721Transfer', transferId, 'tokenId', '1');
      eq('ERC721Transfer', transferId, 'from', ADDRESS_FOUR);
      eq('ERC721Transfer', transferId, 'to', DAO_ADDRESS);
      // eq('ERC721Transfer', transferId, 'proposal', '');  TODO:
      eq('ERC721Transfer', transferId, 'type', 'Deposit');
      eq('ERC721Transfer', transferId, 'txHash', txHash.toHexString());
      eq('ERC721Transfer', transferId, 'createdAt', timestamp.toString());

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

      let newEvent = createCallbackReceivedEvent(
        DAO_ADDRESS,
        Bytes.fromHexString(onERC721Received),
        DAO_TOKEN_ADDRESS,
        functionData
      );

      handleCallbackReceived(newEvent);

      tupleArray[2] = ethereum.Value.fromUnsignedBigInt(BigInt.fromU32(2));
      functionData = encodeWithFunctionSelector(
        tupleArray,
        onERC721Received,
        true
      );
      newEvent = createCallbackReceivedEvent(
        DAO_ADDRESS,
        Bytes.fromHexString(onERC721Received),
        DAO_TOKEN_ADDRESS,
        functionData
      );

      // After 1st event
      assert.entityCount('ERC721Contract', 1);
      assert.entityCount('ERC721Transfer', 1);
      assert.entityCount('ERC721Balance', 1);
      eq('ERC721Balance', balanceId, 'tokenIds', '[1]');

      // Change log index so it will enforce to generate new transferId
      // to make sure we can assert ERC721Transfer to be 2.
      newEvent.transactionLogIndex = BigInt.fromI32(2);

      handleCallbackReceived(newEvent);

      // After 1st event
      assert.entityCount('ERC721Contract', 1);
      assert.entityCount('ERC721Transfer', 2);
      assert.entityCount('ERC721Balance', 1);
      eq('ERC721Balance', balanceId, 'tokenIds', '[1, 2]');
    });
  });
});

describe('handleExecuted', () => {
  afterEach(() => {
    clearStore();
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

        let event = createExecutedEvent([tupleArray], [ERC20_transfer]);

        handleExecuted(event);

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
        // eq('ERC20Transfer', transferId, 'proposal', '');  TODO:
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

        let event = createExecutedEvent([tupleArray], [ERC20_transfer]);

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

        let event = createExecutedEvent([tupleArray], [ERC20_transferFrom]);

        handleExecuted(event);

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
        // eq('ERC20Transfer', transferId, 'proposal', '');  TODO:
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

        let event = createExecutedEvent([tupleArray], [ERC20_transferFrom]);

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

        let event = createExecutedEvent([tupleArray], [ERC721_transferFrom]);

        let txHash = event.transaction.hash;
        let logIndex = event.transactionLogIndex;
        let timestamp = event.block.timestamp;

        let transferId = getTransferId(txHash, logIndex, 0);

        handleExecuted(event);

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
        // eq('ERC721Transfer', transferId, 'proposal', '');  TODO:
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
          [ERC721_transferFrom, ERC721_transferFrom]
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
          true
        );

        let txHash = event.transaction.hash;
        let logIndex = event.transactionLogIndex;
        let timestamp = event.block.timestamp;

        let transferId = getTransferId(txHash, logIndex, 0);

        handleExecuted(event);

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
        // eq('ERC721Transfer', transferId, 'proposal', '');  TODO:
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
          true
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
