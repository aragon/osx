import {
  assert,
  clearStore,
  test,
  log,
  logStore,
} from 'matchstick-as/assembly/index';
import {Address} from '@graphprotocol/graph-ts';
import {
  createNewSetMetadataEvent,
  createNewETHDepositedEvent,
  createNewDepositedEvent,
  createNewWithdrawnEvent,
} from './utils';
import {
  daoAddress,
  addressOne,
  daiAddress,
  oneEth,
  dataString,
} from '../constants';
import {runHandleNewDAORegistered} from '../registry/utils';
import {
  handleSetMetadata,
  handleETHDeposited,
  handleDeposited,
  handleWithdrawn,
} from '../../src/dao';

test('Run dao (handleSetMetadata) mappings with mock event', () => {
  // create event and run it's handler
  runHandleNewDAORegistered(daoAddress, addressOne, daiAddress, 'mock-Dao');

  let entityID = Address.fromString(daoAddress).toHexString();

  // create event
  let newDaoEvent = createNewSetMetadataEvent('new-metadata', daoAddress);

  // handle event
  handleSetMetadata(newDaoEvent);

  // checks
  assert.fieldEquals('Dao', entityID, 'id', entityID);
  assert.fieldEquals('Dao', entityID, 'metadata', 'new-metadata');

  clearStore();
});

test('Run dao (handleETHDeposited) mappings with mock event', () => {
  // create event and run it's handler
  runHandleNewDAORegistered(daoAddress, addressOne, daiAddress, 'mock-Dao');

  // create event
  let newEvent = createNewETHDepositedEvent(addressOne, oneEth, daoAddress);

  let entityID =
    Address.fromString(daoAddress).toHexString() +
    '_' +
    newEvent.transaction.hash.toHexString() +
    '_' +
    newEvent.transactionLogIndex.toHexString();

  // handle event
  handleETHDeposited(newEvent);

  // checks
  assert.fieldEquals('VaultEthDeposit', entityID, 'id', entityID);
  assert.fieldEquals('VaultEthDeposit', entityID, 'sender', addressOne);
  assert.fieldEquals('VaultEthDeposit', entityID, 'amount', oneEth);

  clearStore();
});

test('Run dao (handleDeposited) mappings with mock event', () => {
  // create event and run it's handler
  runHandleNewDAORegistered(daoAddress, addressOne, daiAddress, 'mock-Dao');

  // create event
  let newEvent = createNewDepositedEvent(
    addressOne,
    daiAddress,
    oneEth,
    dataString,
    daoAddress
  );

  let entityID =
    Address.fromString(daoAddress).toHexString() +
    '_' +
    newEvent.transaction.hash.toHexString() +
    '_' +
    newEvent.transactionLogIndex.toHexString();

  // handle event
  handleDeposited(newEvent);

  // checks
  assert.fieldEquals('VaultDeposit', entityID, 'id', entityID);
  assert.fieldEquals(
    'VaultDeposit',
    entityID,
    'dao',
    Address.fromString(daoAddress).toHexString()
  );
  assert.fieldEquals('VaultDeposit', entityID, 'sender', addressOne);
  assert.fieldEquals(
    'VaultDeposit',
    entityID,
    'token',
    Address.fromString(daiAddress).toHexString()
  );
  assert.fieldEquals('VaultDeposit', entityID, 'amount', oneEth);
  assert.fieldEquals('VaultDeposit', entityID, 'reference', dataString);

  clearStore();
});

test('Run dao (handleWithdrawn) mappings with mock event', () => {
  // create event and run it's handler
  runHandleNewDAORegistered(daoAddress, addressOne, daiAddress, 'mock-Dao');

  // create event
  let newEvent = createNewWithdrawnEvent(
    daiAddress,
    addressOne,
    oneEth,
    dataString,
    daoAddress
  );

  let entityID =
    Address.fromString(daoAddress).toHexString() +
    '_' +
    newEvent.transaction.hash.toHexString() +
    '_' +
    newEvent.transactionLogIndex.toHexString();

  // handle event
  handleWithdrawn(newEvent);

  // checks
  assert.fieldEquals('VaultWithdraw', entityID, 'id', entityID);
  assert.fieldEquals(
    'VaultWithdraw',
    entityID,
    'dao',
    Address.fromString(daoAddress).toHexString()
  );
  assert.fieldEquals(
    'VaultWithdraw',
    entityID,
    'token',
    Address.fromString(daiAddress).toHexString()
  );
  assert.fieldEquals('VaultWithdraw', entityID, 'to', addressOne);
  assert.fieldEquals('VaultWithdraw', entityID, 'amount', oneEth);
  assert.fieldEquals('VaultWithdraw', entityID, 'reference', dataString);

  clearStore();
});
