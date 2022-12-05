import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';

import {
  VoteSettingsUpdated,
  VoteCast,
  ProposalCreated,
  ProposalExecuted,
} from '../../generated/templates/TokenVoting/TokenVoting';
import {TokenVotingProposal} from '../../generated/schema';
import {
  ADDRESS_ONE,
  DAO_ADDRESS,
  PROPOSAL_ENTITY_ID,
  PROPOSAL_ID,
  VOTING_ADDRESS,
  CREATED_AT,
  END_DATE,
  MIN_SUPPORT,
  MIN_TURNOUT,
  SNAPSHOT_BLOCK,
  START_DATE,
  VOTING_POWER,
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
    ethereum.Value.fromSignedBigInt(BigInt.fromString(proposalId))
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
  choice: string,
  votingPower: string,
  contractAddress: string
): VoteCast {
  let createProposalCastEvent = changetype<VoteCast>(newMockEvent());

  createProposalCastEvent.address = Address.fromString(contractAddress);
  createProposalCastEvent.parameters = [];

  let proposalIdParam = new ethereum.EventParam(
    'proposalId',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(proposalId))
  );
  let voterParam = new ethereum.EventParam(
    'voter',
    ethereum.Value.fromAddress(Address.fromString(voter))
  );
  let choiceParam = new ethereum.EventParam(
    'choice',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(choice))
  );
  let stakeParam = new ethereum.EventParam(
    'votingPower',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(votingPower))
  );

  createProposalCastEvent.parameters.push(proposalIdParam);
  createProposalCastEvent.parameters.push(voterParam);
  createProposalCastEvent.parameters.push(choiceParam);
  createProposalCastEvent.parameters.push(stakeParam);

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
    ethereum.Value.fromSignedBigInt(BigInt.fromString(proposalId))
  );
  let execResultsParam = new ethereum.EventParam(
    'execResults',
    ethereum.Value.fromBytesArray([Bytes.fromUTF8('')])
  );

  createProposalExecutedEvent.parameters.push(proposalIdParam);
  createProposalExecutedEvent.parameters.push(execResultsParam);

  return createProposalExecutedEvent;
}

export function createNewVoteSettingsUpdatedEvent(
  relativeSupportThresholdPct: string,
  totalSupportThresholdPct: string,
  minDuration: string,
  contractAddress: string
): VoteSettingsUpdated {
  let newVoteSettingsUpdatedEvent = changetype<VoteSettingsUpdated>(
    newMockEvent()
  );

  newVoteSettingsUpdatedEvent.address = Address.fromString(contractAddress);
  newVoteSettingsUpdatedEvent.parameters = [];

  let totalSupportThresholdPctParam = new ethereum.EventParam(
    'totalSupportThresholdPct',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(totalSupportThresholdPct))
  );
  let relativeSupportThresholdPctParam = new ethereum.EventParam(
    'relativeSupportThresholdPct',
    ethereum.Value.fromSignedBigInt(
      BigInt.fromString(relativeSupportThresholdPct)
    )
  );
  let minDurationParam = new ethereum.EventParam(
    'minDuration',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(minDuration))
  );

  newVoteSettingsUpdatedEvent.parameters.push(totalSupportThresholdPctParam);
  newVoteSettingsUpdatedEvent.parameters.push(relativeSupportThresholdPctParam);
  newVoteSettingsUpdatedEvent.parameters.push(minDurationParam);

  return newVoteSettingsUpdatedEvent;
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
  entityID: string = PROPOSAL_ENTITY_ID,
  dao: string = DAO_ADDRESS,
  pkg: string = VOTING_ADDRESS,
  creator: string = ADDRESS_ONE,
  proposalId: string = PROPOSAL_ID,
  startDate: string = START_DATE,
  endDate: string = END_DATE,
  snapshotBlock: string = SNAPSHOT_BLOCK,
  relativeSupportThresholdPct: string = MIN_SUPPORT,
  totalSupportThresholdPct: string = MIN_TURNOUT,
  totalVotingPower: string = VOTING_POWER,
  createdAt: string = CREATED_AT,
  open: boolean = true,
  executable: boolean = false,
  executed: boolean = false
): TokenVotingProposal {
  let tokenVotingProposal = new TokenVotingProposal(entityID);
  tokenVotingProposal.dao = Address.fromString(dao).toHexString();
  tokenVotingProposal.plugin = Address.fromString(pkg).toHexString();
  tokenVotingProposal.proposalId = BigInt.fromString(proposalId);
  tokenVotingProposal.creator = Address.fromString(creator);

  tokenVotingProposal.startDate = BigInt.fromString(startDate);
  tokenVotingProposal.endDate = BigInt.fromString(endDate);
  tokenVotingProposal.snapshotBlock = BigInt.fromString(snapshotBlock);
  tokenVotingProposal.relativeSupportThresholdPct = BigInt.fromString(
    relativeSupportThresholdPct
  );
  tokenVotingProposal.totalSupportThresholdPct = BigInt.fromString(
    totalSupportThresholdPct
  );
  tokenVotingProposal.totalVotingPower = BigInt.fromString(totalVotingPower);
  tokenVotingProposal.open = open;
  tokenVotingProposal.executable = executable;
  tokenVotingProposal.executed = executed;
  tokenVotingProposal.createdAt = BigInt.fromString(createdAt);
  tokenVotingProposal.save();

  return tokenVotingProposal;
}
