import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, Bytes} from '@graphprotocol/graph-ts';

import {
  handleNativeTokenDeposited,
  handleDeposited,
  handleExecuted,
  _handleMetadataSet,
  handleTrustedForwarderSet,
  handleSignatureValidatorSet,
  handleStandardCallbackRegistered
} from '../../src/dao/dao';
import {
  DAO_ADDRESS,
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  ONE_ETH,
  STRING_DATA,
  HALF_ETH,
  ADDRESS_ZERO,
  CONTRACT_ADDRESS,
  ZERO_BYTES32
} from '../constants';
import {createDummyActions, createTokenCalls} from '../utils';
import {
  createNewNativeTokenDepositedEvent,
  createNewDepositedEvent,
  getBalanceOf,
  createNewExecutedEvent,
  createDaoEntityState,
  createNewWithdrawnEvent,
  createTrustedForwarderSetEvent,
  createSignatureValidatorSetEvent,
  createStandardCallbackRegisteredEvent
} from './utils';
import {createTokenVotingProposalEntityState} from '../token-voting/utils';
import {decodeWithdrawParams} from '../../src/dao/utils';

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

test('Run dao (handleNativeTokenDeposited) for native token mappings with mock event', () => {
  // create event
  let newEvent = createNewNativeTokenDepositedEvent(
    ADDRESS_ONE,
    ONE_ETH,
    DAO_ADDRESS
  );

  let entityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    newEvent.transaction.hash.toHexString() +
    '_' +
    newEvent.transactionLogIndex.toHexString();

  createTokenCalls(ADDRESS_ZERO, 'Ethereum', 'ETH', '18');
  // handle event
  handleNativeTokenDeposited(newEvent);

  // checks
  assert.fieldEquals('VaultTransfer', entityID, 'id', entityID);
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'dao',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'token',
    Address.fromString(ADDRESS_ZERO).toHexString()
  );
  assert.fieldEquals('VaultTransfer', entityID, 'sender', ADDRESS_ONE);
  assert.fieldEquals('VaultTransfer', entityID, 'amount', ONE_ETH);
  assert.fieldEquals('VaultTransfer', entityID, 'reference', 'Eth deposit');
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'transaction',
    newEvent.transaction.hash.toHexString()
  );
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'createdAt',
    newEvent.block.timestamp.toString()
  );
  assert.fieldEquals('VaultTransfer', entityID, 'type', 'Deposit');

  clearStore();
});

