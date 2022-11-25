import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt, Bytes, log} from '@graphprotocol/graph-ts';

import {AdminPlugin, Action, AdminProposal} from '../../generated/schema';

import {
  ADDRESS_ONE,
  ADDRESS_TWO,
  DAO_ADDRESS,
  ONE_ETH,
  STRING_DATA,
  VOTE_ID,
  VOTING_ADDRESS
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

const actionValue = '0';
const actionData = '0x00000000';

test('Run Admin plugin (handleProposalCreated) mappings with mock event', () => {
  // create state
  let pluginId = Address.fromString(VOTING_ADDRESS).toHexString();
  let adminPlugin = new AdminPlugin(pluginId);
  adminPlugin.save();

  // create event
  let actions = createDummyActions(ADDRESS_TWO, actionValue, actionData);
  let event = createNewProposalCreatedEvent(
    VOTE_ID,
    ADDRESS_ONE,
    STRING_DATA,
    actions,
    VOTING_ADDRESS
  );

  // handle event
  _handleProposalCreated(event, DAO_ADDRESS, STRING_DATA);

  let entityID =
    Address.fromString(VOTING_ADDRESS).toHexString() +
    '_' +
    BigInt.fromString(VOTE_ID).toHexString();

  // checks
  assert.fieldEquals('AdminProposal', entityID, 'id', entityID);
  assert.fieldEquals('AdminProposal', entityID, 'dao', DAO_ADDRESS);
  assert.fieldEquals('AdminProposal', entityID, 'plugin', pluginId);
  assert.fieldEquals('AdminProposal', entityID, 'proposalId', VOTE_ID);
  assert.fieldEquals('AdminProposal', entityID, 'creator', ADDRESS_ONE);
  assert.fieldEquals('AdminProposal', entityID, 'metadata', STRING_DATA);
  assert.fieldEquals('AdminProposal', entityID, 'executed', 'false');
  assert.fieldEquals(
    'AdminProposal',
    entityID,
    'createdAt',
    event.block.timestamp.toString()
  );

  // check actions
  for (let index = 0; index < actions.length; index++) {
    const actionId = VOTING_ADDRESS + '_' + VOTE_ID + '_' + index.toString();
    const actionEntity = Action.load(actionId);
    if (actionEntity) {
      assert.fieldEquals('Action', actionId, 'id', actionId);
      assert.fieldEquals('Action', actionId, 'to', ADDRESS_TWO);
      assert.fieldEquals('Action', actionId, 'value', actionValue);
      assert.fieldEquals('Action', actionId, 'data', actionData);
      assert.fieldEquals('Action', actionId, 'dao', DAO_ADDRESS);
      assert.fieldEquals('Action', actionId, 'proposal', VOTE_ID);
    }
  }

  clearStore();
});

test('Run Admin plugin (handleProposalExecuted) mappings with mock event', () => {
  // create state
  let pluginId = Address.fromString(VOTING_ADDRESS).toHexString();
  let adminPlugin = new AdminPlugin(pluginId);
  adminPlugin.save();

  let entityID =
    Address.fromString(VOTING_ADDRESS).toHexString() +
    '_' +
    BigInt.fromString(VOTE_ID).toHexString();

  let adminProposal = new AdminProposal(entityID);
  adminProposal.dao = DAO_ADDRESS;
  adminProposal.plugin = pluginId;
  adminProposal.proposalId = BigInt.fromString(VOTE_ID);
  adminProposal.creator = ADDRESS_ONE;
  adminProposal.metadata = STRING_DATA;
  adminProposal.executed = false;
  adminProposal.createdAt = BigInt.fromString(ONE_ETH);
  adminProposal.save();

  const actionId = VOTING_ADDRESS + '_' + VOTE_ID + '_' + VOTE_ID;
  let action = new Action(actionId);
  action.to = Address.fromString(ADDRESS_TWO);
  action.value = BigInt.fromString(actionValue);
  action.data = Bytes.fromHexString(actionData);
  action.dao = DAO_ADDRESS;
  action.proposal = entityID;
  action.save();

  // create event
  let event = createProposalExecutedEvent(VOTE_ID, ['0x'], VOTING_ADDRESS);

  // handle event
  handleProposalExecuted(event);

  // checks
  assert.fieldEquals('AdminProposal', entityID, 'id', entityID);
  assert.fieldEquals('AdminProposal', entityID, 'executed', 'true');

  clearStore();
});
