import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt} from '@graphprotocol/graph-ts';

import {
  handleMembersAdded,
  handleApproved,
  handleProposalExecuted,
  handleMembersRemoved,
  _handleProposalCreated,
  handleMultisigSettingsUpdated
} from '../../src/packages/multisig/multisig';
import {MultisigApprover} from '../../generated/schema';
import {
  ADDRESS_ONE,
  ADDRESS_TWO,
  DAO_TOKEN_ADDRESS,
  CONTRACT_ADDRESS,
  STRING_DATA,
  DAO_ADDRESS,
  PROPOSAL_ID,
  SNAPSHOT_BLOCK,
  ONE,
  TWO,
  PROPOSAL_ENTITY_ID,
  START_DATE,
  END_DATE,
  ALLOW_FAILURE_MAP
} from '../constants';
import {createDummyActions} from '../utils';
import {
  createNewMembersAddedEvent,
  createNewApprovedEvent,
  createNewProposalExecutedEvent,
  createNewMembersRemovedEvent,
  createNewProposalCreatedEvent,
  getProposalCountCall,
  createMultisigProposalEntityState,
  createGetProposalCall,
  createNewMultisigSettingsUpdatedEvent,
  createMultisigPluginState
} from './utils';
import {getProposalId} from '../../src/utils/proposals';

let actions = createDummyActions(DAO_TOKEN_ADDRESS, '0', '0x00000000');

