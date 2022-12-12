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
  EARLY_EXECUTION,
  VOTE_REPLACEMENT,
  SUPPORT_THRESHOLD,
  MIN_PARTICIPATION,
  MIN_DURATION,
  MIN_PROPOSER_VOTING_POWER,
  START_DATE,
  END_DATE,
  SNAPSHOT_BLOCK,
  TOTAL_VOTING_POWER
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

    EARLY_EXECUTION,
    VOTE_REPLACEMENT,
    SUPPORT_THRESHOLD,
    MIN_PARTICIPATION,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,

    '0', // abstain
    '0', // yes
    '0', // no
    TOTAL_VOTING_POWER,

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
<<<<<<< refs/remotes/origin/develop
  assert.fieldEquals('TokenVotingProposal', entityID, 'creationBlockNumber', event.block.number.toString())
  assert.fieldEquals('TokenVotingProposal', entityID, 'startDate', startDate);
=======
  assert.fieldEquals('TokenVotingProposal', entityID, 'startDate', START_DATE);

>>>>>>> Fixed the subgraph
  assert.fieldEquals(
    'TokenVotingProposal',
    entityID,
    'earlyExecution',
    EARLY_EXECUTION.toString()
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    entityID,
    'voteReplacement',
    VOTE_REPLACEMENT.toString()
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    entityID,
    'supportThreshold',
    SUPPORT_THRESHOLD
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    entityID,
    'minParticipation',
    MIN_PARTICIPATION
  );

  assert.fieldEquals('TokenVotingProposal', entityID, 'startDate', START_DATE);
  assert.fieldEquals('TokenVotingProposal', entityID, 'endDate', END_DATE);
  assert.fieldEquals(
    'TokenVotingProposal',
    entityID,
    'snapshotBlock',
    SNAPSHOT_BLOCK
  );

  assert.fieldEquals(
    'TokenVotingProposal',
    entityID,
    'totalVotingPower',
    TOTAL_VOTING_POWER
  );
  assert.fieldEquals('TokenVotingProposal', entityID, 'executed', 'false');

  // check TokenVotingPlugin
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

    EARLY_EXECUTION,
    VOTE_REPLACEMENT,
    SUPPORT_THRESHOLD,
    MIN_PARTICIPATION,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,

    '0', // abstain
    '1', // yes
    '0', // no
    TOTAL_VOTING_POWER,

    actions
  );

  // create event
  let event = createNewVoteCastEvent(
    PROPOSAL_ID,
    ADDRESS_ONE,
    '2', // Yes
    '1', // votingPower
    VOTING_ADDRESS
  );

  handleVoteCast(event);

  // checks
  let entityID = ADDRESS_ONE + '_' + proposal.id;
  assert.fieldEquals('TokenVotingVote', entityID, 'id', entityID);

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

  // Check executable
  // abstain: 0, yes: 1, no: 0
  // support          : 100%
  // worstCaseSupport :  33%
  // participation    :  33%
  assert.fieldEquals('TokenVotingProposal', proposal.id, 'executable', 'false');
  // check vote count
  assert.fieldEquals('TokenVotingProposal', proposal.id, 'voteCount', '1');
  // create calls
  createGetProposalCall(
    VOTING_ADDRESS,
    PROPOSAL_ID,
    true,
    false,

    EARLY_EXECUTION,
    VOTE_REPLACEMENT,
    SUPPORT_THRESHOLD,
    MIN_PARTICIPATION,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,

    '0', // abstain
    '2', // yes
    '0', // no
    TOTAL_VOTING_POWER,

    actions
  );
  // create event
  let event2 = createNewVoteCastEvent(
    PROPOSAL_ID,
    ADDRESS_ONE,
    '2', // yes
    '1',
    VOTING_ADDRESS
  );

  handleVoteCast(event2);

  // Check executable
  // abstain: 0, yes: 2, no: 0
  // support          : 100%
  // worstCaseSupport :  67%
  // participation    :  67%
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

    EARLY_EXECUTION,
    VOTE_REPLACEMENT,
    SUPPORT_THRESHOLD,
    MIN_PARTICIPATION,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,

    '0', // abstain
    '1', // yes
    '0', // no
    TOTAL_VOTING_POWER,

    actions
  );

  // create event
  let event = createNewProposalExecutedEvent('0', VOTING_ADDRESS);

  // handle event
  handleProposalExecuted(event);

  // checks
  assert.fieldEquals('TokenVotingProposal', entityID, 'id', entityID);
  assert.fieldEquals('TokenVotingProposal', entityID, 'executed', 'true');
  assert.fieldEquals('TokenVotingProposal', entityID, 'executionDate', event.block.timestamp.toString())
  assert.fieldEquals('TokenVotingProposal', entityID, 'executionBlockNumber', event.block.number.toString())

  clearStore();
});

test('Run Token Voting (handleVoteSettingsUpdated) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString();
  let tokenVotingPlugin = new TokenVotingPlugin(entityID);
  tokenVotingPlugin.save();

  // create event
  let event = createNewVoteSettingsUpdatedEvent(
    EARLY_EXECUTION,
    VOTE_REPLACEMENT,
    SUPPORT_THRESHOLD,
    MIN_PARTICIPATION,
    MIN_DURATION,
    MIN_PROPOSER_VOTING_POWER,

    VOTING_ADDRESS
  );

  // handle event
  handleVoteSettingsUpdated(event);

  // checks
  assert.fieldEquals('TokenVotingPlugin', entityID, 'id', entityID);
  assert.fieldEquals(
    'TokenVotingPlugin',
    entityID,
    'earlyExecution',
    EARLY_EXECUTION.toString()
  );
  assert.fieldEquals(
    'TokenVotingPlugin',
    entityID,
    'voteReplacement',
    VOTE_REPLACEMENT.toString()
  );
  assert.fieldEquals(
    'TokenVotingPlugin',
    entityID,
    'supportThreshold',
    SUPPORT_THRESHOLD
  );
  assert.fieldEquals(
    'TokenVotingPlugin',
    entityID,
    'minParticipation',
    MIN_PARTICIPATION
  );
  assert.fieldEquals(
    'TokenVotingPlugin',
    entityID,
    'minDuration',
    MIN_DURATION
  );
  assert.fieldEquals(
    'TokenVotingPlugin',
    entityID,
    'minProposerVotingPower',
    MIN_PROPOSER_VOTING_POWER
  );

  clearStore();
});
