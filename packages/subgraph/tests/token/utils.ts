import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';

import {
  VotingSettingsUpdated,
  VoteCast,
  ProposalCreated,
  ProposalExecuted
} from '../../generated/templates/TokenVoting/TokenVoting';
import {TokenVotingMember, TokenVotingProposal} from '../../generated/schema';
import {
  ADDRESS_ONE,
  DAO_ADDRESS,
  PROPOSAL_ENTITY_ID,
  PROPOSAL_ID,
  CONTRACT_ADDRESS,
  VOTING_MODE,
  SUPPORT_THRESHOLD,
  MIN_VOTING_POWER,
  START_DATE,
  END_DATE,
  SNAPSHOT_BLOCK,
  TOTAL_VOTING_POWER,
  CREATED_AT,
  ALLOW_FAILURE_MAP
} from '../constants';
import {Transfer as ERC20TransferEvent} from '../../generated/templates/TokenVoting/ERC20';

// events

export function createNewProposalCreatedEvent(
  proposalId: string,
  creator: string,
  startDate: string,
  endDate: string,
  description: string,
  actions: ethereum.Tuple[],
  allowFailureMap: string,
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
  let startDateParam = new ethereum.EventParam(
    'startDate',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(startDate))
  );
  let endDateParam = new ethereum.EventParam(
    'endDate',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(endDate))
  );
  let descriptionParam = new ethereum.EventParam(
    'description',
    ethereum.Value.fromBytes(Bytes.fromUTF8(description))
  );
  let actionsParam = new ethereum.EventParam(
    'actions',
    ethereum.Value.fromTupleArray(actions)
  );
  let allowFailureMapParam = new ethereum.EventParam(
    'allowFailureMap',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(allowFailureMap))
  );

  createProposalCreatedEvent.parameters.push(proposalIdParam);
  createProposalCreatedEvent.parameters.push(creatorParam);
  createProposalCreatedEvent.parameters.push(startDateParam);
  createProposalCreatedEvent.parameters.push(endDateParam);
  createProposalCreatedEvent.parameters.push(descriptionParam);
  createProposalCreatedEvent.parameters.push(actionsParam);
  createProposalCreatedEvent.parameters.push(allowFailureMapParam);

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
    ethereum.Value.fromSignedBigInt(BigInt.fromString(proposalId))
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
    ethereum.Value.fromSignedBigInt(BigInt.fromString(proposalId))
  );

  createProposalExecutedEvent.parameters.push(proposalIdParam);

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
  entityID: string = PROPOSAL_ENTITY_ID,
  dao: string = DAO_ADDRESS,
  pkg: string = CONTRACT_ADDRESS,
  creator: string = ADDRESS_ONE,
  proposalId: string = PROPOSAL_ID,

  open: boolean = true,
  executed: boolean = false,

  votingMode: string = VOTING_MODE,
  supportThreshold: string = SUPPORT_THRESHOLD,
  minVotingPower: string = MIN_VOTING_POWER,
  startDate: string = START_DATE,
  endDate: string = END_DATE,
  snapshotBlock: string = SNAPSHOT_BLOCK,

  totalVotingPower: string = TOTAL_VOTING_POWER,
  allowFailureMap: string = ALLOW_FAILURE_MAP,
  createdAt: string = CREATED_AT,
  creationBlockNumber: BigInt = new BigInt(0),
  executable: boolean = false,
  earlyExecutable: boolean = false
): TokenVotingProposal {
  let tokenVotingProposal = new TokenVotingProposal(entityID);
  tokenVotingProposal.dao = Address.fromString(dao).toHexString();
  tokenVotingProposal.plugin = Address.fromString(pkg).toHexString();
  tokenVotingProposal.proposalId = BigInt.fromString(proposalId);
  tokenVotingProposal.creator = Address.fromString(creator);

  tokenVotingProposal.open = open;
  tokenVotingProposal.executed = executed;

  tokenVotingProposal.votingMode = votingMode;
  tokenVotingProposal.supportThreshold = BigInt.fromString(supportThreshold);
  tokenVotingProposal.minVotingPower = BigInt.fromString(minVotingPower);
  tokenVotingProposal.startDate = BigInt.fromString(startDate);
  tokenVotingProposal.endDate = BigInt.fromString(endDate);
  tokenVotingProposal.snapshotBlock = BigInt.fromString(snapshotBlock);

  tokenVotingProposal.totalVotingPower = BigInt.fromString(totalVotingPower);
  tokenVotingProposal.allowFailureMap = BigInt.fromString(allowFailureMap);
  tokenVotingProposal.createdAt = BigInt.fromString(createdAt);
  tokenVotingProposal.creationBlockNumber = creationBlockNumber;
  tokenVotingProposal.potentiallyExecutable = executable;
  tokenVotingProposal.earlyExecutable = earlyExecutable;

  tokenVotingProposal.save();

  return tokenVotingProposal;
}

export function createNewERC20TransferEvent(
  from: string,
  to: string,
  amount: string
): ERC20TransferEvent {
  let transferEvent = changetype<ERC20TransferEvent>(newMockEvent());

  let fromParam = new ethereum.EventParam(
    'from',
    ethereum.Value.fromAddress(Address.fromString(from))
  );
  let toParam = new ethereum.EventParam(
    'to',
    ethereum.Value.fromAddress(Address.fromString(to))
  );
  let amountParam = new ethereum.EventParam(
    'amount',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(amount))
  );

  transferEvent.parameters.push(fromParam);
  transferEvent.parameters.push(toParam);
  transferEvent.parameters.push(amountParam);

  return transferEvent;
}

export function createTokenVotingMember(
  address: string,
  plugin: string,
  balance: string
): string {
  const fromUserId = address.concat('_').concat(plugin);

  const user = new TokenVotingMember(fromUserId);
  user.address = Address.fromString(address);
  user.plugin = plugin; // uses other plugin address to make sure that the code reuses the entity
  user.balance = BigInt.fromString(balance);
  user.save();

  return fromUserId;
}
