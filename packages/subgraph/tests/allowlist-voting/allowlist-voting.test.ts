import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt} from '@graphprotocol/graph-ts';

import {
  handleUsersAdded,
  handleVoteCast,
  handleVoteExecuted,
  handleUsersRemoved,
  handleConfigUpdated,
  _handleVoteCreated
} from '../../src/packages/addresslist/addresslist-voting';
import {AddresslistPlugin, AddresslistVoter} from '../../generated/schema';
import {
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  VOTING_ADDRESS,
  STRING_DATA,
  DAO_ADDRESS,
  ADDRESS_TWO,
  VOTE_ID,
  START_DATE,
  END_DATE,
  SNAPSHOT_BLOCK,
  MIN_SUPPORT,
  MIN_TURNOUT,
  VOTING_POWER
} from '../constants';
import {createDummyActions, createGetVoteCall} from '../utils';
import {
  createNewUsersAddedEvent,
  createNewVoteCastEvent,
  createNewVoteExecutedEvent,
  createNewUsersRemovedEvent,
  createNewVoteCreatedEvent,
  createNewConfigUpdatedEvent,
  getVotesLengthCall,
  createAddresslistProposalEntityState
} from './utils';

let voteId = '0';
let startDate = '1644851000';
let endDate = '1644852000';
let snapshotBlock = '100';
let relativeSupportThresholdPct = '1000';
let totalSupportThresholdPct = '500';
let census = '1000';
let actions = createDummyActions(DAO_TOKEN_ADDRESS, '0', '0x00000000');

test('Run Addresslist Voting (handleVoteCreated) mappings with mock event', () => {
  // create state
  let addresslistPlugin = new AddresslistPlugin(
    Address.fromString(VOTING_ADDRESS).toHexString()
  );
  addresslistPlugin.save();

  // create calls
  getVotesLengthCall(VOTING_ADDRESS, '1');
  createGetVoteCall(
    VOTING_ADDRESS,
    voteId,
    true,
    false,
    startDate,
    endDate,
    snapshotBlock,
    relativeSupportThresholdPct,
    totalSupportThresholdPct,
    census,
    '0',
    '0',
    '0',
    actions
  );

  // create event
  let event = createNewVoteCreatedEvent(
    voteId,
    ADDRESS_ONE,
    STRING_DATA,
    VOTING_ADDRESS
  );

  // handle event
  _handleVoteCreated(event, DAO_ADDRESS, STRING_DATA);

  let entityID =
    Address.fromString(VOTING_ADDRESS).toHexString() +
    '_' +
    BigInt.fromString(voteId).toHexString();
  let packageId = Address.fromString(VOTING_ADDRESS).toHexString();

  // checks
  assert.fieldEquals('AddresslistProposal', entityID, 'id', entityID);
  assert.fieldEquals('AddresslistProposal', entityID, 'dao', DAO_ADDRESS);
  assert.fieldEquals('AddresslistProposal', entityID, 'plugin', packageId);
  assert.fieldEquals('AddresslistProposal', entityID, 'voteId', voteId);
  assert.fieldEquals('AddresslistProposal', entityID, 'creator', ADDRESS_ONE);
  assert.fieldEquals('AddresslistProposal', entityID, 'metadata', STRING_DATA);
  assert.fieldEquals(
    'AddresslistProposal',
    entityID,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals('AddresslistProposal', entityID, 'startDate', startDate);
  assert.fieldEquals(
    'AddresslistProposal',
    entityID,
    'relativeSupportThresholdPct',
    relativeSupportThresholdPct
  );
  assert.fieldEquals('AddresslistProposal', entityID, 'executed', 'false');

  // chack AddresslistPlugin
  assert.fieldEquals(
    'AddresslistPlugin',
    Address.fromString(VOTING_ADDRESS).toHexString(),
    'votesLength',
    '1'
  );

  clearStore();
});

test('Run Addresslist Voting (handleVoteCast) mappings with mock event', () => {
  // create state
  let proposal = createAddresslistProposalEntityState();

  // create calls
  createGetVoteCall(
    VOTING_ADDRESS,
    VOTE_ID,
    true,
    false,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,
    MIN_SUPPORT,
    MIN_TURNOUT,
    VOTING_POWER,
    '1',
    '0',
    '0',
    actions
  );

  // create event
  let event = createNewVoteCastEvent(
    VOTE_ID,
    ADDRESS_ONE,
    '2',
    '1',
    VOTING_ADDRESS
  );

  handleVoteCast(event);

  // checks
  let entityID = ADDRESS_ONE + '_' + proposal.id;
  assert.fieldEquals('AddresslistVote', entityID, 'id', entityID);

  // check proposal
  assert.fieldEquals('AddresslistProposal', proposal.id, 'yes', '1');
  // check executable
  // the total voting power is 3, currently total votes = 1
  // the min participation is 0.5; 0.33 <= 0.5 => false
  // currently yes = 1
  // the min support is 0.5; 1 >= 0.5 => true
  // is not executable
  assert.fieldEquals('AddresslistProposal', proposal.id, 'executable', 'false');
  // check vote count
  assert.fieldEquals('AddresslistProposal', proposal.id, 'voteCount', '1');
  // create calls
  createGetVoteCall(
    VOTING_ADDRESS,
    VOTE_ID,
    true,
    false,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,
    MIN_SUPPORT,
    MIN_TURNOUT,
    VOTING_POWER,
    '1',
    '0',
    '1',
    actions
  );
  // create event
  let event2 = createNewVoteCastEvent(
    VOTE_ID,
    ADDRESS_ONE,
    '1', // abstain
    '1',
    VOTING_ADDRESS
  );

  handleVoteCast(event2);
  // check executable
  // the total voting power is 3, currently total votes = 2
  // the min participation is 0.5; 0.66 >= 0.5 => true
  // currently yes = 1, abstain = 1
  // the min support is 0.5; 0.5 >= 0.5 => true
  // is executable
  assert.fieldEquals('AddresslistProposal', proposal.id, 'executable', 'true');

  assert.fieldEquals('AddresslistProposal', proposal.id, 'voteCount', '2');

  clearStore();
});

test('Run Addresslist Voting (handleVoteExecuted) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString() + '_' + '0x0';
  createAddresslistProposalEntityState(
    entityID,
    DAO_ADDRESS,
    VOTING_ADDRESS,
    ADDRESS_ONE
  );

  // create event
  let event = createNewVoteExecutedEvent('0', VOTING_ADDRESS);

  // handle event
  handleVoteExecuted(event);

  // checks
  assert.fieldEquals('AddresslistProposal', entityID, 'id', entityID);
  assert.fieldEquals('AddresslistProposal', entityID, 'executed', 'true');

  clearStore();
});

