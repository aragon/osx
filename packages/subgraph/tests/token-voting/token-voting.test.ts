import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt} from '@graphprotocol/graph-ts';

import {
  handleVoteCast,
  handleProposalExecuted,
  handleVoteSettingsUpdated,
  _handleProposalCreated
} from '../../src/packages/token/token-voting';
import {TokenVotingPlugin} from '../../generated/schema';
import {
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  VOTING_ADDRESS,
  STRING_DATA,
  DAO_ADDRESS,
  PROPOSAL_ID,
  END_DATE,
  MIN_SUPPORT,
  MIN_TURNOUT,
  SNAPSHOT_BLOCK,
  START_DATE,
  VOTING_POWER
} from '../constants';
import {createDummyActions, createGetProposalCall} from '../utils';
import {
  createNewVoteCastEvent,
  createNewProposalExecutedEvent,
  createNewProposalCreatedEvent,
  createNewVoteSettingsUpdatedEvent,
  getProposalCountCall,
  createTokenVotingProposalEntityState
} from './utils';

let proposalId = '0';
let startDate = '1644851000';
let endDate = '1644852000';
let snapshotBlock = '100';
let relativeSupportThresholdPct = '1000';
let totalSupportThresholdPct = '500';
let totalVotingPower = '1000';
let actions = createDummyActions(DAO_TOKEN_ADDRESS, '0', '0x00000000');

