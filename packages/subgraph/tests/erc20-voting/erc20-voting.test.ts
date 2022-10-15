import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt} from '@graphprotocol/graph-ts';

import {
  handleVoteCast,
  handleVoteExecuted,
  handleTrustedForwarderSet,
  handleConfigUpdated,
  _handleVoteCreated
} from '../../src/packages/erc20/erc20-voting';
import {ERC20VotingPackage} from '../../generated/schema';
import {
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  VOTING_ADDRESS,
  STRING_DATA,
  DAO_ADDRESS,
  ADDRESS_ZERO,
  VOTE_ID,
  END_DATE,
  MIN_SUPPORT,
  MIN_TURNOUT,
  SNAPSHOT_BLOCK,
  START_DATE,
  VOTING_POWER
} from '../constants';
import {createDummyAcctions, createGetVoteCall} from '../utils';
import {
  createNewVoteCastEvent,
  createNewVoteExecutedEvent,
  createNewVoteCreatedEvent,
  createNewTrustedForwarderSetEvent,
  createNewConfigUpdatedEvent,
  getVotesLengthCall,
  createERC20VotingProposalEntityState
} from './utils';

let voteId = '0';
let startDate = '1644851000';
let endDate = '1644852000';
let snapshotBlock = '100';
let supportRequiredPct = '1000';
let participationRequiredPct = '500';
let votingPower = '1000';
let actions = createDummyAcctions(DAO_TOKEN_ADDRESS, '0', '0x00000000');

test('Run ERC Voting (handleVoteCreated) mappings with mock event', () => {
  // create state
  let erc20VotingPackage = new ERC20VotingPackage(
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
  assert.fieldEquals('ERC20VotingProposal', entityID, 'id', entityID);
  assert.fieldEquals('ERC20VotingProposal', entityID, 'dao', DAO_ADDRESS);
  assert.fieldEquals('ERC20VotingProposal', entityID, 'pkg', packageId);
  assert.fieldEquals('ERC20VotingProposal', entityID, 'voteId', voteId);
  assert.fieldEquals('ERC20VotingProposal', entityID, 'creator', ADDRESS_ONE);
  assert.fieldEquals('ERC20VotingProposal', entityID, 'metadata', STRING_DATA);
  assert.fieldEquals(
    'ERC20VotingProposal',
    entityID,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals('ERC20VotingProposal', entityID, 'startDate', startDate);
  assert.fieldEquals(
    'ERC20VotingProposal',
    entityID,
    'snapshotBlock',
    snapshotBlock
  );
  assert.fieldEquals(
    'ERC20VotingProposal',
    entityID,
    'supportRequiredPct',
    supportRequiredPct
  );
  assert.fieldEquals(
    'ERC20VotingProposal',
    entityID,
    'participationRequiredPct',
    participationRequiredPct
  );
  assert.fieldEquals(
    'ERC20VotingProposal',
    entityID,
    'votingPower',
    votingPower
  );
  assert.fieldEquals('ERC20VotingProposal', entityID, 'executed', 'false');

  // chack ERC20VotingPackage
  assert.fieldEquals(
    'ERC20VotingPackage',
    Address.fromString(VOTING_ADDRESS).toHexString(),
    'votesLength',
    '1'
  );

  clearStore();
});

test('Run ERC Voting (handleVoteCast) mappings with mock event', () => {
  let proposal = createERC20VotingProposalEntityState();

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
    '2', // Yes
    '1',
    VOTING_ADDRESS
  );

  handleVoteCast(event);

  // checks
  let entityID = ADDRESS_ONE + '_' + proposal.id;
  assert.fieldEquals('ERC20Vote', entityID, 'id', entityID);

  // check voter
  assert.fieldEquals('ERC20VotingVoter', ADDRESS_ONE, 'id', ADDRESS_ONE);
  assert.fieldEquals('ERC20VotingVoter', ADDRESS_ONE, 'address', ADDRESS_ONE);
  assert.fieldEquals(
    'ERC20VotingVoter',
    ADDRESS_ONE,
    'pkg',
    Address.fromString(VOTING_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'ERC20VotingVoter',
    ADDRESS_ONE,
    'lastUpdated',
    event.block.timestamp.toString()
  );

  // check proposal
  assert.fieldEquals('ERC20VotingProposal', proposal.id, 'yes', '1');

  // check executable
  // the total voting power is 3, currently total votes = 1
  // the min participation is 0.5; 0.33 <= 0.5 => false
  // currently yes = 1
  // the min support is 0.5; 1 >= 0.5 => true
  // is not executable 
  assert.fieldEquals('ERC20VotingProposal', proposal.id, 'executable', 'false');
  // check vote count
  assert.fieldEquals('ERC20VotingProposal', proposal.id, 'voteCount', '1');
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
  assert.fieldEquals('ERC20VotingProposal', proposal.id, 'executable', 'true');

  assert.fieldEquals('ERC20VotingProposal', proposal.id, 'voteCount', '2');

  clearStore();
});

test('Run ERC Voting (handleVoteExecuted) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString() + '_' + '0x0';

  createERC20VotingProposalEntityState(
    entityID,
    DAO_ADDRESS,
    VOTING_ADDRESS,
    ADDRESS_ONE
  );

  // create calls
  createGetVoteCall(
    VOTING_ADDRESS,
    voteId,
    true,
    true,
    startDate,
    endDate,
    snapshotBlock,
    supportRequiredPct,
    participationRequiredPct,
    votingPower,
    '1',
    '0',
    '0',
    actions
  );

  // create event
  let event = createNewVoteExecutedEvent('0', VOTING_ADDRESS);

  // handle event
  handleVoteExecuted(event);

  // checks
  assert.fieldEquals('ERC20VotingProposal', entityID, 'id', entityID);
  assert.fieldEquals('ERC20VotingProposal', entityID, 'executed', 'true');

  clearStore();
});

test('Run ERC Voting (handleConfigUpdated) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString();
  let erc20VotingPackage = new ERC20VotingPackage(entityID);
  erc20VotingPackage.save();

  // create event
  let event = createNewConfigUpdatedEvent('1', '2', '3600', VOTING_ADDRESS);

  // handle event
  handleConfigUpdated(event);

  // checks
  assert.fieldEquals('ERC20VotingPackage', entityID, 'id', entityID);
  assert.fieldEquals('ERC20VotingPackage', entityID, 'supportRequiredPct', '1');
  assert.fieldEquals(
    'ERC20VotingPackage',
    entityID,
    'participationRequiredPct',
    '2'
  );
  assert.fieldEquals('ERC20VotingPackage', entityID, 'minDuration', '3600');

  clearStore();
});

test('Run ERC Voting (handleTrustedForwarderSet) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString();
  let erc20VotingPackage = new ERC20VotingPackage(entityID);
  erc20VotingPackage.save();

  // create event
  let event = createNewTrustedForwarderSetEvent(ADDRESS_ZERO, VOTING_ADDRESS);

  // handle event
  handleTrustedForwarderSet(event);

  // checks
  assert.fieldEquals('ERC20VotingPackage', entityID, 'id', entityID);
  assert.fieldEquals(
    'ERC20VotingPackage',
    entityID,
    'trustedForwarder',
    Address.fromString(ADDRESS_ZERO).toHexString()
  );

  clearStore();
});
