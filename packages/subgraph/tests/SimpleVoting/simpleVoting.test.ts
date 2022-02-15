import {assert, clearStore, test, logStore} from 'matchstick-as/assembly/index';
import {Address, BigInt} from '@graphprotocol/graph-ts';
import {EVPackage, EVProposal} from '../../generated/schema';
import {
  addressOne,
  daiAddress,
  votingAddress,
  dataString,
  daoAddress
} from '../constants';
import {
  createDummyAcctions,
  createGetVoteCall,
  createNewCastVoteEvent,
  createNewExecuteVoteEvent,
  createNewStartVoteEvent,
  createNewUpdateConfigEvent,
  getVotesLengthCall
} from './utils';
import {
  handleCastVote,
  handleExecuteVote,
  handleUpdateConfig,
  _handleStartVote
} from '../../src/packages/SimpleVoting/simpleVoting';

test('Run ERC Voting (handleStartVote) mappings with mock event', () => {
  // create state
  let evPackage = new EVPackage(
    Address.fromString(votingAddress).toHexString()
  );
  evPackage.save();

  // create calls
  let voteId = '0';
  let startDate = '1644851000';
  let snapshotBlock = '100';
  let supportRequiredPct = '1000';
  let minAcceptQuorumPct = '500';
  let votingPower = '1000';
  getVotesLengthCall(votingAddress, '1');
  let actions = createDummyAcctions(daiAddress, '0', '0x00000000');
  createGetVoteCall(
    votingAddress,
    voteId,
    true,
    false,
    startDate,
    snapshotBlock,
    supportRequiredPct,
    minAcceptQuorumPct,
    '0',
    '0',
    votingPower,
    actions
  );

  // create event
  let event = createNewStartVoteEvent(
    voteId,
    addressOne,
    dataString,
    votingAddress
  );

  // handle event
  _handleStartVote(event, daoAddress);

  let entityID =
    Address.fromString(votingAddress).toHexString() +
    '_' +
    BigInt.fromString(voteId).toHexString();
  let packageId = Address.fromString(votingAddress).toHexString();

  // checks
  assert.fieldEquals('EVProposal', entityID, 'id', entityID);
  assert.fieldEquals('EVProposal', entityID, 'dao', daoAddress);
  assert.fieldEquals('EVProposal', entityID, 'pkg', packageId);
  assert.fieldEquals('EVProposal', entityID, 'evPkg', packageId);
  assert.fieldEquals('EVProposal', entityID, 'voteId', voteId);
  assert.fieldEquals('EVProposal', entityID, 'creator', addressOne);
  assert.fieldEquals('EVProposal', entityID, 'description', dataString);
  assert.fieldEquals(
    'EVProposal',
    entityID,
    'createdAt',
    event.block.timestamp.toString()
  );
  assert.fieldEquals('EVProposal', entityID, 'startDate', startDate);
  assert.fieldEquals('EVProposal', entityID, 'snapshotBlock', snapshotBlock);
  assert.fieldEquals(
    'EVProposal',
    entityID,
    'supportRequiredPct',
    supportRequiredPct
  );
  assert.fieldEquals(
    'EVProposal',
    entityID,
    'minAcceptQuorumPct',
    minAcceptQuorumPct
  );
  assert.fieldEquals('EVProposal', entityID, 'votingPower', votingPower);
  assert.fieldEquals('EVProposal', entityID, 'executed', 'false');

  // chack EVPackage
  assert.fieldEquals(
    'EVPackage',
    Address.fromString(votingAddress).toHexString(),
    'votesLength',
    '1'
  );

  clearStore();
});

test('Run ERC Voting (handleCastVote) mappings with mock event', () => {
  // create state
  let proposalId =
    Address.fromString(votingAddress).toHexString() + '_' + '0x0';
  let evProposal = new EVProposal(proposalId);
  evProposal.save();

  // create calls
  let voteId = '0';
  let startDate = '1644851000';
  let snapshotBlock = '100';
  let supportRequiredPct = '1000';
  let minAcceptQuorumPct = '500';
  let votingPower = '1000';
  let actions = createDummyAcctions(daiAddress, '0', '0x00000000');
  createGetVoteCall(
    votingAddress,
    voteId,
    true,
    false,
    startDate,
    snapshotBlock,
    supportRequiredPct,
    minAcceptQuorumPct,
    '1',
    '0',
    votingPower,
    actions
  );

  // create event
  let event = createNewCastVoteEvent(
    voteId,
    addressOne,
    true,
    '10000',
    votingAddress
  );

  handleCastVote(event);

  // checks
  let entityID = addressOne + '_' + proposalId;
  assert.fieldEquals('EVVoterProposal', entityID, 'id', entityID);

  // check voter
  assert.fieldEquals('EVVoter', addressOne, 'id', addressOne);

  // check proposal
  assert.fieldEquals('EVProposal', proposalId, 'yea', '1');

  clearStore();
});

test('Run ERC Voting (handleExecuteVote) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(votingAddress).toHexString() + '_' + '0x0';
  let evProposal = new EVProposal(entityID);
  evProposal.save();

  // create event
  let event = createNewExecuteVoteEvent('0', votingAddress);

  // handle event
  handleExecuteVote(event);

  // checks
  assert.fieldEquals('EVProposal', entityID, 'id', entityID);
  assert.fieldEquals('EVProposal', entityID, 'executed', 'true');

  clearStore();
});

test('Run ERC Voting (handleUpdateConfig) mappings with mock event', () => {
  // create state
  let entityID = Address.fromString(votingAddress).toHexString();
  let evPackage = new EVPackage(entityID);
  evPackage.save();

  // create event
  let event = createNewUpdateConfigEvent('1', '2', votingAddress);

  // handle event
  handleUpdateConfig(event);

  // checks
  assert.fieldEquals('EVPackage', entityID, 'id', entityID);
  assert.fieldEquals('EVPackage', entityID, 'supportRequiredPct', '1');
  assert.fieldEquals('EVPackage', entityID, 'minAcceptQuorumPct', '2');

  clearStore();
});