test('Run Addresslist Voting (handleConfigUpdated) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString();
  let addresslistPlugin = new AddresslistPlugin(entityID);
  addresslistPlugin.save();

  // create event
  let event = createNewConfigUpdatedEvent('2', '1', '3600', VOTING_ADDRESS);

  // handle event
  handleConfigUpdated(event);

  // checks
  assert.fieldEquals('AddresslistPlugin', entityID, 'id', entityID);
  assert.fieldEquals(
    'AddresslistPlugin',
    entityID,
    'totalSupportThresholdPct',
    '2'
  );
  assert.fieldEquals(
    'AddresslistPlugin',
    entityID,
    'relativeSupportThresholdPct',
    '1'
  );
  assert.fieldEquals('AddresslistPlugin', entityID, 'minDuration', '3600');

  clearStore();
});

test('Run Addresslist Voting (handleUsersAdded) mappings with mock event', () => {
  let userArray = [
    Address.fromString(ADDRESS_ONE),
    Address.fromString(ADDRESS_TWO)
  ];

  // create event
  let event = createNewUsersAddedEvent(userArray, VOTING_ADDRESS);

  // handle event
  handleUsersAdded(event);

  // checks
  assert.fieldEquals(
    'AddresslistVoter',
    userArray[0].toHexString(),
    'id',
    userArray[0].toHexString()
  );
  assert.fieldEquals(
    'AddresslistVoter',
    userArray[0].toHexString(),
    'address',
    userArray[0].toHexString()
  );
  assert.fieldEquals(
    'AddresslistVoter',
    userArray[0].toHexString(),
    'plugin',
    Address.fromString(VOTING_ADDRESS).toHexString()
  );

  clearStore();
});

test('Run Addresslist Voting (UsersRemoved) mappings with mock event', () => {
  // create state
  let userArray = [
    Address.fromString(ADDRESS_ONE),
    Address.fromString(ADDRESS_TWO)
  ];

  for (let index = 0; index < userArray.length; index++) {
    const user = userArray[index];
    let userEntity = new AddresslistVoter(user.toHexString());
    userEntity.plugin = Address.fromString(VOTING_ADDRESS).toHexString();
    userEntity.save();
  }

  // create event
  let event = createNewUsersRemovedEvent([userArray[1]], VOTING_ADDRESS);

  // handle event
  handleUsersRemoved(event);

  // checks
  assert.fieldEquals(
    'AddresslistVoter',
    userArray[0].toHexString(),
    'id',
    userArray[0].toHexString()
  );
  assert.notInStore('AddresslistVoter', userArray[1].toHexString());

  clearStore();
});
