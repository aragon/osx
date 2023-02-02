import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt, Bytes} from '@graphprotocol/graph-ts';

import {
  handleMembersAdded,
  handleVoteCast,
  handleProposalExecuted,
  handleMembersRemoved,
  handleVotingSettingsUpdated,
  _handleProposalCreated
} from '../../src/packages/addresslist/addresslist-voting';
import {
  AddresslistVotingPlugin,
  AddresslistVotingVoter
} from '../../generated/schema';
import {VOTING_MODES} from '../../src/utils/constants';
import {
  ADDRESS_ONE,
  ADDRESS_TWO,
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
  ALLOW_FAILURE_MAP
} from '../constants';
import {
  createDummyActions,
  createGetProposalCall,
  createTotalVotingPowerCall
} from '../utils';
import {
  createNewMembersAddedEvent,
  createNewVoteCastEvent,
  createNewProposalExecutedEvent,
  createNewMembersRemovedEvent,
  createNewProposalCreatedEvent,
  createNewVotingSettingsUpdatedEvent,
  getProposalCountCall,
  createAddresslistVotingProposalEntityState
} from './utils';

let proposalId = '0';
let actions = createDummyActions(DAO_TOKEN_ADDRESS, '0', '0x00000000');

test('Run AddresslistVoting (handleProposalCreated) mappings with mock event', () => {
  // create state
  let addresslistVotingPlugin = new AddresslistVotingPlugin(
    Address.fromString(CONTRACT_ADDRESS).toHexString()
  );
  addresslistVotingPlugin.dao = DAO_ADDRESS
  addresslistVotingPlugin.pluginAddress = Bytes.fromHexString(CONTRACT_ADDRESS)
  addresslistVotingPlugin.save();

  // create calls
  getProposalCountCall(CONTRACT_ADDRESS, '1');
  createGetProposalCall(
    CONTRACT_ADDRESS,
    proposalId,
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
    CONTRACT_ADDRESS,
    SNAPSHOT_BLOCK,
    TOTAL_VOTING_POWER
  );

  // create event
  let event = createNewProposalCreatedEvent(
    proposalId,
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

  let entityID =
    Address.fromString(CONTRACT_ADDRESS).toHexString() +
    '_' +
    BigInt.fromString(proposalId).toHexString();
  let packageId = Address.fromString(CONTRACT_ADDRESS).toHexString();

  // checks
  assert.fieldEquals('AddresslistVotingProposal', entityID, 'id', entityID);
  assert.fieldEquals('AddresslistVotingProposal', entityID, 'dao', DAO_ADDRESS);
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'plugin',
    packageId
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'proposalId',
    proposalId
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'creator',
    ADDRESS_ONE
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'metadata',
    STRING_DATA
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'creationBlockNumber',
    event.block.number.toString()
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'allowFailureMap',
    ALLOW_FAILURE_MAP
  );

  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'votingMode',
    VOTING_MODES.get(parseInt(VOTING_MODE))
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'supportThreshold',
    SUPPORT_THRESHOLD
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'minVotingPower',
    MIN_VOTING_POWER
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'startDate',
    START_DATE
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'endDate',
    END_DATE
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'snapshotBlock',
    SNAPSHOT_BLOCK
  );

  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'totalVotingPower',
    TOTAL_VOTING_POWER
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
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
    '2', // yes
    '1', // votingPower
    CONTRACT_ADDRESS
  );

  handleVoteCast(event);

  // checks
  let voteEntityID = ADDRESS_ONE + '_' + proposal.id;
  assert.fieldEquals('AddresslistVotingVote', voteEntityID, 'id', voteEntityID);
  assert.fieldEquals(
    'AddresslistVotingVote',
    voteEntityID,
    'voteReplaced',
    'false'
  );
  assert.fieldEquals(
    'AddresslistVotingVote',
    voteEntityID,
    'updatedAt',
    BigInt.zero().toString()
  );

  // check proposal
  assert.fieldEquals('AddresslistVotingProposal', proposal.id, 'yes', '1');
  // Check executable
  // abstain: 0, yes: 1, no: 0
  // support          : 100%
  // worstCaseSupport :  33%
  // participation    :  33%
  assert.fieldEquals(
    'AddresslistVotingProposal',
    proposal.id,
    'executable',
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
  assert.fieldEquals(
    'AddresslistVotingVote',
    voteEntityID,
    'voteReplaced',
    'true'
  );
  assert.fieldEquals(
    'AddresslistVotingVote',
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

  // create event
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
  assert.fieldEquals(
    'AddresslistVotingProposal',
    proposal.id,
    'executable',
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
  assert.notInStore('AddresslistVotingVote', entityID);

  clearStore();
});

test('Run AddresslistVoting (handleProposalExecuted) mappings with mock event', () => {
  // create state
  let entityID =
    Address.fromString(CONTRACT_ADDRESS).toHexString() + '_' + '0x0';
  createAddresslistVotingProposalEntityState(
    entityID,
    DAO_ADDRESS,
    CONTRACT_ADDRESS,
    ADDRESS_ONE
  );

  // create event
  let event = createNewProposalExecutedEvent('0', CONTRACT_ADDRESS);

  // handle event
  handleProposalExecuted(event);

  // checks
  assert.fieldEquals('AddresslistVotingProposal', entityID, 'id', entityID);
  assert.fieldEquals('AddresslistVotingProposal', entityID, 'executed', 'true');
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'executionDate',
    event.block.timestamp.toString()
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'executionBlockNumber',
    event.block.number.toString()
  );
  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'executionTxHash',
    event.transaction.hash.toHexString()
  );

  clearStore();
});

