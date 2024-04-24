import {
  AddresslistVotingPlugin,
  AddresslistVotingVoter,
} from '../../generated/schema';
import {
  handleMembersAdded,
  handleVoteCast,
  handleProposalExecuted,
  handleMembersRemoved,
  handleVotingSettingsUpdated,
  _handleProposalCreated,
} from '../../src/packages/addresslist/addresslist-voting';
import {VOTING_MODES} from '../../src/utils/constants';
import {
  generateMemberEntityId,
  generateVoteEntityId,
} from '../../src/utils/ids';
import {
  ADDRESS_ONE,
  ADDRESS_TWO,
  DAO_TOKEN_ADDRESS,
  CONTRACT_ADDRESS,
  STRING_DATA,
  DAO_ADDRESS,
  PLUGIN_PROPOSAL_ID,
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
  PROPOSAL_ENTITY_ID,
} from '../constants';
import {createGetProposalCall, createTotalVotingPowerCall} from '../utils';
import {
  createNewMembersAddedEvent,
  createNewVoteCastEvent,
  createNewProposalExecutedEvent,
  createNewMembersRemovedEvent,
  createNewProposalCreatedEvent,
  createNewVotingSettingsUpdatedEvent,
  getProposalCountCall,
  createAddresslistVotingProposalEntityState,
} from './utils';
import {
  generatePluginEntityId,
  createDummyAction,
} from '@aragon/osx-commons-subgraph';
import {Address, BigInt} from '@graphprotocol/graph-ts';
import {assert, clearStore, test} from 'matchstick-as/assembly/index';

let actions = [createDummyAction(DAO_TOKEN_ADDRESS, '0', '0x00000000')];

const daoAddress = Address.fromString(DAO_ADDRESS);
const daoEntityId = generatePluginEntityId(daoAddress);
const pluginAddress = Address.fromString(CONTRACT_ADDRESS);
const pluginEntityId = generatePluginEntityId(pluginAddress);
const memberOneAddress = Address.fromString(ADDRESS_ONE);
const memberTwoAddress = Address.fromString(ADDRESS_TWO);
const memberOneHexString = memberOneAddress.toHexString();

test('Run AddresslistVoting (handleProposalCreated) mappings with mock event', () => {
  // create state
  let addresslistVotingPlugin = new AddresslistVotingPlugin(pluginEntityId);
  addresslistVotingPlugin.dao = daoEntityId;
  addresslistVotingPlugin.pluginAddress = pluginAddress;
  addresslistVotingPlugin.save();

  // create calls
  getProposalCountCall(pluginEntityId, '1');
  createGetProposalCall(
    pluginEntityId,
    PLUGIN_PROPOSAL_ID,
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

  createTotalVotingPowerCall(
    pluginEntityId,
    SNAPSHOT_BLOCK,
    TOTAL_VOTING_POWER
  );

  // create event
  let event = createNewProposalCreatedEvent(
    PLUGIN_PROPOSAL_ID,
    ADDRESS_ONE,
    START_DATE,
    END_DATE,
    STRING_DATA,
    [],
    ALLOW_FAILURE_MAP,
    CONTRACT_ADDRESS
  );

  // handle event
  _handleProposalCreated(event, daoEntityId, STRING_DATA);

  // checks
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'id',
    PROPOSAL_ENTITY_ID
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'dao',
    daoEntityId
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'plugin',
    pluginEntityId
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'pluginProposalId',
    PLUGIN_PROPOSAL_ID
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'creator',
    ADDRESS_ONE
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'metadata',
    STRING_DATA
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'creationBlockNumber',
    event.block.number.toString()
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'allowFailureMap',
    ALLOW_FAILURE_MAP
  );

  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'votingMode',
    VOTING_MODES.get(parseInt(VOTING_MODE))
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'supportThreshold',
    SUPPORT_THRESHOLD
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'minVotingPower',
    MIN_VOTING_POWER
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'startDate',
    START_DATE
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'endDate',
    END_DATE
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'snapshotBlock',
    SNAPSHOT_BLOCK
  );

  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'totalVotingPower',
    TOTAL_VOTING_POWER
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    PROPOSAL_ENTITY_ID,
    'executed',
    'false'
  );

  // check AddresslistVotingPlugin
  assert.fieldEquals(
    'AddresslistVotingPlugin',
    Address.fromString(CONTRACT_ADDRESS).toHexString(),
    'proposalCount',
    '1'
  );

  clearStore();
});

