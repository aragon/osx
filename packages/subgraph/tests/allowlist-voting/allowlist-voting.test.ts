import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt} from '@graphprotocol/graph-ts';

import {
  handleUsersAdded,
  handleVoteCast,
  handleVoteExecuted,
  handleUsersRemoved,
  handleConfigUpdated,
  _handleVoteCreated
} from '../../src/packages/allowlist/allowlist-voting';
import {AllowlistPackage, AllowlistVoter} from '../../generated/schema';
import {
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  VOTING_ADDRESS,
  STRING_DATA,
  DAO_ADDRESS,
  ADDRESS_TWO,
  ADDRESS_ZERO,
  VOTE_ID,
  START_DATE,
  END_DATE,
  SNAPSHOT_BLOCK,
  MIN_SUPPORT,
  MIN_TURNOUT,
  VOTING_POWER
} from '../constants';
import {createDummyAcctions, createGetVoteCall} from '../utils';
import {
  createNewUsersAddedEvent,
  createNewVoteCastEvent,
  createNewVoteExecutedEvent,
  createNewUsersRemovedEvent,
  createNewVoteCreatedEvent,
  createNewConfigUpdatedEvent,
  getVotesLengthCall,
  createAllowlistProposalEntityState
} from './utils';

let voteId = '0';
let startDate = '1644851000';
let endDate = '1644852000';
let snapshotBlock = '100';
let supportRequiredPct = '1000';
let participationRequiredPct = '500';
let votingPower = '1000';
let actions = createDummyAcctions(DAO_TOKEN_ADDRESS, '0', '0x00000000');

test('Run Allowlist Voting (handleVoteCreated) mappings with mock event', () => {
  // create state
  let erc20VotingPackage = new AllowlistPackage(
    Address.fromString(VOTING_ADDRESS).toHexString()
  );
  erc20VotingPackage.save();

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
    supportRequiredPct,
    participationRequiredPct,
    votingPower,
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
  let proposal = createAllowlistProposalEntityState();

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
  assert.fieldEquals('AllowlistVote', entityID, 'id', entityID);

  // check proposal
  assert.fieldEquals('AllowlistProposal', proposal.id, 'yes', '1');
  // check executable
  // the total voting power is 3, currently total votes = 1
  // the min participation is 0.5; 0.33 <= 0.5 => false
  // currently yes = 1
  // the min support is 0.5; 1 >= 0.5 => true
  // is not executable
  assert.fieldEquals('AllowlistProposal', proposal.id, 'executable', 'false');
  // check vote count
  assert.fieldEquals('AllowlistProposal', proposal.id, 'voteCount', '1');
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
  assert.fieldEquals('AllowlistProposal', proposal.id, 'executable', 'true');

  assert.fieldEquals('AllowlistProposal', proposal.id, 'voteCount', '2');

  clearStore();
});

test('Run Allowlist Voting (handleVoteExecuted) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString() + '_' + '0x0';
  createAllowlistProposalEntityState(
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
    'address',
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
    userEntity.pkg = Address.fromString(VOTING_ADDRESS).toHexString();
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