test('Run Multisig (handleProposalCreated) mappings with mock event', () => {
  // create state
  createMultisigPluginState();

  // create calls
  getProposalCountCall(CONTRACT_ADDRESS, '1');
  createGetProposalCall(
    CONTRACT_ADDRESS,
    PROPOSAL_ID,
    false,

    // ProposalParameters
    START_DATE,
    END_DATE,
    ONE,
    SNAPSHOT_BLOCK,

    // approvals
    ONE,

    actions,

    ALLOW_FAILURE_MAP
  );

  // create event
  let event = createNewProposalCreatedEvent(
    PROPOSAL_ID,
    ADDRESS_ONE,
    START_DATE,
    END_DATE,
    STRING_DATA,
    actions,
    ALLOW_FAILURE_MAP,
    CONTRACT_ADDRESS
  );

  // handle event
  _handleProposalCreated(event, DAO_ADDRESS, STRING_DATA);

  let entityID = getProposalId(
    Address.fromString(CONTRACT_ADDRESS),
    BigInt.fromString(PROPOSAL_ID)
  );

  let packageId = Address.fromString(CONTRACT_ADDRESS).toHexString();

  // checks
  assert.fieldEquals('MultisigProposal', entityID, 'id', entityID);
  assert.fieldEquals('MultisigProposal', entityID, 'dao', DAO_ADDRESS);
  assert.fieldEquals('MultisigProposal', entityID, 'plugin', packageId);
  assert.fieldEquals('MultisigProposal', entityID, 'proposalId', PROPOSAL_ID);
  assert.fieldEquals('MultisigProposal', entityID, 'creator', ADDRESS_ONE);
  assert.fieldEquals('MultisigProposal', entityID, 'startDate', START_DATE);
  assert.fieldEquals('MultisigProposal', entityID, 'endDate', END_DATE);
  assert.fieldEquals('MultisigProposal', entityID, 'metadata', STRING_DATA);
  assert.fieldEquals(
    'MultisigProposal',
    entityID,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals(
    'MultisigProposal',
    entityID,
    'creationBlockNumber',
    event.block.number.toString()
  );
  assert.fieldEquals(
    'MultisigProposal',
    entityID,
    'snapshotBlock',
    SNAPSHOT_BLOCK
  );
  assert.fieldEquals('MultisigProposal', entityID, 'minApprovals', ONE);
  assert.fieldEquals('MultisigProposal', entityID, 'approvals', ONE);
  assert.fieldEquals('MultisigProposal', entityID, 'executed', 'false');
  assert.fieldEquals(
    'MultisigProposal',
    entityID,
    'allowFailureMap',
    ALLOW_FAILURE_MAP
  );

  // check MultisigPlugin
  assert.fieldEquals(
    'MultisigPlugin',
    Address.fromString(CONTRACT_ADDRESS).toHexString(),
    'proposalCount',
    '1'
  );

  clearStore();
});

test('Run Multisig (handleApproved) mappings with mock event', () => {
  // create state
  let proposal = createMultisigProposalEntityState(
    PROPOSAL_ENTITY_ID,
    DAO_ADDRESS,
    CONTRACT_ADDRESS,
    ADDRESS_ONE
  );

  // create calls
  createGetProposalCall(
    CONTRACT_ADDRESS,
    PROPOSAL_ID,
    false,

    // ProposalParameters
    START_DATE,
    END_DATE,
    TWO, // minApprovals
    SNAPSHOT_BLOCK,

    // approvals
    ONE,

    actions,
    ALLOW_FAILURE_MAP
  );

  // create event
  let event = createNewApprovedEvent(
    PROPOSAL_ID,
    ADDRESS_ONE,
    CONTRACT_ADDRESS
  );

  handleApproved(event);

  // checks
  const member = Address.fromString(ADDRESS_ONE).toHexString();
  const pluginId = Address.fromString(CONTRACT_ADDRESS).toHexString();
  const memberId = pluginId + '_' + member;

  // check proposalVoter
  let proposalVoterId = member + '_' + proposal.id;
  assert.fieldEquals(
    'MultisigProposalApprover',
    proposalVoterId,
    'id',
    proposalVoterId
  );
  assert.fieldEquals(
    'MultisigProposalApprover',
    proposalVoterId,
    'approver',
    memberId
  );
  assert.fieldEquals(
    'MultisigProposalApprover',
    proposalVoterId,
    'proposal',
    proposal.id
  );
  assert.fieldEquals(
    'MultisigProposalApprover',
    proposalVoterId,
    'createdAt',
    event.block.timestamp.toString()
  );

  // check proposal
  assert.fieldEquals('MultisigProposal', proposal.id, 'approvals', ONE);
  assert.fieldEquals(
    'MultisigProposal',
    proposal.id,
    'potentiallyExecutable',
    'false'
  );

  // create 2nd approve, to test approvals
  // create calls
  createGetProposalCall(
    CONTRACT_ADDRESS,
    PROPOSAL_ID,
    false,

    // ProposalParameters
    START_DATE,
    END_DATE,
    TWO, // minApprovals
    SNAPSHOT_BLOCK,

    // approvals
    TWO,

    actions,
    ALLOW_FAILURE_MAP
  );

  // create event
  let event2 = createNewApprovedEvent(
    PROPOSAL_ID,
    ADDRESS_TWO,
    CONTRACT_ADDRESS
  );

  handleApproved(event2);

  // Check
  assert.fieldEquals('MultisigProposal', proposal.id, 'approvals', TWO);
  assert.fieldEquals(
    'MultisigProposal',
    proposal.id,
    'potentiallyExecutable',
    'true'
  );

  clearStore();
});

test('Run Multisig (handleProposalExecuted) mappings with mock event', () => {
  // create state
  createMultisigProposalEntityState(
    PROPOSAL_ENTITY_ID,
    DAO_ADDRESS,
    CONTRACT_ADDRESS,
    ADDRESS_ONE
  );

  // create event
  let event = createNewProposalExecutedEvent('0', CONTRACT_ADDRESS);

  // handle event
  handleProposalExecuted(event);

  // checks
  assert.fieldEquals(
    'MultisigProposal',
    PROPOSAL_ENTITY_ID,
    'id',
    PROPOSAL_ENTITY_ID
  );
  assert.fieldEquals(
    'MultisigProposal',
    PROPOSAL_ENTITY_ID,
    'executed',
    'true'
  );
  assert.fieldEquals(
    'MultisigProposal',
    PROPOSAL_ENTITY_ID,
    'executionDate',
    event.block.timestamp.toString()
  );
  assert.fieldEquals(
    'MultisigProposal',
    PROPOSAL_ENTITY_ID,
    'executionBlockNumber',
    event.block.number.toString()
  );
  assert.fieldEquals(
    'MultisigProposal',
    PROPOSAL_ENTITY_ID,
    'executionTxHash',
    event.transaction.hash.toHexString()
  );

  clearStore();
});

test('Run Multisig (handleMembersAdded) mappings with mock event', () => {
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

  assert.fieldEquals('MultisigApprover', memberId, 'id', memberId);
  assert.fieldEquals(
    'MultisigApprover',
    memberId,
    'address',
    userArray[0].toHexString()
  );
  assert.fieldEquals(
    'MultisigApprover',
    memberId,
    'plugin',
    Address.fromString(CONTRACT_ADDRESS).toHexString()
  );

  clearStore();
});

test('Run Multisig (handleMembersRemoved) mappings with mock event', () => {
  // create state
  let memberAddresses = [
    Address.fromString(ADDRESS_ONE),
    Address.fromString(ADDRESS_TWO)
  ];

  for (let index = 0; index < memberAddresses.length; index++) {
    const user = memberAddresses[index].toHexString();
    const pluginId = Address.fromString(CONTRACT_ADDRESS).toHexString();
    let memberId = pluginId + '_' + user;
    let userEntity = new MultisigApprover(memberId);
    userEntity.plugin = Address.fromString(CONTRACT_ADDRESS).toHexString();
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

  assert.fieldEquals('MultisigApprover', memberId1, 'id', memberId1);
  assert.fieldEquals('MultisigApprover', memberId2, 'id', memberId2);

  // create event
  let event = createNewMembersRemovedEvent(
    [memberAddresses[1]],
    CONTRACT_ADDRESS
  );

  // handle event
  handleMembersRemoved(event);

  // checks
  assert.fieldEquals('MultisigApprover', memberId1, 'id', memberId1);
  assert.notInStore('MultisigApprover', memberId2);

  clearStore();
});

test('Run Multisig (handleMultisigSettingsUpdated) mappings with mock event', () => {
  // create state
  let entityID = createMultisigPluginState().id;

  // create event
  let onlyListed = true;
  let minApproval = '5';

  let event = createNewMultisigSettingsUpdatedEvent(
    onlyListed,
    minApproval,
    CONTRACT_ADDRESS
  );

  // handle event
  handleMultisigSettingsUpdated(event);

  // checks
  assert.fieldEquals('MultisigPlugin', entityID, 'onlyListed', `${onlyListed}`);
  assert.fieldEquals('MultisigPlugin', entityID, 'minApprovals', minApproval);

  // create event
  onlyListed = false;
  minApproval = '4';

  event = createNewMultisigSettingsUpdatedEvent(
    onlyListed,
    minApproval,
    CONTRACT_ADDRESS
  );

  // handle event
  handleMultisigSettingsUpdated(event);

  // checks
  assert.fieldEquals('MultisigPlugin', entityID, 'onlyListed', `${onlyListed}`);
  assert.fieldEquals('MultisigPlugin', entityID, 'minApprovals', minApproval);

  clearStore();
});