test('Run Token Voting (handleProposalCreated) mappings with mock event', () => {
  // create state
  let tokenVotingPlugin = new TokenVotingPlugin(
    Address.fromString(VOTING_ADDRESS).toHexString()
  );
  tokenVotingPlugin.save();

  // create calls
  getProposalCountCall(VOTING_ADDRESS, '1');
  createGetProposalCall(
    VOTING_ADDRESS,
    proposalId,
    true,
    false,
    startDate,
    endDate,
    snapshotBlock,
    relativeSupportThresholdPct,
    totalSupportThresholdPct,
    totalVotingPower,
    '0',
    '0',
    '0',
    actions
  );

  // create event
  let event = createNewProposalCreatedEvent(
    proposalId,
    ADDRESS_ONE,
    STRING_DATA,
    VOTING_ADDRESS
  );

  // handle event
  _handleProposalCreated(event, DAO_ADDRESS, STRING_DATA);

  let entityID =
    Address.fromString(VOTING_ADDRESS).toHexString() +
    '_' +
    BigInt.fromString(proposalId).toHexString();
  let packageId = Address.fromString(VOTING_ADDRESS).toHexString();

  // checks
  assert.fieldEquals('TokenVotingProposal', entityID, 'id', entityID);
  assert.fieldEquals('TokenVotingProposal', entityID, 'dao', DAO_ADDRESS);
  assert.fieldEquals('TokenVotingProposal', entityID, 'plugin', packageId);
  assert.fieldEquals('TokenVotingProposal', entityID, 'proposalId', proposalId);
  assert.fieldEquals('TokenVotingProposal', entityID, 'creator', ADDRESS_ONE);
  assert.fieldEquals('TokenVotingProposal', entityID, 'metadata', STRING_DATA);
  assert.fieldEquals(
    'TokenVotingProposal',
    entityID,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals('TokenVotingProposal', entityID, 'startDate', startDate);
  assert.fieldEquals(
    'TokenVotingProposal',
    entityID,
    'snapshotBlock',
    snapshotBlock
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    entityID,
    'relativeSupportThresholdPct',
    relativeSupportThresholdPct
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    entityID,
    'totalSupportThresholdPct',
    totalSupportThresholdPct
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    entityID,
    'totalVotingPower',
    totalVotingPower
  );
  assert.fieldEquals('TokenVotingProposal', entityID, 'executed', 'false');

  // chack TokenVotingPlugin
  assert.fieldEquals(
    'TokenVotingPlugin',
    Address.fromString(VOTING_ADDRESS).toHexString(),
    'proposalCount',
    '1'
  );

  clearStore();
});

test('Run Token Voting (handleVoteCast) mappings with mock event', () => {
  let proposal = createTokenVotingProposalEntityState();

  // create calls
  createGetProposalCall(
    VOTING_ADDRESS,
    PROPOSAL_ID,
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
    PROPOSAL_ID,
    ADDRESS_ONE,
    '2', // Yes
    '1',
    VOTING_ADDRESS
  );

  handleVoteCast(event);

  // checks
  let entityID = ADDRESS_ONE + '_' + proposal.id;
  assert.fieldEquals('TokenVote', entityID, 'id', entityID);

  // check voter
  assert.fieldEquals('TokenVotingVoter', ADDRESS_ONE, 'id', ADDRESS_ONE);
  assert.fieldEquals('TokenVotingVoter', ADDRESS_ONE, 'address', ADDRESS_ONE);
  assert.fieldEquals(
    'TokenVotingVoter',
    ADDRESS_ONE,
    'plugin',
    Address.fromString(VOTING_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'TokenVotingVoter',
    ADDRESS_ONE,
    'lastUpdated',
    event.block.timestamp.toString()
  );

  // check proposal
  assert.fieldEquals('TokenVotingProposal', proposal.id, 'yes', '1');

  // check executable
  // the total voting power is 3, currently total votes = 1
  // the min participation is 0.5; 0.33 <= 0.5 => false
  // currently yes = 1
  // the min support is 0.5; 1 >= 0.5 => true
  // is not executable
  assert.fieldEquals('TokenVotingProposal', proposal.id, 'executable', 'false');
  // check vote count
  assert.fieldEquals('TokenVotingProposal', proposal.id, 'voteCount', '1');
  // create calls
  createGetProposalCall(
    VOTING_ADDRESS,
    PROPOSAL_ID,
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
    PROPOSAL_ID,
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
  assert.fieldEquals('TokenVotingProposal', proposal.id, 'executable', 'true');

  assert.fieldEquals('TokenVotingProposal', proposal.id, 'voteCount', '2');

  clearStore();
});

test('Run Token Voting (handleProposalExecuted) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString() + '_' + '0x0';

  createTokenVotingProposalEntityState(
    entityID,
    DAO_ADDRESS,
    VOTING_ADDRESS,
    ADDRESS_ONE
  );

  // create calls
  createGetProposalCall(
    VOTING_ADDRESS,
    proposalId,
    true,
    true,
    startDate,
    endDate,
    snapshotBlock,
    relativeSupportThresholdPct,
    totalSupportThresholdPct,
    totalVotingPower,
    '1',
    '0',
    '0',
    actions
  );

  // create event
  let event = createNewProposalExecutedEvent('0', VOTING_ADDRESS);

  // handle event
  handleProposalExecuted(event);

  // checks
  assert.fieldEquals('TokenVotingProposal', entityID, 'id', entityID);
  assert.fieldEquals('TokenVotingProposal', entityID, 'executed', 'true');

  clearStore();
});

test('Run Token Voting (handleVoteSettingsUpdated) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString();
  let tokenVotingPlugin = new TokenVotingPlugin(entityID);
  tokenVotingPlugin.save();

  // create event
  let event = createNewVoteSettingsUpdatedEvent(
    '1',
    '2',
    '3600',
    VOTING_ADDRESS
  );

  // handle event
  handleVoteSettingsUpdated(event);

  // checks
  assert.fieldEquals('TokenVotingPlugin', entityID, 'id', entityID);
  assert.fieldEquals(
    'TokenVotingPlugin',
    entityID,
    'relativeSupportThresholdPct',
    '1'
  );
  assert.fieldEquals(
    'TokenVotingPlugin',
    entityID,
    'totalSupportThresholdPct',
    '2'
  );
  assert.fieldEquals('TokenVotingPlugin', entityID, 'minDuration', '3600');

  clearStore();
});
