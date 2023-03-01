import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt, Bytes} from '@graphprotocol/graph-ts';

import {
  handleVoteCast,
  handleProposalExecuted,
  handleVotingSettingsUpdated,
  _handleProposalCreated
} from '../../src/packages/token/token-voting';
import {TokenVotingPlugin} from '../../generated/schema';
import {VOTING_MODES} from '../../src/utils/constants';
import {
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  CONTRACT_ADDRESS,
  STRING_DATA,
  DAO_ADDRESS,
  PROPOSAL_ID,
  VOTING_MODE,
  SUPPORT_THRESHOLD,
  MIN_PARTICIPATION,
  MIN_VOTING_POWER,
  MIN_DURATION,
  MIN_PROPOSER_VOTING_POWER,
  START_DATE,
  END_DATE,
  SNAPSHOT_BLOCK,
  TOTAL_VOTING_POWER,
  ALLOW_FAILURE_MAP,
  ADDRESS_TWO,
  PROPOSAL_ENTITY_ID
} from '../constants';

import {
  createDummyActions,
  createGetProposalCall,
  createTotalVotingPowerCall
} from '../utils';
import {
  createNewVoteCastEvent,
  createNewProposalExecutedEvent,
  createNewProposalCreatedEvent,
  createNewVotingSettingsUpdatedEvent,
  getProposalCountCall,
  createTokenVotingProposalEntityState
} from './utils';

let actions = createDummyActions(DAO_TOKEN_ADDRESS, '0', '0x00000000');

test('Run TokenVoting (handleProposalCreated) mappings with mock event', () => {
  // create state
  let tokenVotingPlugin = new TokenVotingPlugin(
    Address.fromString(CONTRACT_ADDRESS).toHexString()
  );
  tokenVotingPlugin.dao = DAO_ADDRESS;
  tokenVotingPlugin.pluginAddress = Bytes.fromHexString(CONTRACT_ADDRESS);
  tokenVotingPlugin.save();

  // create calls
  getProposalCountCall(CONTRACT_ADDRESS, '1');
  createGetProposalCall(
    CONTRACT_ADDRESS,
    PROPOSAL_ID,
    true,
    false,

    VOTING_MODE,
    SUPPORT_THRESHOLD,
    MIN_VOTING_POWER,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,

    '0', // abstain
    '0', // yes
    '0', // no

    actions,
    ALLOW_FAILURE_MAP
  );

  createTotalVotingPowerCall(
    CONTRACT_ADDRESS,
    SNAPSHOT_BLOCK,
    TOTAL_VOTING_POWER
  );

  // create event
  let event = createNewProposalCreatedEvent(
    PROPOSAL_ID,
    ADDRESS_ONE,
    START_DATE,
    END_DATE,
    STRING_DATA,
    [],
    ALLOW_FAILURE_MAP,
    CONTRACT_ADDRESS
  );

  // handle event
  _handleProposalCreated(event, DAO_ADDRESS, STRING_DATA);

  let packageId = Address.fromString(CONTRACT_ADDRESS).toHexString();

  // checks
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'id',
    PROPOSAL_ENTITY_ID
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'dao',
    DAO_ADDRESS
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'plugin',
    packageId
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'proposalId',
    PROPOSAL_ID
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'creator',
    ADDRESS_ONE
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'metadata',
    STRING_DATA
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'allowFailureMap',
    ALLOW_FAILURE_MAP
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'creationBlockNumber',
    event.block.number.toString()
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'startDate',
    START_DATE
  );

  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'votingMode',
    VOTING_MODES.get(parseInt(VOTING_MODE))
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'supportThreshold',
    SUPPORT_THRESHOLD
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'minVotingPower',
    MIN_VOTING_POWER
  );

  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'startDate',
    START_DATE
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'endDate',
    END_DATE
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'snapshotBlock',
    SNAPSHOT_BLOCK
  );

  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'totalVotingPower',
    TOTAL_VOTING_POWER
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'executed',
    'false'
  );

  // check TokenVotingPlugin
  assert.fieldEquals(
    'TokenVotingPlugin',
    Address.fromString(CONTRACT_ADDRESS).toHexString(),
    'proposalCount',
    '1'
  );

  clearStore();
});

