import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt} from '@graphprotocol/graph-ts';
import {
  WhitelistPackage,
  WhitelistProposal,
  WhitelistVoter
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
import {
  handleUsersAdded,
  handleVoteCast,
  handleVoteExecuted,
  handleUsersRemoved,
  handleTrustedForwarderSet,
  handleConfigUpdated,
  _handleVoteStarted
} from '../../src/packages/whitelist/whitelistVoting';
import {createDummyAcctions, createGetVoteCall} from '../utils';

let voteId = '0';
let startDate = '1644851000';
let endDate = '1644852000';
let snapshotBlock = '100';
let supportRequiredPct = '1000';
let participationRequired = '500';
let votingPower = '1000';

test('Run Whitelist Voting (handleVoteStarted) mappings with mock event', () => {
  // create state
  let erc20VotingPackage = new WhitelistPackage(
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
  assert.fieldEquals('WhitelistProposal', entityID, 'id', entityID);
  assert.fieldEquals('WhitelistProposal', entityID, 'dao', DAO_ADDRESS);
  assert.fieldEquals('WhitelistProposal', entityID, 'pkg', packageId);
  assert.fieldEquals('WhitelistProposal', entityID, 'voteId', voteId);
  assert.fieldEquals('WhitelistProposal', entityID, 'creator', ADDRESS_ONE);
  assert.fieldEquals('WhitelistProposal', entityID, 'metadata', STRING_DATA);
  assert.fieldEquals(
    'WhitelistProposal',
    entityID,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals('WhitelistProposal', entityID, 'startDate', startDate);
  assert.fieldEquals(
    'WhitelistProposal',
    entityID,
    'supportRequiredPct',
    supportRequiredPct
  );
  // assert.fieldEquals('WhitelistProposal', entityID, 'votingPower', votingPower);
  assert.fieldEquals('WhitelistProposal', entityID, 'executed', 'false');

  // chack WhitelistPackage
  assert.fieldEquals(
    'WhitelistPackage',
    Address.fromString(VOTING_ADDRESS).toHexString(),
    'votesLength',
    '1'
  );

  clearStore();
});

test('Run Whitelist Voting (handleVoteCast) mappings with mock event', () => {
  // create state
  let proposalId =
    Address.fromString(VOTING_ADDRESS).toHexString() + '_' + '0x0';
  let erc20VotingProposal = new WhitelistProposal(proposalId);
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
  assert.fieldEquals('WhitelistVote', entityID, 'id', entityID);

  // check proposal
  assert.fieldEquals('WhitelistProposal', proposalId, 'yea', '1');

  clearStore();
});

test('Run Whitelist Voting (handleVoteExecuted) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString() + '_' + '0x0';
  let erc20VotingProposal = new WhitelistProposal(entityID);
  erc20VotingProposal.save();

  // create event
  let event = createNewVoteExecutedEvent('0', VOTING_ADDRESS);

  // handle event
  handleVoteExecuted(event);

  // checks
  assert.fieldEquals('WhitelistProposal', entityID, 'id', entityID);
  assert.fieldEquals('WhitelistProposal', entityID, 'executed', 'true');

  clearStore();
});

test('Run Whitelist Voting (handleConfigUpdated) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString();
  let erc20VotingPackage = new WhitelistPackage(entityID);
  erc20VotingPackage.save();

  // create event
  let event = createNewConfigUpdatedEvent('2', '1', '3600', VOTING_ADDRESS);

  // handle event
  handleConfigUpdated(event);

  // checks
  assert.fieldEquals('WhitelistPackage', entityID, 'id', entityID);
  assert.fieldEquals(
    'WhitelistPackage',
    entityID,
    'participationRequiredPct',
    '2'
  );
  assert.fieldEquals('WhitelistPackage', entityID, 'supportRequiredPct', '1');
  assert.fieldEquals('WhitelistPackage', entityID, 'minDuration', '3600');

  clearStore();
});

test('Run Whitelist Voting (handleUsersAdded) mappings with mock event', () => {
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
    'WhitelistVoter',
    userArray[0].toHexString(),
    'id',
    userArray[0].toHexString()
  );
  assert.fieldEquals(
    'WhitelistVoter',
    userArray[0].toHexString(),
    'pkg',
    Address.fromString(VOTING_ADDRESS).toHexString()
  );

  clearStore();
});

test('Run Whitelist Voting (UsersRemoved) mappings with mock event', () => {
  // create state
  let userArray = [
    Address.fromString(ADDRESS_ONE),
    Address.fromString(ADDRESS_TWO)
  ];

  for (let index = 0; index < userArray.length; index++) {
    const user = userArray[index];
    let userEntity = new WhitelistVoter(user.toHexString());
    userEntity.save();
  }

  // create event
  let event = createNewUsersRemovedEvent([userArray[1]], VOTING_ADDRESS);

  // handle event
  handleUsersRemoved(event);

  // checks
  assert.fieldEquals(
    'WhitelistVoter',
    userArray[0].toHexString(),
    'id',
    userArray[0].toHexString()
  );
  assert.notInStore('WhitelistVoter', userArray[1].toHexString());

  clearStore();
});

test('Run Whitelist Voting (handleTrustedForwarderSet) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString();
  let whitelistVotingPackage = new WhitelistPackage(entityID);
  whitelistVotingPackage.save();

  // create event
  let event = createNewTrustedForwarderSetEvent(ADDRESS_ZERO, VOTING_ADDRESS);

  // handle event
  handleTrustedForwarderSet(event);

  // checks
  assert.fieldEquals('WhitelistPackage', entityID, 'id', entityID);
  assert.fieldEquals(
    'WhitelistPackage',
    entityID,
    'trustedForwarder',
    Address.fromString(ADDRESS_ZERO).toHexString()
  );

  clearStore();
});
