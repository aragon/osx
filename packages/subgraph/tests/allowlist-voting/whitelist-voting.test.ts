import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt} from '@graphprotocol/graph-ts';

import {
  handleUsersAdded,
  handleVoteCast,
  handleVoteExecuted,
  handleUsersRemoved,
  handleTrustedForwarderSet,
  handleConfigUpdated,
  _handleVoteStarted
} from '../../src/packages/allowlist/allowlist-voting';
import {
  AllowlistPackage,
  AllowlistProposal,
  AllowlistVoter
} from '../../generated/schema';
import {
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  VOTING_ADDRESS,
  STRING_DATA,
  DAO_ADDRESS,
  ADDRESS_TWO,
  ADDRESS_ZERO
} from '../constants';
import {createDummyAcctions, createGetVoteCall} from '../utils';
import {
  createNewUsersAddedEvent,
  createNewVoteCastEvent,
  createNewVoteExecutedEvent,
  createNewUsersRemovedEvent,
  createNewVoteStartedEvent,
  createNewTrustedForwarderSetEvent,
  createNewConfigUpdatedEvent,
  getVotesLengthCall
} from './utils';

let voteId = '0';
let startDate = '1644851000';
let endDate = '1644852000';
let snapshotBlock = '100';
let supportRequiredPct = '1000';
let participationRequired = '500';
let votingPower = '1000';

test('Run Allowlist Voting (handleVoteStarted) mappings with mock event', () => {
  // create state
  let erc20VotingPackage = new AllowlistPackage(
    Address.fromString(VOTING_ADDRESS).toHexString()
  );
  erc20VotingPackage.save();

  // create calls

  getVotesLengthCall(VOTING_ADDRESS, '1');
  let actions = createDummyAcctions(DAO_TOKEN_ADDRESS, '0', '0x00000000');
  createGetVoteCall(
    VOTING_ADDRESS,
    voteId,
    true,
    false,
    startDate,
    endDate,
    snapshotBlock,
    supportRequiredPct,
    participationRequired,
    votingPower,
    '0',
    '0',
    '0',
    actions
  );

  // create event
  let event = createNewVoteStartedEvent(
    voteId,
    ADDRESS_ONE,
    STRING_DATA,
    VOTING_ADDRESS
  );

  // handle event
  _handleVoteStarted(event, DAO_ADDRESS, STRING_DATA);

  let entityID =
    Address.fromString(VOTING_ADDRESS).toHexString() +
    '_' +
    BigInt.fromString(voteId).toHexString();
  let packageId = Address.fromString(VOTING_ADDRESS).toHexString();

  // checks
  assert.fieldEquals('AllowlistProposal', entityID, 'id', entityID);
  assert.fieldEquals('AllowlistProposal', entityID, 'dao', DAO_ADDRESS);
  assert.fieldEquals('AllowlistProposal', entityID, 'pkg', packageId);
  assert.fieldEquals('AllowlistProposal', entityID, 'voteId', voteId);
  assert.fieldEquals('AllowlistProposal', entityID, 'creator', ADDRESS_ONE);
  assert.fieldEquals('AllowlistProposal', entityID, 'metadata', STRING_DATA);
  assert.fieldEquals(
    'AllowlistProposal',
    entityID,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals('AllowlistProposal', entityID, 'startDate', startDate);
  assert.fieldEquals(
    'AllowlistProposal',
    entityID,
    'supportRequiredPct',
    supportRequiredPct
  );
  // assert.fieldEquals('AllowlistProposal', entityID, 'votingPower', votingPower);
  assert.fieldEquals('AllowlistProposal', entityID, 'executed', 'false');

  // chack AllowlistPackage
  assert.fieldEquals(
    'AllowlistPackage',
    Address.fromString(VOTING_ADDRESS).toHexString(),
    'votesLength',
    '1'
  );

  clearStore();
});

test('Run Allowlist Voting (handleVoteCast) mappings with mock event', () => {
  // create state
  let proposalId =
    Address.fromString(VOTING_ADDRESS).toHexString() + '_' + '0x0';
  let erc20VotingProposal = new AllowlistProposal(proposalId);
  erc20VotingProposal.save();

  // create calls
  let actions = createDummyAcctions(DAO_TOKEN_ADDRESS, '0', '0x00000000');
  createGetVoteCall(
    VOTING_ADDRESS,
    voteId,
    true,
    false,
    startDate,
    endDate,
    snapshotBlock,
    supportRequiredPct,
    participationRequired,
    votingPower,
    '1',
    '0',
    '0',
    actions
  );

  // create event
  let event = createNewVoteCastEvent(
    voteId,
    ADDRESS_ONE,
    '2',
    votingPower,
    VOTING_ADDRESS
  );

  handleVoteCast(event);

  // checks
  let entityID = ADDRESS_ONE + '_' + proposalId;
  assert.fieldEquals('AllowlistVote', entityID, 'id', entityID);

  // check proposal
  assert.fieldEquals('AllowlistProposal', proposalId, 'yes', '1');

  clearStore();
});

test('Run Allowlist Voting (handleVoteExecuted) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString() + '_' + '0x0';
  let erc20VotingProposal = new AllowlistProposal(entityID);
  erc20VotingProposal.save();

  // create event
  let event = createNewVoteExecutedEvent('0', VOTING_ADDRESS);

  // handle event
  handleVoteExecuted(event);

  // checks
  assert.fieldEquals('AllowlistProposal', entityID, 'id', entityID);
  assert.fieldEquals('AllowlistProposal', entityID, 'executed', 'true');

  clearStore();
});

