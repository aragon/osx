import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address} from '@graphprotocol/graph-ts';
import {
  createNewSetMetadataEvent,
  createNewETHDepositedEvent,
  createNewDepositedEvent,
  createNewWithdrawnEvent,
  getBalanceOf
} from './utils';
import {
  DAO_ADDRESS,
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  ONE_ETH,
  STRING_DATA,
  HALF_ETH,
  ADDRESS_ZERO
} from '../constants';
import {runHandleNewDAORegistered} from '../registry/utils';
import {
  handleSetMetadata,
  handleETHDeposited,
  handleDeposited,
  handleWithdrawn
} from '../../src/dao/dao';
import {createTokenCalls} from '../utils';

test('Run dao (handleSetMetadata) mappings with mock event', () => {
  // create event and run it's handler
  runHandleNewDAORegistered(
    DAO_ADDRESS,
    ADDRESS_ONE,
    DAO_TOKEN_ADDRESS,
    'mock-Dao'
  );

  let entityID = Address.fromString(DAO_ADDRESS).toHexString();

  // create event
  let newDaoEvent = createNewSetMetadataEvent('new-metadata', DAO_ADDRESS);

  // handle event
  handleSetMetadata(newDaoEvent);

  // checks
  assert.fieldEquals('Dao', entityID, 'id', entityID);
  assert.fieldEquals('Dao', entityID, 'metadata', 'new-metadata');

  clearStore();
});

test('Run dao (handleDeposited) for ETH mappings with mock event', () => {
  // create event and run it's handler
  runHandleNewDAORegistered(
    DAO_ADDRESS,
    ADDRESS_ONE,
    DAO_TOKEN_ADDRESS,
    'mock-Dao'
  );

  // create event
  let newEvent = createNewETHDepositedEvent(ADDRESS_ONE, ONE_ETH, DAO_ADDRESS);

  let entityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    newEvent.transaction.hash.toHexString() +
    '_' +
    newEvent.transactionLogIndex.toHexString();

  createTokenCalls(ADDRESS_ZERO, 'Ethereum', 'ETH', '18');
  // handle event
  handleETHDeposited(newEvent);

  // checks
  assert.fieldEquals('VaultDeposit', entityID, 'id', entityID);
  assert.fieldEquals('VaultDeposit', entityID, 'sender', ADDRESS_ONE);
  assert.fieldEquals('VaultDeposit', entityID, 'amount', ONE_ETH);

  clearStore();
});

