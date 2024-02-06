import {AdminPlugin, Action, AdminProposal} from '../../generated/schema';
import {
  handleProposalExecuted,
  _handleProposalCreated,
} from '../../src/packages/admin/admin';
import {
  ADDRESS_ONE,
  ADDRESS_TWO,
  DAO_ADDRESS,
  STRING_DATA,
  PLUGIN_PROPOSAL_ID,
  CONTRACT_ADDRESS,
  START_DATE,
  ALLOW_FAILURE_MAP,
} from '../constants';
import {
  createNewProposalCreatedEvent,
  createProposalExecutedEvent,
} from './utils';
import {
  generateActionEntityId,
  generateDaoEntityId,
  generatePluginEntityId,
  generateProposalEntityId,
  createDummyAction,
} from '@aragon/osx-commons-subgraph';
import {Address, BigInt, Bytes} from '@graphprotocol/graph-ts';
import {assert, clearStore, test} from 'matchstick-as/assembly/index';

const actionValue = '0';
const actionData = '0x00000000';

const daoAddress = Address.fromString(DAO_ADDRESS);
const daoEntityId = generateDaoEntityId(daoAddress);
const pluginAddress = Address.fromString(CONTRACT_ADDRESS);
const pluginEntityId = generatePluginEntityId(pluginAddress);

test('Run Admin plugin (handleProposalCreated) mappings with mock event', () => {
  // create state
  let adminPlugin = new AdminPlugin(pluginEntityId);
  adminPlugin.dao = daoEntityId;
  adminPlugin.pluginAddress = pluginAddress;
  adminPlugin.save();

  // create event
  let actions = [createDummyAction(ADDRESS_TWO, actionValue, actionData)];
  let event = createNewProposalCreatedEvent(
    PLUGIN_PROPOSAL_ID,
    ADDRESS_ONE,
    START_DATE,
    START_DATE,
    STRING_DATA,
    actions,
    ALLOW_FAILURE_MAP,
    pluginEntityId
  );

  // handle event
  _handleProposalCreated(event, daoEntityId, STRING_DATA);

  let proposalEntityId = generateProposalEntityId(
    pluginAddress,
    BigInt.fromString(PLUGIN_PROPOSAL_ID)
  );

  // checks
  assert.fieldEquals('AdminProposal', proposalEntityId, 'id', proposalEntityId);
  assert.fieldEquals('AdminProposal', proposalEntityId, 'dao', daoEntityId);
  assert.fieldEquals(
    'AdminProposal',
    proposalEntityId,
    'plugin',
    pluginEntityId
  );
  assert.fieldEquals(
    'AdminProposal',
    proposalEntityId,
    'pluginProposalId',
    PLUGIN_PROPOSAL_ID
  );
  assert.fieldEquals('AdminProposal', proposalEntityId, 'creator', ADDRESS_ONE);
  assert.fieldEquals(
    'AdminProposal',
    proposalEntityId,
    'metadata',
    STRING_DATA
  );
  assert.fieldEquals('AdminProposal', proposalEntityId, 'executed', 'false');
  assert.fieldEquals(
    'AdminProposal',
    proposalEntityId,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals(
    'AdminProposal',
    proposalEntityId,
    'startDate',
    START_DATE
  );
  assert.fieldEquals('AdminProposal', proposalEntityId, 'endDate', START_DATE);
  assert.fieldEquals(
    'AdminProposal',
    proposalEntityId,
    'allowFailureMap',
    ALLOW_FAILURE_MAP
  );

  // check actions
  for (let index = 0; index < actions.length; index++) {
    const actionEntityId = generateActionEntityId(proposalEntityId, index);
    const actionEntity = Action.load(actionEntityId);
    if (actionEntity) {
      assert.fieldEquals('Action', actionEntityId, 'id', actionEntityId);
      assert.fieldEquals('Action', actionEntityId, 'to', ADDRESS_TWO);
      assert.fieldEquals('Action', actionEntityId, 'value', actionValue);
      assert.fieldEquals('Action', actionEntityId, 'data', actionData);
      assert.fieldEquals('Action', actionEntityId, 'dao', daoEntityId);
      assert.fieldEquals(
        'Action',
        actionEntityId,
        'proposal',
        proposalEntityId
      );
    }
  }

  clearStore();
});

test('Run Admin plugin (handleProposalExecuted) mappings with mock event', () => {
  // create state
  let adminPlugin = new AdminPlugin(pluginEntityId);
  adminPlugin.dao = daoEntityId;
  adminPlugin.pluginAddress = pluginAddress;
  adminPlugin.save();

  let proposalEntityId = generateProposalEntityId(
    pluginAddress,
    BigInt.fromString(PLUGIN_PROPOSAL_ID)
  );

  let administratorAddress = Address.fromString(ADDRESS_ONE);

  let adminProposal = new AdminProposal(proposalEntityId);
  adminProposal.dao = daoEntityId;
  adminProposal.plugin = pluginEntityId;
  adminProposal.pluginProposalId = BigInt.fromString(PLUGIN_PROPOSAL_ID);
  adminProposal.creator = administratorAddress;
  adminProposal.metadata = STRING_DATA;
  adminProposal.executed = false;
  adminProposal.createdAt = BigInt.fromString(START_DATE);
  adminProposal.startDate = BigInt.fromString(START_DATE);
  adminProposal.endDate = BigInt.fromString(START_DATE);
  adminProposal.allowFailureMap = BigInt.fromString(ALLOW_FAILURE_MAP);
  adminProposal.administrator = administratorAddress.toHexString();
  adminProposal.save();

  const actionEntityId = generateActionEntityId(proposalEntityId, 0);
  let action = new Action(actionEntityId);
  action.to = Address.fromString(ADDRESS_TWO);
  action.value = BigInt.fromString(actionValue);
  action.data = Bytes.fromHexString(actionData);
  action.dao = daoEntityId;
  action.proposal = proposalEntityId;
  action.save();

  // create event
  let event = createProposalExecutedEvent(PLUGIN_PROPOSAL_ID, pluginEntityId);

  // handle event
  handleProposalExecuted(event);

  // checks
  assert.fieldEquals('AdminProposal', proposalEntityId, 'id', proposalEntityId);
  assert.fieldEquals('AdminProposal', proposalEntityId, 'executed', 'true');
  assert.fieldEquals(
    'AdminProposal',
    proposalEntityId,
    'executionTxHash',
    event.transaction.hash.toHexString()
  );

  clearStore();
});
