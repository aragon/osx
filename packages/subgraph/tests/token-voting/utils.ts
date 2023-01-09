import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';

import {
  VotingSettingsUpdated,
  VoteCast,
  ProposalCreated,
  ProposalExecuted
} from '../../generated/templates/TokenVoting/TokenVoting';
import {TokenVotingProposal} from '../../generated/schema';
import {
  ADDRESS_ONE,
  DAO_ADDRESS,
  PROPOSAL_ID,
  CONTRACT_ADDRESS,
  VOTING_MODE,
  SUPPORT_THRESHOLD,
  MIN_PARTICIPATION,
  START_DATE,
  END_DATE,
  SNAPSHOT_BLOCK,
  TOTAL_VOTING_POWER,
  CREATED_AT
} from '../constants';

// events

export function createNewProposalCreatedEvent(
  proposalId: string,
  creator: string,
  description: string,
  contractAddress: string
): ProposalCreated {
  let createProposalCreatedEvent = changetype<ProposalCreated>(newMockEvent());

  createProposalCreatedEvent.address = Address.fromString(contractAddress);
  createProposalCreatedEvent.parameters = [];

  let proposalIdParam = new ethereum.EventParam(
    'proposalId',
    ethereum.Value.fromBytes(Bytes.fromHexString(proposalId))
  );
  let creatorParam = new ethereum.EventParam(
    'creator',
    ethereum.Value.fromAddress(Address.fromString(creator))
  );
  let descriptionParam = new ethereum.EventParam(
    'description',
    ethereum.Value.fromBytes(Bytes.fromUTF8(description))
  );

  createProposalCreatedEvent.parameters.push(proposalIdParam);
  createProposalCreatedEvent.parameters.push(creatorParam);
  createProposalCreatedEvent.parameters.push(descriptionParam);

  return createProposalCreatedEvent;
}

export function createNewVoteCastEvent(
  proposalId: string,
  voter: string,
  voteOption: string,
  votingPower: string,
  contractAddress: string
): VoteCast {
  let createProposalCastEvent = changetype<VoteCast>(newMockEvent());

  createProposalCastEvent.address = Address.fromString(contractAddress);
  createProposalCastEvent.parameters = [];

  let proposalIdParam = new ethereum.EventParam(
    'proposalId',
    ethereum.Value.fromBytes(Bytes.fromHexString(proposalId))
  );
  let voterParam = new ethereum.EventParam(
    'voter',
    ethereum.Value.fromAddress(Address.fromString(voter))
  );
  let voteOptionParam = new ethereum.EventParam(
    'voteOption',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(voteOption))
  );
  let votingPowerParam = new ethereum.EventParam(
    'votingPower',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(votingPower))
  );

  createProposalCastEvent.parameters.push(proposalIdParam);
  createProposalCastEvent.parameters.push(voterParam);
  createProposalCastEvent.parameters.push(voteOptionParam);
  createProposalCastEvent.parameters.push(votingPowerParam);

  return createProposalCastEvent;
}

export function createNewProposalExecutedEvent(
  proposalId: string,
  contractAddress: string
): ProposalExecuted {
  let createProposalExecutedEvent = changetype<ProposalExecuted>(
    newMockEvent()
  );

  createProposalExecutedEvent.address = Address.fromString(contractAddress);
  createProposalExecutedEvent.parameters = [];

  let proposalIdParam = new ethereum.EventParam(
    'proposalId',
    ethereum.Value.fromBytes(Bytes.fromHexString(proposalId))
  );
  let execResultsParam = new ethereum.EventParam(
    'execResults',
    ethereum.Value.fromBytesArray([Bytes.fromUTF8('')])
  );

  createProposalExecutedEvent.parameters.push(proposalIdParam);
  createProposalExecutedEvent.parameters.push(execResultsParam);

  return createProposalExecutedEvent;
}

export function createNewVotingSettingsUpdatedEvent(
  votingMode: string,
  supportThreshold: string,
  minParticipation: string,
  minDuration: string,
  minProposerVotingPower: string,
  contractAddress: string
): VotingSettingsUpdated {
  let newVotingSettingsUpdatedEvent = changetype<VotingSettingsUpdated>(
    newMockEvent()
  );

  newVotingSettingsUpdatedEvent.address = Address.fromString(contractAddress);
  newVotingSettingsUpdatedEvent.parameters = [];

  let votingModeParam = new ethereum.EventParam(
    'votingMode',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(votingMode))
  );
  let supportThresholdParam = new ethereum.EventParam(
    'supportThreshold',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(supportThreshold))
  );
  let minParticipationParam = new ethereum.EventParam(
    'minParticipation',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(minParticipation))
  );
  let minDurationParam = new ethereum.EventParam(
    'minDuration',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(minDuration))
  );
  let minProposerVotingPowerParam = new ethereum.EventParam(
    'minProposerVotingPower',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(minProposerVotingPower))
  );

  newVotingSettingsUpdatedEvent.parameters.push(votingModeParam);
  newVotingSettingsUpdatedEvent.parameters.push(supportThresholdParam);
  newVotingSettingsUpdatedEvent.parameters.push(minParticipationParam);
  newVotingSettingsUpdatedEvent.parameters.push(minDurationParam);
  newVotingSettingsUpdatedEvent.parameters.push(minProposerVotingPowerParam);

  return newVotingSettingsUpdatedEvent;
}

// calls

export function getProposalCountCall(
  contractAddress: string,
  returns: string
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'proposalCount',
    'proposalCount():(uint256)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromSignedBigInt(BigInt.fromString(returns))]);
}

// state

export function createTokenVotingProposalEntityState(
  entityID: string = PROPOSAL_ID,
  dao: string = DAO_ADDRESS,
  pkg: string = CONTRACT_ADDRESS,
  creator: string = ADDRESS_ONE,

  open: boolean = true,
  executed: boolean = false,

  votingMode: string = VOTING_MODE,
  supportThreshold: string = SUPPORT_THRESHOLD,
  minParticipation: string = MIN_PARTICIPATION,
  startDate: string = START_DATE,
  endDate: string = END_DATE,
  snapshotBlock: string = SNAPSHOT_BLOCK,

  totalVotingPower: string = TOTAL_VOTING_POWER,

  createdAt: string = CREATED_AT,
  creationBlockNumber: BigInt = new BigInt(0),
  executable: boolean = false
): TokenVotingProposal {
  let tokenVotingProposal = new TokenVotingProposal(entityID);
  tokenVotingProposal.dao = Address.fromString(dao).toHexString();
  tokenVotingProposal.plugin = Address.fromString(pkg).toHexString();
  tokenVotingProposal.creator = Address.fromString(creator);

  tokenVotingProposal.open = open;
  tokenVotingProposal.executed = executed;

  tokenVotingProposal.votingMode = votingMode;
  tokenVotingProposal.supportThreshold = BigInt.fromString(supportThreshold);
  tokenVotingProposal.minParticipation = BigInt.fromString(minParticipation);
  tokenVotingProposal.startDate = BigInt.fromString(startDate);
  tokenVotingProposal.endDate = BigInt.fromString(endDate);
  tokenVotingProposal.snapshotBlock = BigInt.fromString(snapshotBlock);

  tokenVotingProposal.totalVotingPower = BigInt.fromString(totalVotingPower);

  tokenVotingProposal.createdAt = BigInt.fromString(createdAt);
  tokenVotingProposal.creationBlockNumber = creationBlockNumber;
  tokenVotingProposal.executable = executable;

  tokenVotingProposal.save();

  return tokenVotingProposal;
}
