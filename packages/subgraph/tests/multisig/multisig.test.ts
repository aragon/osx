import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt} from '@graphprotocol/graph-ts';

import {
  handleAddressesAdded,
  handleApproved,
  handleProposalExecuted,
  handleAddressesRemoved,
  handleMinApprovalUpdated,
  _handleProposalCreated
} from '../../src/packages/multisig/multisig';
import {MultisigPlugin, MultisigApprover} from '../../generated/schema';
import {
  ADDRESS_ONE,
  ADDRESS_TWO,
  DAO_TOKEN_ADDRESS,
  CONTRACT_ADDRESS,
  STRING_DATA,
  DAO_ADDRESS,
  PROPOSAL_ID,
  SNAPSHOT_BLOCK,
  TOTAL_VOTING_POWER,
  ONE,
  TWO,
  THREE,
  PROPOSAL_ENTITY_ID
} from '../constants';
import {createDummyActions} from '../utils';
import {
  createNewAddressesAddedEvent,
  createNewApprovedEvent,
  createNewProposalExecutedEvent,
  createNewAddressesRemovedEvent,
  createNewProposalCreatedEvent,
  createNewMinApprovalUpdatedEvent,
  getProposalCountCall,
  createMultisigProposalEntityState,
  createGetProposalCall
} from './utils';

let proposalId = '0';
let actions = createDummyActions(DAO_TOKEN_ADDRESS, '0', '0x00000000');

test('Run Multisig (handleProposalCreated) mappings with mock event', () => {
  // create state
  let multisigPlugin = new MultisigPlugin(
    Address.fromString(CONTRACT_ADDRESS).toHexString()
  );
  multisigPlugin.minApprovals = BigInt.fromString(THREE);
  multisigPlugin.save();

  // create calls
  getProposalCountCall(CONTRACT_ADDRESS, '1');
  createGetProposalCall(
    CONTRACT_ADDRESS,
    proposalId,
    true,
    false,

    // ProposalParameters
    ONE,
    SNAPSHOT_BLOCK,

    // Tally
    ONE,
    TOTAL_VOTING_POWER,

    actions
  );

  // create event
  let event = createNewProposalCreatedEvent(
    proposalId,
    ADDRESS_ONE,
    STRING_DATA,
    actions,
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
  assert.fieldEquals('MultisigProposal', entityID, 'id', entityID);
  assert.fieldEquals('MultisigProposal', entityID, 'dao', DAO_ADDRESS);
  assert.fieldEquals('MultisigProposal', entityID, 'plugin', packageId);
  assert.fieldEquals('MultisigProposal', entityID, 'proposalId', proposalId);
  assert.fieldEquals('MultisigProposal', entityID, 'creator', ADDRESS_ONE);
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
  assert.fieldEquals('MultisigProposal', entityID, 'open', 'true');
  assert.fieldEquals(
    'MultisigProposal',
    entityID,
    'snapshotBlock',
    SNAPSHOT_BLOCK
  );
  assert.fieldEquals('MultisigProposal', entityID, 'minApprovals', ONE);
  assert.fieldEquals(
    'MultisigProposal',
    entityID,
    'addresslistLength',
    TOTAL_VOTING_POWER
  );
  assert.fieldEquals('MultisigProposal', entityID, 'approvals', ONE);
  assert.fieldEquals('MultisigProposal', entityID, 'executed', 'false');

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
    proposalId,
    true,
    false,

    // ProposalParameters
    TWO, // minApprovals
    SNAPSHOT_BLOCK,

    // Tally
    ONE, // approvals
    TOTAL_VOTING_POWER,

    actions
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
  assert.fieldEquals('MultisigProposal', proposal.id, 'executable', 'false');
  assert.fieldEquals('MultisigProposal', proposal.id, 'approvals', ONE);

  // create 2nd approve, to test executable calculation, and approvals
  // create calls
  createGetProposalCall(
    CONTRACT_ADDRESS,
    PROPOSAL_ID,
    true,
    false,

    // ProposalParameters
    TWO, // minApprovals
    SNAPSHOT_BLOCK,

    // Tally
    TWO, // approvals
    TOTAL_VOTING_POWER,

    actions
  );

  // create event
  let event2 = createNewApprovedEvent(
    PROPOSAL_ID,
    ADDRESS_TWO,
    CONTRACT_ADDRESS
  );

  handleApproved(event2);

  // Check
  assert.fieldEquals('MultisigProposal', proposal.id, 'executable', 'true');
  assert.fieldEquals('MultisigProposal', proposal.id, 'approvals', TWO);

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

  clearStore();
});

test('Run Multisig (handleVotingSettingsUpdated) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(CONTRACT_ADDRESS).toHexString();
  let multisigPlugin = new MultisigPlugin(entityID);
  multisigPlugin.minApprovals = BigInt.fromString(THREE);
  multisigPlugin.save();

  // create event
  let event = createNewMinApprovalUpdatedEvent(THREE, CONTRACT_ADDRESS);

  // handle event
  handleMinApprovalUpdated(event);

  // checks
  assert.fieldEquals('MultisigPlugin', entityID, 'id', entityID);
  assert.fieldEquals('MultisigPlugin', entityID, 'minApprovals', THREE);

  clearStore();
});

test('Run Multisig (handleAddressesAdded) mappings with mock event', () => {
  let userArray = [
    Address.fromString(ADDRESS_ONE),
    Address.fromString(ADDRESS_TWO)
  ];

  // create event
  let event = createNewAddressesAddedEvent(userArray, CONTRACT_ADDRESS);

  // handle event
  handleAddressesAdded(event);

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

test('Run Multisig (AddressesRemoved) mappings with mock event', () => {
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
  let event = createNewAddressesRemovedEvent(
    [memberAddresses[1]],
    CONTRACT_ADDRESS
  );

  // handle event
  handleAddressesRemoved(event);

  // checks
  assert.fieldEquals('MultisigApprover', memberId1, 'id', memberId1);
  assert.notInStore('MultisigApprover', memberId2);

  clearStore();
});
