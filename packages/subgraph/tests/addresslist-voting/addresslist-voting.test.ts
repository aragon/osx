import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt} from '@graphprotocol/graph-ts';

import {
  handleAddressesAdded,
  handleVoteCast,
  handleProposalExecuted,
  handleAddressesRemoved,
  handleVoteSettingsUpdated,
  _handleProposalCreated
} from '../../src/packages/addresslist/addresslist-voting';
import {AddresslistPlugin, AddresslistVoter} from '../../generated/schema';
import {
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  VOTING_ADDRESS,
  STRING_DATA,
  DAO_ADDRESS,
  ADDRESS_TWO,
  PROPOSAL_ID,
  START_DATE,
  END_DATE,
  SNAPSHOT_BLOCK,
  SUPPORT_THRESHOLD,
  PARTICIPATION_THRESHOLD,
  VOTING_POWER
} from '../constants';
import {createDummyActions, createGetProposalCall} from '../utils';
import {
  createNewAddressesAddedEvent,
  createNewVoteCastEvent,
  createNewProposalExecutedEvent,
  createNewAddressesRemovedEvent,
  createNewProposalCreatedEvent,
  createNewVoteSettingsUpdatedEvent,
  getProposalCountCall,
  createAddresslistProposalEntityState
} from './utils';

let proposalId = '0';
let startDate = '1644851000';
let endDate = '1644852000';
let snapshotBlock = '100';
let supportThreshold = '1000';
let participationThreshold = '500';
let totalVotingPower = '1000';
let actions = createDummyActions(DAO_TOKEN_ADDRESS, '0', '0x00000000');

test('Run Addresslist Voting (handleProposalCreated) mappings with mock event', () => {
  // create state
  let addresslistPlugin = new AddresslistPlugin(
    Address.fromString(VOTING_ADDRESS).toHexString()
  );
  addresslistPlugin.save();

  // create calls
  getProposalCountCall(VOTING_ADDRESS, '1');
  createGetProposalCall(
    VOTING_ADDRESS,
    proposalId,
    true,
    false,
    startDate,
    endDate,
    snapshotBlock,
    supportThreshold,
    participationThreshold,
    totalVotingPower,
    '0',
    '0',
    '0',
    actions
  );

  // create event
  let event = createNewProposalCreatedEvent(
    proposalId,
    ADDRESS_ONE,
    STRING_DATA,
    VOTING_ADDRESS
  );

  // handle event
  _handleProposalCreated(event, DAO_ADDRESS, STRING_DATA);

  let entityID =
    Address.fromString(VOTING_ADDRESS).toHexString() +
    '_' +
    BigInt.fromString(proposalId).toHexString();
  let packageId = Address.fromString(VOTING_ADDRESS).toHexString();

  // checks
  assert.fieldEquals('AddresslistProposal', entityID, 'id', entityID);
  assert.fieldEquals('AddresslistProposal', entityID, 'dao', DAO_ADDRESS);
  assert.fieldEquals('AddresslistProposal', entityID, 'plugin', packageId);
  assert.fieldEquals('AddresslistProposal', entityID, 'proposalId', proposalId);
  assert.fieldEquals('AddresslistProposal', entityID, 'creator', ADDRESS_ONE);
  assert.fieldEquals('AddresslistProposal', entityID, 'metadata', STRING_DATA);
  assert.fieldEquals(
    'AddresslistProposal',
    entityID,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals('AddresslistProposal', entityID, 'startDate', startDate);
  assert.fieldEquals(
    'AddresslistProposal',
    entityID,
    'supportThreshold',
    supportThreshold
  );

  assert.fieldEquals('AddresslistProposal', entityID, 'executed', 'false');

  // chack AddresslistPlugin
  assert.fieldEquals(
    'AddresslistPlugin',
    Address.fromString(VOTING_ADDRESS).toHexString(),
    'proposalCount',
    '1'
  );

  clearStore();
});

test('Run Addresslist Voting (handleVoteCast) mappings with mock event', () => {
  // create state
  let proposal = createAddresslistProposalEntityState();

  // create calls
  createGetProposalCall(
    VOTING_ADDRESS,
    PROPOSAL_ID,
    true,
    false,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,
    SUPPORT_THRESHOLD,
    PARTICIPATION_THRESHOLD,
    VOTING_POWER,
    '1',
    '0',
    '0',
    actions
  );

  // create event
  let event = createNewVoteCastEvent(
    PROPOSAL_ID,
    ADDRESS_ONE,
    '2',
    '1',
    VOTING_ADDRESS
  );

  handleVoteCast(event);

  // checks
  let entityID = ADDRESS_ONE + '_' + proposal.id;
  assert.fieldEquals('AddresslistVote', entityID, 'id', entityID);

  // check proposal
  assert.fieldEquals('AddresslistProposal', proposal.id, 'yes', '1');
  // check executable
  // the total voting power is 3, currently total votes = 1
  // the min participation is 0.5; 0.33 <= 0.5 => false
  // currently yes = 1
  // the min support is 0.5; 1 >= 0.5 => true
  // is not executable
  assert.fieldEquals('AddresslistProposal', proposal.id, 'executable', 'false');
  // check vote count
  assert.fieldEquals('AddresslistProposal', proposal.id, 'voteCount', '1');
  // create calls
  createGetProposalCall(
    VOTING_ADDRESS,
    PROPOSAL_ID,
    true,
    false,
    START_DATE,
    END_DATE,
    SNAPSHOT_BLOCK,
    SUPPORT_THRESHOLD,
    PARTICIPATION_THRESHOLD,
    VOTING_POWER,
    '1',
    '0',
    '1',
    actions
  );
  // create event
  let event2 = createNewVoteCastEvent(
    PROPOSAL_ID,
    ADDRESS_ONE,
    '1', // abstain
    '1',
    VOTING_ADDRESS
  );

  handleVoteCast(event2);
  // check executable
  // the total voting power is 3, currently total votes = 2
  // the min participation is 0.5; 0.66 >= 0.5 => true
  // currently yes = 1, abstain = 1
  // the min support is 0.5; 0.5 >= 0.5 => true
  // is executable
  assert.fieldEquals('AddresslistProposal', proposal.id, 'executable', 'true');

  assert.fieldEquals('AddresslistProposal', proposal.id, 'voteCount', '2');

  clearStore();
});

test('Run Addresslist Voting (handleProposalExecuted) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString() + '_' + '0x0';
  createAddresslistProposalEntityState(
    entityID,
    DAO_ADDRESS,
    VOTING_ADDRESS,
    ADDRESS_ONE
  );

  // create event
  let event = createNewProposalExecutedEvent('0', VOTING_ADDRESS);

  // handle event
  handleProposalExecuted(event);

  // checks
  assert.fieldEquals('AddresslistProposal', entityID, 'id', entityID);
  assert.fieldEquals('AddresslistProposal', entityID, 'executed', 'true');

  clearStore();
});