test('Run dao (handleDeposited) for Token mappings with mock event', () => {
  // create event and run it's handler
  runHandleNewDAORegistered(
    DAO_ADDRESS,
    ADDRESS_ONE,
    DAO_TOKEN_ADDRESS,
    'mock-Dao'
  );

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
  assert.fieldEquals('VaultDeposit', entityID, 'id', entityID);
  assert.fieldEquals(
    'VaultDeposit',
    entityID,
    'dao',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals('VaultDeposit', entityID, 'sender', ADDRESS_ONE);
  assert.fieldEquals(
    'VaultDeposit',
    entityID,
    'token',
    Address.fromString(DAO_TOKEN_ADDRESS).toHexString()
  );
  assert.fieldEquals('VaultDeposit', entityID, 'amount', ONE_ETH);
  assert.fieldEquals('VaultDeposit', entityID, 'reference', STRING_DATA);

  clearStore();
});

test('Run dao (handleWithdrawn) mappings with mock event', () => {
  // create event and run it's handler
  runHandleNewDAORegistered(
    DAO_ADDRESS,
    ADDRESS_ONE,
    DAO_TOKEN_ADDRESS,
    'mock-Dao'
  );

  // create event
  let newEvent = createNewWithdrawnEvent(
    DAO_TOKEN_ADDRESS,
    ADDRESS_ONE,
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
  // handle event
  handleWithdrawn(newEvent);

  // checks
  assert.fieldEquals('VaultWithdraw', entityID, 'id', entityID);
  assert.fieldEquals(
    'VaultWithdraw',
    entityID,
    'dao',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'VaultWithdraw',
    entityID,
    'token',
    Address.fromString(DAO_TOKEN_ADDRESS).toHexString()
  );
  assert.fieldEquals('VaultWithdraw', entityID, 'to', ADDRESS_ONE);
  assert.fieldEquals('VaultWithdraw', entityID, 'amount', ONE_ETH);
  assert.fieldEquals('VaultWithdraw', entityID, 'reference', STRING_DATA);

  clearStore();
});

test('Run dao (handleDeposited and handleWithdrawn for ETH)', () => {
  // create event and run it's handler
  runHandleNewDAORegistered(
    DAO_ADDRESS,
    ADDRESS_ONE,
    DAO_TOKEN_ADDRESS,
    'mock-Dao'
  );
  // deposit Eth
  // create and handle deposit event
  let newDepositEvent = createNewETHDepositedEvent(
    ADDRESS_ONE,
    ONE_ETH,
    DAO_ADDRESS
  );
  createTokenCalls(ADDRESS_ZERO, 'Ethereum', 'ETH', '18');
  handleETHDeposited(newDepositEvent);

  // check balance
  assert.fieldEquals(
    'Balance',
    Address.fromString(DAO_ADDRESS).toHexString() +
      '_' +
      Address.fromString(ADDRESS_ZERO).toHexString(),
    'balance',
    ONE_ETH
  );

  // create event
  let newEvent = createNewWithdrawnEvent(
    ADDRESS_ZERO,
    ADDRESS_ONE,
    HALF_ETH,
    STRING_DATA,
    DAO_ADDRESS
  );

  let entityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    newEvent.transaction.hash.toHexString() +
    '_' +
    newEvent.transactionLogIndex.toHexString();

  // handle event
  createTokenCalls(ADDRESS_ZERO, 'Ethereum', 'ETH', '18');
  handleWithdrawn(newEvent);

  // check deposit
  assert.fieldEquals('VaultDeposit', entityID, 'reference', 'Eth deposit');
  // checks withdraw
  assert.fieldEquals('VaultWithdraw', entityID, 'id', entityID);
  assert.fieldEquals('VaultWithdraw', entityID, 'amount', HALF_ETH);
  // check balance again
  // check balance
  assert.fieldEquals(
    'Balance',
    Address.fromString(DAO_ADDRESS).toHexString() +
      '_' +
      Address.fromString(ADDRESS_ZERO).toHexString(),
    'balance',
    HALF_ETH
  );

  clearStore();
});

test('Run dao (handleDeposite and handleWithdrawn for token)', () => {
  // create event and run it's handler
  runHandleNewDAORegistered(
    DAO_ADDRESS,
    ADDRESS_ONE,
    DAO_TOKEN_ADDRESS,
    'mock-Dao'
  );

  // create event
  let newDepositEvent = createNewDepositedEvent(
    ADDRESS_ONE,
    DAO_TOKEN_ADDRESS,
    ONE_ETH,
    STRING_DATA,
    DAO_ADDRESS
  );

  createTokenCalls(DAO_TOKEN_ADDRESS, 'DAO Token', 'DAOT', '6');
  getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, ONE_ETH);
  // handle event
  handleDeposited(newDepositEvent);

  assert.fieldEquals(
    'Balance',
    Address.fromString(DAO_ADDRESS).toHexString() +
      '_' +
      Address.fromString(DAO_TOKEN_ADDRESS).toHexString(),
    'balance',
    ONE_ETH
  );

  // create event
  let newWithdrawEvent = createNewWithdrawnEvent(
    DAO_TOKEN_ADDRESS,
    ADDRESS_ONE,
    HALF_ETH,
    STRING_DATA,
    DAO_ADDRESS
  );

  createTokenCalls(DAO_TOKEN_ADDRESS, 'DAO Token', 'DAOT', '6');
  getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, HALF_ETH);
  // handle event
  handleWithdrawn(newWithdrawEvent);

  assert.fieldEquals(
    'Balance',
    Address.fromString(DAO_ADDRESS).toHexString() +
      '_' +
      Address.fromString(DAO_TOKEN_ADDRESS).toHexString(),
    'balance',
    HALF_ETH
  );

  clearStore();
});
