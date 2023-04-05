import {assert, clearStore, log, test} from 'matchstick-as/assembly/index';
import {Address, bigInt, BigInt, Bytes} from '@graphprotocol/graph-ts';

import {
  handleVoteCast,
  handleProposalExecuted,
  handleVotingSettingsUpdated,
  _handleProposalCreated
} from '../../src/packages/token/token-voting';
import {TokenVotingPlugin} from '../../generated/schema';
import {VOTER_OPTIONS, VOTING_MODES} from '../../src/utils/constants';
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
  PROPOSAL_ENTITY_ID,
  ONE,
  ZERO,
  TWO
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
  getProposalCountCall
} from './utils';
import {
  ExtendedTokenVotingPlugin,
  ExtendedTokenVotingProposal,
  ExtendedTokenVotingVote,
  ExtendedTokenVotingVoter
} from '../helpers/extended-schema';

let actions = createDummyActions(DAO_TOKEN_ADDRESS, '0', '0x00000000');

test('Run TokenVoting (handleProposalCreated) mappings with mock event', () => {
  // create state
  let tokenVotingPlugin = new ExtendedTokenVotingPlugin().withDefaultValues();
  tokenVotingPlugin.buildOrUpdate();
  // assert with default value
  // eg. proposalCount is `0`.
  tokenVotingPlugin.assertEntity();

  let proposal = new ExtendedTokenVotingProposal().withDefaultValues();

  // create calls
  tokenVotingPlugin.proposalCount = BigInt.fromString(ONE);
  tokenVotingPlugin.fireCall_getProposalCountCall();
  proposal.fireCall_getProposal(actions);
  proposal.fireCall_totalVotingPower();

  // create event
  let event = proposal.fireEvent_ProposalCreated(actions, STRING_DATA);

  // handle event
  _handleProposalCreated(event, proposal.dao, STRING_DATA);

  // checks
  // expected changes
  proposal.creationBlockNumber = BigInt.fromString(ONE);
  proposal.votingMode = VOTING_MODES.get(parseInt(VOTING_MODE)) as string;
  // check TokenVotingProposal
  proposal.assertEntity();

  // check TokenVotingPlugin
  tokenVotingPlugin.assertEntity();

  clearStore();
});

test('Run TokenVoting (handleVoteCast) mappings with mock event', () => {
  // create state
  let proposal = new ExtendedTokenVotingProposal().withDefaultValues();

  proposal.buildOrUpdate();

  // check proposal entity
  proposal.assertEntity();

  // // create calls
  proposal.yes = bigInt.fromString(ONE);
  proposal.fireCall_getProposal(actions);
  proposal.fireCall_totalVotingPower();

  // create event
  let voter = new ExtendedTokenVotingVoter().withDefaultValues();

  let vote = new ExtendedTokenVotingVote().withDefaultValues();
  vote.voteOption = 'Yes';
  vote.votingPower = bigInt.fromString(ONE);

  // fire an event of `VoteCast` with voter info.
  let event = proposal.fireEvent_VoteCast(
    voter.address,
    vote.voteOption,
    vote.votingPower.toString()
  );

  // test handler
  handleVoteCast(event);

  // checks vote entity created via handler (not builder)
  vote.assertEntity();

  // check proposal
  // expected changes to the proposal entity
  proposal.castedVotingPower = BigInt.fromString(ONE);
  proposal.executable = false;
  // assert proposal entity
  proposal.assertEntity();

  // Check when voter replace vote
  // create calls 2
  proposal.yes = BigInt.fromString(ZERO);
  proposal.no = BigInt.fromString(ONE);
  proposal.fireCall_getProposal(actions);
  proposal.fireCall_totalVotingPower();

  vote.voteOption = 'No';

  let event2 = proposal.fireEvent_VoteCast(
    voter.address,
    vote.voteOption,
    vote.votingPower.toString()
  );

  handleVoteCast(event2);

  // expected changes in TokenVotingVote
  vote.voteReplaced = true;
  vote.updatedAt = bigInt.fromString(ONE);

  // checks vote entity created via handler (not builder)
  vote.assertEntity();

  // create calls 3
  proposal.yes = BigInt.fromString(TWO);
  proposal.no = BigInt.fromString(ZERO);
  proposal.fireCall_getProposal(actions);

  vote.voteOption = 'Yes';

  let event3 = proposal.fireEvent_VoteCast(
    voter.address,
    vote.voteOption,
    vote.votingPower.toString()
  );

  handleVoteCast(event3);

  // expected changes to the proposal entity
  proposal.executable = true;
  proposal.castedVotingPower = BigInt.fromString(TWO);

  proposal.assertEntity();

  clearStore();
});

test('Run TokenVoting (handleVoteCast) mappings with mock event and vote option "None"', () => {
  // create state
  let proposal = new ExtendedTokenVotingProposal().withDefaultValues();

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
  new ExtendedTokenVotingProposal().withDefaultValues().buildOrUpdate();

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
  let tokenVotingPlugin = new ExtendedTokenVotingPlugin().withDefaultValues();
  tokenVotingPlugin.buildOrUpdate();

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
