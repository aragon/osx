import {MultisigApprover} from '../../generated/schema';
import {
  handleMembersAdded,
  handleApproved,
  handleProposalExecuted,
  handleMembersRemoved,
  _handleProposalCreated,
  handleMultisigSettingsUpdated,
} from '../../src/packages/multisig/multisig';
import {
  generateMemberEntityId,
  generateVoterEntityId,
} from '../../src/utils/ids';
import {
  ADDRESS_ONE,
  ADDRESS_TWO,
  DAO_TOKEN_ADDRESS,
  CONTRACT_ADDRESS,
  STRING_DATA,
  DAO_ADDRESS,
  PLUGIN_PROPOSAL_ID,
  SNAPSHOT_BLOCK,
  ONE,
  TWO,
  PROPOSAL_ENTITY_ID,
  START_DATE,
  END_DATE,
  ALLOW_FAILURE_MAP,
} from '../constants';
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
  createMultisigPluginState,
} from './utils';
import {
  generatePluginEntityId,
  generateProposalEntityId,
  createDummyAction,
} from '@aragon/osx-commons-subgraph';
import {Address, BigInt} from '@graphprotocol/graph-ts';
import {assert, clearStore, test} from 'matchstick-as/assembly/index';

let actions = [createDummyAction(DAO_TOKEN_ADDRESS, '0', '0x00000000')];

const pluginAddress = Address.fromString(CONTRACT_ADDRESS);
const pluginEntityId = generatePluginEntityId(pluginAddress);
const pluginProposalId = BigInt.fromString(PLUGIN_PROPOSAL_ID);

test('Run Multisig (handleProposalCreated) mappings with mock event', () => {
  // create state
  createMultisigPluginState();

  // create calls
  getProposalCountCall(CONTRACT_ADDRESS, '1');
  createGetProposalCall(
    CONTRACT_ADDRESS,
    PLUGIN_PROPOSAL_ID,
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
    PLUGIN_PROPOSAL_ID,
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

  let proposalEntityId = generateProposalEntityId(
    pluginAddress,
    pluginProposalId
  );

  // checks
  assert.fieldEquals(
    'MultisigProposal',
    proposalEntityId,
    'id',
    proposalEntityId
  );
  assert.fieldEquals('MultisigProposal', proposalEntityId, 'dao', DAO_ADDRESS);
  assert.fieldEquals(
    'MultisigProposal',
    proposalEntityId,
    'plugin',
    pluginEntityId
  );
  assert.fieldEquals(
    'MultisigProposal',
    proposalEntityId,
    'pluginProposalId',
    PLUGIN_PROPOSAL_ID
  );
  assert.fieldEquals(
    'MultisigProposal',
    proposalEntityId,
    'creator',
    ADDRESS_ONE
  );
  assert.fieldEquals(
    'MultisigProposal',
    proposalEntityId,
    'startDate',
    START_DATE
  );
  assert.fieldEquals('MultisigProposal', proposalEntityId, 'endDate', END_DATE);
  assert.fieldEquals(
    'MultisigProposal',
    proposalEntityId,
    'metadata',
    STRING_DATA
  );
  assert.fieldEquals(
    'MultisigProposal',
    proposalEntityId,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals(
    'MultisigProposal',
    proposalEntityId,
    'creationBlockNumber',
    event.block.number.toString()
  );
  assert.fieldEquals(
    'MultisigProposal',
    proposalEntityId,
    'snapshotBlock',
    SNAPSHOT_BLOCK
  );
  assert.fieldEquals('MultisigProposal', proposalEntityId, 'minApprovals', ONE);
  assert.fieldEquals(
    'MultisigProposal',
    proposalEntityId,
    'approvalCount',
    ONE
  );
  assert.fieldEquals('MultisigProposal', proposalEntityId, 'executed', 'false');
  assert.fieldEquals(
    'MultisigProposal',
    proposalEntityId,
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
    PLUGIN_PROPOSAL_ID,
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
    PLUGIN_PROPOSAL_ID,
    ADDRESS_ONE,
    CONTRACT_ADDRESS
  );

  handleApproved(event);

  // checks
  const memberAddress = Address.fromString(ADDRESS_ONE);

  const memberEntityId = generateMemberEntityId(pluginAddress, memberAddress);

  const voterEntityId = generateVoterEntityId(memberEntityId, proposal.id);
  // check proposalVoter
  assert.fieldEquals(
    'MultisigProposalApproval',
    voterEntityId,
    'id',
    voterEntityId
  );
  assert.fieldEquals(
    'MultisigProposalApproval',
    voterEntityId,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals(
    'MultisigProposalApproval',
    voterEntityId,
    'approver',
    memberEntityId
  );
  assert.fieldEquals(
    'MultisigProposalApproval',
    voterEntityId,
    'proposal',
    proposal.id
  );

  // check proposal
  assert.fieldEquals('MultisigProposal', proposal.id, 'approvalCount', ONE);
  assert.fieldEquals(
    'MultisigProposal',
    proposal.id,
    'approvalReached',
    'false'
  );

  // create 2nd approve, to test approvals
  // create calls
  createGetProposalCall(
    CONTRACT_ADDRESS,
    PLUGIN_PROPOSAL_ID,
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
    PLUGIN_PROPOSAL_ID,
    ADDRESS_TWO,
    CONTRACT_ADDRESS
  );

  handleApproved(event2);

  // Check
  assert.fieldEquals('MultisigProposal', proposal.id, 'approvalCount', TWO);
  assert.fieldEquals(
    'MultisigProposal',
    proposal.id,
    'approvalReached',
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
    Address.fromString(ADDRESS_TWO),
  ];

  // create event
  let event = createNewMembersAddedEvent(userArray, CONTRACT_ADDRESS);

  // handle event
  handleMembersAdded(event);

  // checks
  let memberId = generateMemberEntityId(
    Address.fromString(CONTRACT_ADDRESS),
    userArray[0]
  );

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
  assert.fieldEquals('MultisigApprover', memberId, 'isActive', 'true');

  clearStore();
});

test('Run Multisig (handleMembersRemoved) mappings with mock event', () => {
  // create state
  let memberAddresses = [
    Address.fromString(ADDRESS_ONE),
    Address.fromString(ADDRESS_TWO),
  ];
  let pluginAddress = Address.fromString(CONTRACT_ADDRESS);
  // create approvers
  for (let index = 0; index < memberAddresses.length; index++) {
    let memberId = generateMemberEntityId(
      pluginAddress,
      memberAddresses[index]
    );
    let approverEntity = new MultisigApprover(memberId);
    approverEntity.plugin = pluginAddress.toHexString();
    approverEntity.address = memberAddresses[index];
    approverEntity.isActive = true;
    approverEntity.save();
  }

  // checks
  let memberId1 = generateMemberEntityId(pluginAddress, memberAddresses[0]);
  let memberId2 = generateMemberEntityId(pluginAddress, memberAddresses[1]);

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
  assert.fieldEquals('MultisigApprover', memberId1, 'isActive', 'true');
  assert.fieldEquals('MultisigApprover', memberId2, 'id', memberId2);
  assert.fieldEquals('MultisigApprover', memberId2, 'isActive', 'false');
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
