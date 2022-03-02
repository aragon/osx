import {assert, clearStore, test, logStore} from 'matchstick-as/assembly/index';
import {Address, Bytes} from '@graphprotocol/graph-ts';
import {
  createNewSetMetadataEvent,
  createNewETHDepositedEvent,
  createNewDepositedEvent,
  getBalanceOf,
  createNewExecutedEvent
} from './utils';
import {
  DAO_ADDRESS,
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  ONE_ETH,
  STRING_DATA,
  HALF_ETH,
  ADDRESS_ZERO,
  VOTING_ADDRESS
} from '../constants';
import {runHandleNewDAORegistered} from '../registry/utils';
import {
  handleSetMetadata,
  handleETHDeposited,
  handleDeposited,
  handleExecuted
  // handleWithdrawn
} from '../../src/dao/dao';
import {createDummyAcctions, createTokenCalls} from '../utils';
import {Dao, ERC20VotingProposal} from '../../generated/schema';

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

test('Run dao (handleDeposited) for Token mappings with mock event', () => {
  // create state
  let daoEntity = new Dao(Address.fromHexString(DAO_ADDRESS).toHexString());
  daoEntity.save();

  let proposalId =
    Address.fromHexString(VOTING_ADDRESS).toHexString() + '_' + '0x0';
  let proposalEntity = new ERC20VotingProposal(proposalId);
  proposalEntity.save();

  // create token calls
  createTokenCalls(DAO_TOKEN_ADDRESS, 'DAO Token', 'DAOT', '6');
  getBalanceOf(DAO_TOKEN_ADDRESS, DAO_ADDRESS, HALF_ETH);

  // create event
  let callData =
    '0x4f0656320000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000014536f6d6520537472696e672044617461202e2e2e000000000000000000000000';
  let actions = createDummyAcctions(DAO_ADDRESS, '0', callData);
  let event = createNewExecutedEvent(
    Address.fromHexString(VOTING_ADDRESS).toHexString(),
    '0',
    actions,
    [Bytes.fromUTF8('')],
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );

  // handle event
  handleExecuted(event);

  // checks
  let entityID =
    Address.fromHexString(DAO_ADDRESS).toHexString() +
    '_' +
    event.transaction.hash.toHexString() +
    '_' +
    event.transactionLogIndex.toHexString() +
    '_' +
    '0';
  assert.fieldEquals('VaultWithdraw', entityID, 'id', entityID);
  assert.fieldEquals(
    'VaultWithdraw',
    entityID,
    'dao',
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'VaultWithdraw',
    entityID,
    'token',
    Address.fromHexString(DAO_TOKEN_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'VaultWithdraw',
    entityID,
    'to',
    Address.fromHexString(ADDRESS_ONE).toHexString()
  );
  assert.fieldEquals('VaultWithdraw', entityID, 'amount', '1');
  assert.fieldEquals(
    'VaultWithdraw',
    entityID,
    'reference',
    Bytes.fromUTF8(STRING_DATA).toString()
  );
  assert.fieldEquals('VaultWithdraw', entityID, 'proposal', proposalId);
  assert.fieldEquals(
    'VaultWithdraw',
    entityID,
    'transaction',
    event.transaction.hash.toHexString()
  );
  assert.fieldEquals(
    'VaultWithdraw',
    entityID,
    'createdAt',
    event.block.timestamp.toString()
  );

  clearStore();
});