test('Run Allowlist Voting (handleConfigUpdated) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString();
  let erc20VotingPackage = new AllowlistPackage(entityID);
  erc20VotingPackage.save();

  // create event
  let event = createNewConfigUpdatedEvent('2', '1', '3600', VOTING_ADDRESS);

  // handle event
  handleConfigUpdated(event);

  // checks
  assert.fieldEquals('AllowlistPackage', entityID, 'id', entityID);
  assert.fieldEquals(
    'AllowlistPackage',
    entityID,
    'participationRequiredPct',
    '2'
  );
  assert.fieldEquals('AllowlistPackage', entityID, 'supportRequiredPct', '1');
  assert.fieldEquals('AllowlistPackage', entityID, 'minDuration', '3600');

  clearStore();
});

test('Run Allowlist Voting (handleUsersAdded) mappings with mock event', () => {
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
    'AllowlistVoter',
    userArray[0].toHexString(),
    'id',
    userArray[0].toHexString()
  );
  assert.fieldEquals(
    'AllowlistVoter',
    userArray[0].toHexString(),
    'pkg',
    Address.fromString(VOTING_ADDRESS).toHexString()
  );

  clearStore();
});

test('Run Allowlist Voting (UsersRemoved) mappings with mock event', () => {
  // create state
  let userArray = [
    Address.fromString(ADDRESS_ONE),
    Address.fromString(ADDRESS_TWO)
  ];

  for (let index = 0; index < userArray.length; index++) {
    const user = userArray[index];
    let userEntity = new AllowlistVoter(user.toHexString());
    userEntity.save();
  }

  // create event
  let event = createNewUsersRemovedEvent([userArray[1]], VOTING_ADDRESS);

  // handle event
  handleUsersRemoved(event);

  // checks
  assert.fieldEquals(
    'AllowlistVoter',
    userArray[0].toHexString(),
    'id',
    userArray[0].toHexString()
  );
  assert.notInStore('AllowlistVoter', userArray[1].toHexString());

  clearStore();
});

test('Run Allowlist Voting (handleTrustedForwarderSet) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString();
  let allowlistVotingPackage = new AllowlistPackage(entityID);
  allowlistVotingPackage.save();

  // create event
  let event = createNewTrustedForwarderSetEvent(ADDRESS_ZERO, VOTING_ADDRESS);

  // handle event
  handleTrustedForwarderSet(event);

  // checks
  assert.fieldEquals('AllowlistPackage', entityID, 'id', entityID);
  assert.fieldEquals(
    'AllowlistPackage',
    entityID,
    'trustedForwarder',
    Address.fromString(ADDRESS_ZERO).toHexString()
  );

  clearStore();
});