test('Run AddresslistVoting (handleVotingSettingsUpdated) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(CONTRACT_ADDRESS).toHexString();
  let addresslistVotingPlugin = new AddresslistVotingPlugin(entityID);
  addresslistVotingPlugin.dao = DAO_ADDRESS
  addresslistVotingPlugin.pluginAddress = Bytes.fromHexString(CONTRACT_ADDRESS)
  addresslistVotingPlugin.save();

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
  assert.fieldEquals('AddresslistVotingPlugin', entityID, 'id', entityID);
  assert.fieldEquals(
    'AddresslistVotingPlugin',
    entityID,
    'votingMode',
    VOTING_MODES.get(parseInt(VOTING_MODE))
  );
  assert.fieldEquals(
    'AddresslistVotingPlugin',
    entityID,
    'supportThreshold',
    SUPPORT_THRESHOLD
  );
  assert.fieldEquals(
    'AddresslistVotingPlugin',
    entityID,
    'minParticipation',
    MIN_PARTICIPATION
  );
  assert.fieldEquals(
    'AddresslistVotingPlugin',
    entityID,
    'minDuration',
    MIN_DURATION
  );
  assert.fieldEquals(
    'AddresslistVotingPlugin',
    entityID,
    'minProposerVotingPower',
    MIN_PROPOSER_VOTING_POWER
  );

  clearStore();
});

test('Run AddresslistVoting (handleMembersAdded) mappings with mock event', () => {
  let userArray = [
    Address.fromString(ADDRESS_ONE),
    Address.fromString(ADDRESS_TWO)
  ];

  // create event
  let event = createNewMembersAddedEvent(userArray, CONTRACT_ADDRESS);

  // handle event
  handleMembersAdded(event);

  // checks

  let memberId =
    Address.fromString(CONTRACT_ADDRESS).toHexString() +
    '_' +
    userArray[0].toHexString();

  assert.fieldEquals('AddresslistVotingVoter', memberId, 'id', memberId);
  assert.fieldEquals(
    'AddresslistVotingVoter',
    memberId,
    'address',
    userArray[0].toHexString()
  );
  assert.fieldEquals(
    'AddresslistVotingVoter',
    memberId,
    'plugin',
    Address.fromString(CONTRACT_ADDRESS).toHexString()
  );

  clearStore();
});

test('Run AddresslistVoting (MembersRemoved) mappings with mock event', () => {
  // create state
  let memberAddresses = [
    Address.fromString(ADDRESS_ONE),
    Address.fromString(ADDRESS_TWO)
  ];

  for (let index = 0; index < memberAddresses.length; index++) {
    const user = memberAddresses[index].toHexString();
    const pluginId = Address.fromString(CONTRACT_ADDRESS).toHexString();
    let memberId = pluginId + '_' + user;
    let userEntity = new AddresslistVotingVoter(memberId);
    userEntity.plugin = pluginId;
    userEntity.save();
  }

  // checks
  let memberId1 =
    Address.fromString(CONTRACT_ADDRESS).toHexString() +
    '_' +
    memberAddresses[0].toHexString();
  let memberId2 =
    Address.fromString(CONTRACT_ADDRESS).toHexString() +
    '_' +
    memberAddresses[1].toHexString();

  assert.fieldEquals('AddresslistVotingVoter', memberId1, 'id', memberId1);
  assert.fieldEquals('AddresslistVotingVoter', memberId2, 'id', memberId2);

  // create event
  let event = createNewMembersRemovedEvent(
    [memberAddresses[1]],
    CONTRACT_ADDRESS
  );

  // handle event
  handleMembersRemoved(event);

  // checks
  assert.fieldEquals('AddresslistVotingVoter', memberId1, 'id', memberId1);
  assert.notInStore('AddresslistVotingVoter', memberId2);

  clearStore();
});