test('Run dao (handleDeposited) for Token mappings with mock event', () => {
  // create event
  let newEvent = createNewDepositedEvent(
    ADDRESS_ONE,
    DAO_TOKEN_ADDRESS,
    ONE_ETH,
    STRING_DATA,
    DAO_ADDRESS
  );

  let entityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    newEvent.transaction.hash.toHexString() +
    '_' +
    newEvent.transactionLogIndex.toHexString();

  createTokenCalls(DAO_TOKEN_ADDRESS, 'DAO Token', 'DAOT', '6');
  getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, HALF_ETH);
  // handle event
  handleDeposited(newEvent);

  // check token
  assert.fieldEquals(
    'ERC20Token',
    Address.fromString(DAO_TOKEN_ADDRESS).toHexString(),
    'id',
    Address.fromString(DAO_TOKEN_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'ERC20Token',
    Address.fromString(DAO_TOKEN_ADDRESS).toHexString(),
    'name',
    'DAO Token'
  );
  assert.fieldEquals(
    'ERC20Token',
    Address.fromString(DAO_TOKEN_ADDRESS).toHexString(),
    'decimals',
    '6'
  );
  // check balance
  assert.fieldEquals(
    'Balance',
    Address.fromString(DAO_ADDRESS).toHexString() +
      '_' +
      Address.fromString(DAO_TOKEN_ADDRESS).toHexString(),
    'id',
    Address.fromString(DAO_ADDRESS).toHexString() +
      '_' +
      Address.fromString(DAO_TOKEN_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'Balance',
    Address.fromString(DAO_ADDRESS).toHexString() +
      '_' +
      Address.fromString(DAO_TOKEN_ADDRESS).toHexString(),
    'token',
    Address.fromString(DAO_TOKEN_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'Balance',
    Address.fromString(DAO_ADDRESS).toHexString() +
      '_' +
      Address.fromString(DAO_TOKEN_ADDRESS).toHexString(),
    'dao',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'Balance',
    Address.fromString(DAO_ADDRESS).toHexString() +
      '_' +
      Address.fromString(DAO_TOKEN_ADDRESS).toHexString(),
    'balance',
    HALF_ETH
  );
  // checks Deposit
  assert.fieldEquals('VaultTransfer', entityID, 'id', entityID);
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'dao',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'token',
    Address.fromString(DAO_TOKEN_ADDRESS).toHexString()
  );
  assert.fieldEquals('VaultTransfer', entityID, 'sender', ADDRESS_ONE);
  assert.fieldEquals('VaultTransfer', entityID, 'amount', ONE_ETH);
  assert.fieldEquals('VaultTransfer', entityID, 'reference', STRING_DATA);
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'transaction',
    newEvent.transaction.hash.toHexString()
  );
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'createdAt',
    newEvent.block.timestamp.toString()
  );
  assert.fieldEquals('VaultTransfer', entityID, 'type', 'Deposit');

  clearStore();
});

test('Run dao (handleExecuted) for Token mappings with mock event', () => {
  // create state
  let daoEntity = Address.fromString(DAO_ADDRESS).toHexString();
  createDaoEntityState(daoEntity, ADDRESS_ONE, DAO_TOKEN_ADDRESS);

  let proposalId =
    Address.fromHexString(CONTRACT_ADDRESS).toHexString() + '_' + ZERO_BYTES32;

  createTokenVotingProposalEntityState();

  // create token calls
  createTokenCalls(DAO_TOKEN_ADDRESS, 'DAO Token', 'DAOT', '6');
  getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, HALF_ETH);

  // create event
  let callData =
    '0x4f0656320000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000014536f6d6520537472696e672044617461202e2e2e000000000000000000000000';
  let actions = createDummyActions(DAO_ADDRESS, '0', callData);
  let event = createNewExecutedEvent(
    Address.fromHexString(CONTRACT_ADDRESS).toHexString(),
    ZERO_BYTES32,
    actions,
    [Bytes.fromUTF8('')],
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );

  // handle event
  handleExecuted(event);

  let withDrawParams = decodeWithdrawParams(
    Bytes.fromHexString('0x' + callData.slice(10))
  );
  // checks
  let entityID =
    Address.fromHexString(DAO_ADDRESS).toHexString() +
    '_' +
    event.transaction.hash.toHexString() +
    '_' +
    event.transactionLogIndex.toHexString() +
    '_' +
    withDrawParams.to.toHexString() +
    '_' +
    withDrawParams.amount.toString() +
    '_' +
    withDrawParams.token.toHexString() +
    '_' +
    withDrawParams.reference;

  assert.fieldEquals('VaultTransfer', entityID, 'id', entityID);
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'dao',
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'token',
    Address.fromHexString(DAO_TOKEN_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'to',
    Address.fromHexString(ADDRESS_ONE).toHexString()
  );
  assert.fieldEquals('VaultTransfer', entityID, 'amount', '1');
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'reference',
    Bytes.fromUTF8(STRING_DATA).toString()
  );
  assert.fieldEquals('VaultTransfer', entityID, 'proposal', proposalId);
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'transaction',
    event.transaction.hash.toHexString()
  );
  assert.fieldEquals(
    'VaultTransfer',
    entityID,
    'createdAt',
    event.block.timestamp.toString()
  );

  clearStore();
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