test('Run Addresslist Voting (handleVoteSettingsUpdated) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(VOTING_ADDRESS).toHexString();
  let addresslistPlugin = new AddresslistPlugin(entityID);
  addresslistPlugin.save();

  // create event
  let event = createNewVoteSettingsUpdatedEvent(
    '2',
    '1',
    '3600',
    VOTING_ADDRESS
  );

  // handle event
  handleVoteSettingsUpdated(event);

  // checks
  assert.fieldEquals('AddresslistPlugin', entityID, 'id', entityID);
  assert.fieldEquals(
    'AddresslistPlugin',
    entityID,
    'participationThreshold',
    '2'
  );
  assert.fieldEquals('AddresslistPlugin', entityID, 'supportThreshold', '1');
  assert.fieldEquals('AddresslistPlugin', entityID, 'minDuration', '3600');

  clearStore();
});

test('Run Addresslist Voting (handleAddressesAdded) mappings with mock event', () => {
  let userArray = [
    Address.fromString(ADDRESS_ONE),
    Address.fromString(ADDRESS_TWO)
  ];

  // create event
  let event = createNewAddressesAddedEvent(userArray, VOTING_ADDRESS);

  // handle event
  handleAddressesAdded(event);

  // checks
  assert.fieldEquals(
    'AddresslistVoter',
    userArray[0].toHexString(),
    'id',
    userArray[0].toHexString()
  );
  assert.fieldEquals(
    'AddresslistVoter',
    userArray[0].toHexString(),
    'address',
    userArray[0].toHexString()
  );
  assert.fieldEquals(
    'AddresslistVoter',
    userArray[0].toHexString(),
    'plugin',
    Address.fromString(VOTING_ADDRESS).toHexString()
  );

  clearStore();
});

test('Run Addresslist Voting (AddressesRemoved) mappings with mock event', () => {
  // create state
  let userArray = [
    Address.fromString(ADDRESS_ONE),
    Address.fromString(ADDRESS_TWO)
  ];

  for (let index = 0; index < userArray.length; index++) {
    const user = userArray[index];
    let userEntity = new AddresslistVoter(user.toHexString());
    userEntity.plugin = Address.fromString(VOTING_ADDRESS).toHexString();
    userEntity.save();
  }

  // create event
  let event = createNewAddressesRemovedEvent([userArray[1]], VOTING_ADDRESS);

  // handle event
  handleAddressesRemoved(event);

  // checks
  assert.fieldEquals(
    'AddresslistVoter',
    userArray[0].toHexString(),
    'id',
    userArray[0].toHexString()
  );
  assert.notInStore('AddresslistVoter', userArray[1].toHexString());

  clearStore();
});