test('Run AddresslistVoting (handleVoteCast) mappings with mock event', () => {
  // create state
  let proposal = createAddresslistVotingProposalEntityState();

  // create calls
  createGetProposalCall(
    pluginEntityId,
    PLUGIN_PROPOSAL_ID,
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
    '1', // yes
    '0', // no

    actions,
    ALLOW_FAILURE_MAP
  );

  createTotalVotingPowerCall(
    pluginEntityId,
    SNAPSHOT_BLOCK,
    TOTAL_VOTING_POWER
  );

  // create event
  let event = createNewVoteCastEvent(
    PLUGIN_PROPOSAL_ID,
    memberOneHexString,
    '2', // yes
    '1', // votingPower
    pluginEntityId
  );

  handleVoteCast(event);

  // checks
  const voteEntityId = generateVoteEntityId(memberOneAddress, proposal.id);
  assert.fieldEquals('AddresslistVotingVote', voteEntityId, 'id', voteEntityId);
  assert.fieldEquals(
    'AddresslistVotingVote',
    voteEntityId,
    'voteReplaced',
    'false'
  );
  assert.fieldEquals(
    'AddresslistVotingVote',
    voteEntityId,
    'updatedAt',
    BigInt.zero().toString()
  );

  // check proposal
  assert.fieldEquals('AddresslistVotingProposal', proposal.id, 'yes', '1');
  // Check approvalReached
  // abstain: 0, yes: 1, no: 0
  // support          : 100%
  // worstCaseSupport :  33%
  // participation    :  33%
  assert.fieldEquals(
    'AddresslistVotingProposal',
    proposal.id,
    'approvalReached',
    'false'
  );
  // check vote count
  assert.fieldEquals(
    'AddresslistVotingProposal',
    proposal.id,
    'castedVotingPower',
    '1'
  );

  // Check when voter replace vote
  // create calls 2
  createGetProposalCall(
    pluginEntityId,
    PLUGIN_PROPOSAL_ID,
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

  // create event
  let event2 = createNewVoteCastEvent(
    PLUGIN_PROPOSAL_ID,
    memberOneHexString,
    '3', // No
    '1', // votingPower
    pluginEntityId
  );

  handleVoteCast(event2);

  // checks 2
  assert.fieldEquals(
    'AddresslistVotingVote',
    voteEntityId,
    'voteReplaced',
    'true'
  );
  assert.fieldEquals(
    'AddresslistVotingVote',
    voteEntityId,
    'updatedAt',
    event2.block.timestamp.toString()
  );

  // create calls 3
  createGetProposalCall(
    pluginEntityId,
    PLUGIN_PROPOSAL_ID,
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

  // create event
  let event3 = createNewVoteCastEvent(
    PLUGIN_PROPOSAL_ID,
    ADDRESS_TWO,
    '2', // yes
    '1', // votingPower
    CONTRACT_ADDRESS
  );

  handleVoteCast(event3);

  // Check approvalReached
  // abstain: 0, yes: 2, no: 0
  // support          : 100%
  // worstCaseSupport :  67%
  // participation    :  67%
  assert.fieldEquals(
    'AddresslistVotingProposal',
    proposal.id,
    'approvalReached',
    'true'
  );

  assert.fieldEquals(
    'AddresslistVotingProposal',
    proposal.id,
    'castedVotingPower',
    '2'
  );

  clearStore();
});

test('Run AddresslistVoting (handleVoteCast) mappings with mock event and vote option "None"', () => {
  // create state
  let proposal = createAddresslistVotingProposalEntityState();

  // create calls
  createGetProposalCall(
    pluginEntityId,
    PLUGIN_PROPOSAL_ID,
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
    PLUGIN_PROPOSAL_ID,
    memberOneHexString,
    '0', // none
    '1', // votingPower
    pluginEntityId
  );

  handleVoteCast(event);

  // checks
  let voteEntityId = generateVoteEntityId(memberOneAddress, proposal.id);
  assert.notInStore('AddresslistVotingVote', voteEntityId);

  clearStore();
});

test('Run AddresslistVoting (handleProposalExecuted) mappings with mock event', () => {
  // create state
  let proposal = createAddresslistVotingProposalEntityState();

  // create event
  let event = createNewProposalExecutedEvent('0', pluginEntityId);

  // handle event
  handleProposalExecuted(event);

  // checks
  assert.fieldEquals(
    'AddresslistVotingProposal',
    proposal.id,
    'id',
    proposal.id
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    proposal.id,
    'executed',
    'true'
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    proposal.id,
    'executionDate',
    event.block.timestamp.toString()
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    proposal.id,
    'executionBlockNumber',
    event.block.number.toString()
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    proposal.id,
    'executionTxHash',
    event.transaction.hash.toHexString()
  );

  clearStore();
});

test('Run AddresslistVoting (handleVotingSettingsUpdated) mappings with mock event', () => {
  // create state

  let addresslistVotingPlugin = new AddresslistVotingPlugin(pluginEntityId);
  addresslistVotingPlugin.dao = daoEntityId;
  addresslistVotingPlugin.pluginAddress = pluginAddress;
  addresslistVotingPlugin.save();

  // create event
  let event = createNewVotingSettingsUpdatedEvent(
    VOTING_MODE,
    SUPPORT_THRESHOLD,
    MIN_PARTICIPATION,
    MIN_DURATION,
    MIN_PROPOSER_VOTING_POWER,

    pluginEntityId
  );

  // handle event
  handleVotingSettingsUpdated(event);

  // checks
  assert.fieldEquals(
    'AddresslistVotingPlugin',
    pluginEntityId,
    'id',
    pluginEntityId
  );
  assert.fieldEquals(
    'AddresslistVotingPlugin',
    pluginEntityId,
    'votingMode',
    VOTING_MODES.get(parseInt(VOTING_MODE))
  );
  assert.fieldEquals(
    'AddresslistVotingPlugin',
    pluginEntityId,
    'supportThreshold',
    SUPPORT_THRESHOLD
  );
  assert.fieldEquals(
    'AddresslistVotingPlugin',
    pluginEntityId,
    'minParticipation',
    MIN_PARTICIPATION
  );
  assert.fieldEquals(
    'AddresslistVotingPlugin',
    pluginEntityId,
    'minDuration',
    MIN_DURATION
  );
  assert.fieldEquals(
    'AddresslistVotingPlugin',
    pluginEntityId,
    'minProposerVotingPower',
    MIN_PROPOSER_VOTING_POWER
  );

  clearStore();
});

test('Run AddresslistVoting (handleMembersAdded) mappings with mock event', () => {
  let userArray = [memberOneAddress, memberTwoAddress];

  // create event
  let event = createNewMembersAddedEvent(userArray, pluginEntityId);

  // handle event
  handleMembersAdded(event);

  // checks

  const memberEntityId = generateMemberEntityId(
    pluginAddress,
    memberOneAddress
  );

  assert.fieldEquals(
    'AddresslistVotingVoter',
    memberEntityId,
    'id',
    memberEntityId
  );
  assert.fieldEquals(
    'AddresslistVotingVoter',
    memberEntityId,
    'address',
    memberOneHexString
  );
  assert.fieldEquals(
    'AddresslistVotingVoter',
    memberEntityId,
    'plugin',
    pluginEntityId
  );

  clearStore();
});

test('Run AddresslistVoting (MembersRemoved) mappings with mock event', () => {
  // create state
  let memberAddresses = [memberOneAddress, memberTwoAddress];

  for (let index = 0; index < memberAddresses.length; index++) {
    const memberEntityId = generateMemberEntityId(
      pluginAddress,
      memberAddresses[index]
    );
    let userEntity = new AddresslistVotingVoter(memberEntityId);
    userEntity.plugin = pluginEntityId;
    userEntity.save();
  }

  // checks
  const memberEntityId1 = generateMemberEntityId(
    pluginAddress,
    memberAddresses[0]
  );
  const memberEntityId2 = generateMemberEntityId(
    pluginAddress,
    memberAddresses[1]
  );

  assert.fieldEquals(
    'AddresslistVotingVoter',
    memberEntityId1,
    'id',
    memberEntityId1
  );
  assert.fieldEquals(
    'AddresslistVotingVoter',
    memberEntityId2,
    'id',
    memberEntityId2
  );

  // create event
  let event = createNewMembersRemovedEvent(
    [memberAddresses[1]],
    CONTRACT_ADDRESS
  );

  // handle event
  handleMembersRemoved(event);

  // checks
  assert.fieldEquals(
    'AddresslistVotingVoter',
    memberEntityId1,
    'id',
    memberEntityId1
  );
  assert.notInStore('AddresslistVotingVoter', memberEntityId2);

  clearStore();
});