test('Run TokenVoting (handleVoteCast) mappings with mock event', () => {
  let proposal = createTokenVotingProposalEntityState();

  // create calls 1
  createGetProposalCall(
    CONTRACT_ADDRESS,
    PROPOSAL_ID,
    true,
    false,

    VOTING_MODE,
    SUPPORT_THRESHOLD,
    MIN_VOTING_POWER,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,

    '0', // abstain
    '1', // yes
    '0', // no

    actions,
    ALLOW_FAILURE_MAP
  );

  createTotalVotingPowerCall(
    CONTRACT_ADDRESS,
    SNAPSHOT_BLOCK,
    TOTAL_VOTING_POWER
  );

  // create event
  let event = createNewVoteCastEvent(
    PROPOSAL_ID,
    ADDRESS_ONE,
    '2', // Yes
    '1', // votingPower
    CONTRACT_ADDRESS
  );

  handleVoteCast(event);

  // checks
  let voteEntityID = ADDRESS_ONE + '_' + proposal.id;
  assert.fieldEquals('TokenVotingVote', voteEntityID, 'id', voteEntityID);
  assert.fieldEquals('TokenVotingVote', voteEntityID, 'voteReplaced', 'false');
  assert.fieldEquals(
    'TokenVotingVote',
    voteEntityID,
    'updatedAt',
    BigInt.zero().toString()
  );

  // check voter
  let memberId =
    Address.fromString(CONTRACT_ADDRESS).toHexString() +
    '_' +
    Address.fromString(ADDRESS_ONE).toHexString();

  assert.fieldEquals('TokenVotingVoter', memberId, 'id', memberId);
  assert.fieldEquals('TokenVotingVoter', memberId, 'address', ADDRESS_ONE);
  assert.fieldEquals(
    'TokenVotingVoter',
    memberId,
    'plugin',
    Address.fromString(CONTRACT_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'TokenVotingVoter',
    memberId,
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
  assert.fieldEquals(
    'TokenVotingProposal',
    proposal.id,
    'castedVotingPower',
    '1'
  );

  // Check when voter replace vote
  // create calls 2
  createGetProposalCall(
    CONTRACT_ADDRESS,
    PROPOSAL_ID,
    true,
    false,

    VOTING_MODE,
    SUPPORT_THRESHOLD,
    MIN_VOTING_POWER,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,

    '0', // abstain
    '0', // yes
    '1', // no

    actions,
    ALLOW_FAILURE_MAP
  );

  createTotalVotingPowerCall(
    CONTRACT_ADDRESS,
    SNAPSHOT_BLOCK,
    TOTAL_VOTING_POWER
  );

  // create event
  let event2 = createNewVoteCastEvent(
    PROPOSAL_ID,
    ADDRESS_ONE,
    '3', // No
    '1', // votingPower
    CONTRACT_ADDRESS
  );

  handleVoteCast(event2);

  // checks 2
  assert.fieldEquals('TokenVotingVote', voteEntityID, 'voteReplaced', 'true');
  assert.fieldEquals(
    'TokenVotingVote',
    voteEntityID,
    'updatedAt',
    event2.block.timestamp.toString()
  );

  // create calls 3
  createGetProposalCall(
    CONTRACT_ADDRESS,
    PROPOSAL_ID,
    true,
    false,

    VOTING_MODE,
    SUPPORT_THRESHOLD,
    MIN_VOTING_POWER,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,

    '0', // abstain
    '2', // yes
    '0', // no

    actions,
    ALLOW_FAILURE_MAP
  );
  // create event 3
  let event3 = createNewVoteCastEvent(
    PROPOSAL_ID,
    ADDRESS_TWO,
    '2', // yes
    '1', // votingPower
    CONTRACT_ADDRESS
  );

  handleVoteCast(event3);

  // Check executable
  // abstain: 0, yes: 2, no: 0
  // support          : 100%
  // worstCaseSupport :  67%
  // participation    :  67%
  assert.fieldEquals('TokenVotingProposal', proposal.id, 'executable', 'true');

  assert.fieldEquals(
    'TokenVotingProposal',
    proposal.id,
    'castedVotingPower',
    '2'
  );

  clearStore();
});

test('Run TokenVoting (handleVoteCast) mappings with mock event and vote option "None"', () => {
  // create state
  let proposal = createTokenVotingProposalEntityState();

  // create calls
  createGetProposalCall(
    CONTRACT_ADDRESS,
    PROPOSAL_ID,
    true,
    false,

    // ProposalParameters
    VOTING_MODE,
    SUPPORT_THRESHOLD,
    MIN_VOTING_POWER,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,

    // Tally
    '0', // abstain
    '0', // yes
    '0', // no

    actions,
    ALLOW_FAILURE_MAP
  );

  // create event
  let event = createNewVoteCastEvent(
    PROPOSAL_ID,
    ADDRESS_ONE,
    '0', // none
    '1', // votingPower
    CONTRACT_ADDRESS
  );

  handleVoteCast(event);

  // checks
  let entityID = ADDRESS_ONE + '_' + proposal.id;
  assert.notInStore('TokenVotingVoter', entityID);

  clearStore();
});

test('Run TokenVoting (handleProposalExecuted) mappings with mock event', () => {
  // create state
  createTokenVotingProposalEntityState(
    PROPOSAL_ENTITY_ID,
    DAO_ADDRESS,
    CONTRACT_ADDRESS,
    ADDRESS_ONE
  );

  // create calls
  createGetProposalCall(
    CONTRACT_ADDRESS,
    PROPOSAL_ID,
    true,
    true,

    VOTING_MODE,
    SUPPORT_THRESHOLD,
    MIN_VOTING_POWER,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,

    '0', // abstain
    '1', // yes
    '0', // no

    actions,
    ALLOW_FAILURE_MAP
  );

  // create event
  let event = createNewProposalExecutedEvent('0', CONTRACT_ADDRESS);

  // handle event
  handleProposalExecuted(event);

  // checks
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'id',
    PROPOSAL_ENTITY_ID
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'executed',
    'true'
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'executionDate',
    event.block.timestamp.toString()
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'executionBlockNumber',
    event.block.number.toString()
  );
  assert.fieldEquals(
    'TokenVotingProposal',
    PROPOSAL_ENTITY_ID,
    'executionTxHash',
    event.transaction.hash.toHexString()
  );

  clearStore();
});

test('Run TokenVoting (handleVotingSettingsUpdated) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(CONTRACT_ADDRESS).toHexString();
  let tokenVotingPlugin = new TokenVotingPlugin(entityID);
  tokenVotingPlugin.dao = DAO_ADDRESS;
  tokenVotingPlugin.pluginAddress = Bytes.fromHexString(CONTRACT_ADDRESS);
  tokenVotingPlugin.save();

  // create event
  let event = createNewVotingSettingsUpdatedEvent(
    VOTING_MODE,
    SUPPORT_THRESHOLD,
    MIN_PARTICIPATION,
    MIN_DURATION,
    MIN_PROPOSER_VOTING_POWER,

    CONTRACT_ADDRESS
  );

  // handle event
  handleVotingSettingsUpdated(event);

  // checks
  assert.fieldEquals('TokenVotingPlugin', entityID, 'id', entityID);
  assert.fieldEquals(
    'TokenVotingPlugin',
    entityID,
    'votingMode',
    VOTING_MODES.get(parseInt(VOTING_MODE))
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
