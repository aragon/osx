import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt} from '@graphprotocol/graph-ts';

import {
  handleAddressesAdded,
  handleVoteCast,
  handleProposalExecuted,
  handleAddressesRemoved,
  handleMajorityVotingSettingsUpdated,
  _handleProposalCreated
} from '../../src/packages/addresslist/addresslist-voting';
import {
  AddresslistVotingPlugin,
  AddresslistVotingVoter
} from '../../generated/schema';
import {VOTE_MODES} from '../../src/utils/constants';
import {
  ADDRESS_ONE,
  ADDRESS_TWO,
  DAO_TOKEN_ADDRESS,
  CONTRACT_ADDRESS,
  STRING_DATA,
  DAO_ADDRESS,
  PROPOSAL_ID,
  VOTE_MODE,
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
  createNewAddressesAddedEvent,
  createNewVoteCastEvent,
  createNewProposalExecutedEvent,
  createNewAddressesRemovedEvent,
  createNewProposalCreatedEvent,
  createNewMajorityVotingSettingsUpdatedEvent,
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
  addresslistVotingPlugin.save();

  // create calls
  getProposalCountCall(CONTRACT_ADDRESS, '1');
  createGetProposalCall(
    CONTRACT_ADDRESS,
    proposalId,
    true,
    false,

    // Configuration
    VOTE_MODE,
    SUPPORT_THRESHOLD,
    MIN_PARTICIPATION,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,

    // Tally
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
    'startDate',
    START_DATE
  );

  assert.fieldEquals(
    'AddresslistVotingProposal',
    entityID,
    'voteMode',
    VOTE_MODES.get(parseInt(VOTE_MODE))
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
    'minParticipation',
    MIN_PARTICIPATION
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

    // Configuration
    VOTE_MODE,
    SUPPORT_THRESHOLD,
    MIN_PARTICIPATION,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,

    // Tally
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
    '2', // yes
    '1', // votingPower
    CONTRACT_ADDRESS
  );

  handleVoteCast(event);

  // checks
  let entityID = ADDRESS_ONE + '_' + proposal.id;
  assert.fieldEquals('AddresslistVotingVote', entityID, 'id', entityID);

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
    'voteCount',
    '1'
  );

  // create calls
  createGetProposalCall(
    CONTRACT_ADDRESS,
    PROPOSAL_ID,
    true,
    false,

    VOTE_MODE,
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
    '1', // votingPower
    CONTRACT_ADDRESS
  );

  handleVoteCast(event2);

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
    'voteCount',
    '2'
  );

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

  clearStore();
});

test('Run AddresslistVoting (handleMajorityVotingSettingsUpdated) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(CONTRACT_ADDRESS).toHexString();
  let addresslistVotingPlugin = new AddresslistVotingPlugin(entityID);
  addresslistVotingPlugin.save();

  // create event
  let event = createNewMajorityVotingSettingsUpdatedEvent(
    VOTE_MODE,
    SUPPORT_THRESHOLD,
    MIN_PARTICIPATION,
    MIN_DURATION,
    MIN_PROPOSER_VOTING_POWER,

    CONTRACT_ADDRESS
  );

  // handle event
  handleMajorityVotingSettingsUpdated(event);

  // checks
  assert.fieldEquals('AddresslistVotingPlugin', entityID, 'id', entityID);
  assert.fieldEquals(
    'AddresslistVotingPlugin',
    entityID,
    'voteMode',
    VOTE_MODES.get(parseInt(VOTE_MODE))
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

test('Run AddresslistVoting (handleAddressesAdded) mappings with mock event', () => {
  let userArray = [
    Address.fromString(ADDRESS_ONE),
    Address.fromString(ADDRESS_TWO)
  ];

  // create event
  let event = createNewAddressesAddedEvent(userArray, CONTRACT_ADDRESS);

  // handle event
  handleAddressesAdded(event);

  // checks
  assert.fieldEquals(
    'AddresslistVotingVoter',
    userArray[0].toHexString(),
    'id',
    userArray[0].toHexString()
  );
  assert.fieldEquals(
    'AddresslistVotingVoter',
    userArray[0].toHexString(),
    'address',
    userArray[0].toHexString()
  );
  assert.fieldEquals(
    'AddresslistVotingVoter',
    userArray[0].toHexString(),
    'plugin',
    Address.fromString(CONTRACT_ADDRESS).toHexString()
  );

  clearStore();
});

test('Run AddresslistVoting (AddressesRemoved) mappings with mock event', () => {
  // create state
  let userArray = [
    Address.fromString(ADDRESS_ONE),
    Address.fromString(ADDRESS_TWO)
  ];

  for (let index = 0; index < userArray.length; index++) {
    const user = userArray[index];
    let userEntity = new AddresslistVotingVoter(user.toHexString());
    userEntity.plugin = Address.fromString(CONTRACT_ADDRESS).toHexString();
    userEntity.save();
  }

  // create event
  let event = createNewAddressesRemovedEvent([userArray[1]], CONTRACT_ADDRESS);

  // handle event
  handleAddressesRemoved(event);

  // checks
  assert.fieldEquals(
    'AddresslistVotingVoter',
    userArray[0].toHexString(),
    'id',
    userArray[0].toHexString()
  );
  assert.notInStore('AddresslistVotingVoter', userArray[1].toHexString());

  clearStore();
});
