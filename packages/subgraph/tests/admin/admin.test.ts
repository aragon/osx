import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt, Bytes} from '@graphprotocol/graph-ts';

import {AdminPlugin, Action, AdminProposal} from '../../generated/schema';

import {
  ADDRESS_ONE,
  ADDRESS_TWO,
  DAO_ADDRESS,
  STRING_DATA,
  PROPOSAL_ID,
  CONTRACT_ADDRESS,
  START_DATE,
  ALLOW_FAILURE_MAP,
  PROPOSAL_ENTITY_ID,
  ZERO
} from '../constants';
import {createDummyActions} from '../utils';
import {
  createNewProposalCreatedEvent,
  createProposalExecutedEvent
} from './utils';

import {
  handleProposalExecuted,
  _handleProposalCreated
} from '../../src/packages/admin/admin';
import {getProposalId} from '../../src/utils/proposals';

const actionValue = '0';
const actionData = '0x00000000';

test('Run Admin plugin (handleProposalCreated) mappings with mock event', () => {
  // create state
  let pluginId = Address.fromString(CONTRACT_ADDRESS).toHexString();
  let adminPlugin = new AdminPlugin(pluginId);
  adminPlugin.dao = DAO_ADDRESS;
  adminPlugin.pluginAddress = Bytes.fromHexString(CONTRACT_ADDRESS);
  adminPlugin.save();

  // create event
  let actions = createDummyActions(ADDRESS_TWO, actionValue, actionData);
  let event = createNewProposalCreatedEvent(
    PROPOSAL_ID,
    ADDRESS_ONE,
    START_DATE,
    START_DATE,
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

  // checks
  assert.fieldEquals('AdminProposal', entityID, 'id', entityID);
  assert.fieldEquals('AdminProposal', entityID, 'dao', DAO_ADDRESS);
  assert.fieldEquals('AdminProposal', entityID, 'plugin', pluginId);
  assert.fieldEquals('AdminProposal', entityID, 'proposalId', PROPOSAL_ID);
  assert.fieldEquals('AdminProposal', entityID, 'creator', ADDRESS_ONE);
  assert.fieldEquals('AdminProposal', entityID, 'metadata', STRING_DATA);
  assert.fieldEquals('AdminProposal', entityID, 'executed', 'false');
  assert.fieldEquals(
    'AdminProposal',
    entityID,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals('AdminProposal', entityID, 'startDate', START_DATE);
  assert.fieldEquals('AdminProposal', entityID, 'endDate', START_DATE);
  assert.fieldEquals(
    'AdminProposal',
    entityID,
    'allowFailureMap',
    ALLOW_FAILURE_MAP
  );

  // check actions
  for (let index = 0; index < actions.length; index++) {
    const actionId =
      CONTRACT_ADDRESS + '_' + PROPOSAL_ID + '_' + index.toString();
    const actionEntity = Action.load(actionId);
    if (actionEntity) {
      assert.fieldEquals('Action', actionId, 'id', actionId);
      assert.fieldEquals('Action', actionId, 'to', ADDRESS_TWO);
      assert.fieldEquals('Action', actionId, 'value', actionValue);
      assert.fieldEquals('Action', actionId, 'data', actionData);
      assert.fieldEquals('Action', actionId, 'dao', DAO_ADDRESS);
      assert.fieldEquals('Action', actionId, 'proposal', PROPOSAL_ID);
    }
  }

  clearStore();
});

test('Run Admin plugin (handleProposalExecuted) mappings with mock event', () => {
  // create state
  let pluginId = Address.fromString(CONTRACT_ADDRESS).toHexString();
  let adminPlugin = new AdminPlugin(pluginId);
  adminPlugin.dao = DAO_ADDRESS;
  adminPlugin.pluginAddress = Bytes.fromHexString(CONTRACT_ADDRESS);
  adminPlugin.save();

  let entityID = getProposalId(
    Address.fromString(CONTRACT_ADDRESS),
    BigInt.fromString(PROPOSAL_ID)
  );

  let administratorAddress = Address.fromString(ADDRESS_ONE);

  let adminProposal = new AdminProposal(entityID);
  adminProposal.dao = DAO_ADDRESS;
  adminProposal.plugin = pluginId;
  adminProposal.proposalId = BigInt.fromString(PROPOSAL_ID);
  adminProposal.creator = administratorAddress;
  adminProposal.metadata = STRING_DATA;
  adminProposal.executed = false;
  adminProposal.createdAt = BigInt.fromString(START_DATE);
  adminProposal.startDate = BigInt.fromString(START_DATE);
  adminProposal.endDate = BigInt.fromString(START_DATE);
  adminProposal.allowFailureMap = BigInt.fromString(ALLOW_FAILURE_MAP);
  adminProposal.administrator = administratorAddress.toHexString();
  adminProposal.save();

  const actionId = PROPOSAL_ENTITY_ID.concat('_').concat(ZERO);
  let action = new Action(actionId);
  action.to = Address.fromString(ADDRESS_TWO);
  action.value = BigInt.fromString(actionValue);
  action.data = Bytes.fromHexString(actionData);
  action.dao = DAO_ADDRESS;
  action.proposal = entityID;
  action.save();

  // create event
  let event = createProposalExecutedEvent(PROPOSAL_ID, CONTRACT_ADDRESS);

  // handle event
  handleProposalExecuted(event);

  // checks
  assert.fieldEquals('AdminProposal', entityID, 'id', entityID);
  assert.fieldEquals('AdminProposal', entityID, 'executed', 'true');
  assert.fieldEquals(
    'AdminProposal',
    entityID,
    'executionTxHash',
    event.transaction.hash.toHexString()
  );

  clearStore();
});
