import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';
import {AddresslistProposal} from '../../generated/schema';

import {
  ProposalCreated,
  VoteCast,
  ProposalExecuted,
  VoteSettingsUpdated,
  AddressesAdded,
  AddressesRemoved
} from '../../generated/templates/Addresslist/Addresslist';
import {
  ADDRESS_ONE,
  CREATED_AT,
  DAO_ADDRESS,
  END_DATE,
  MIN_SUPPORT,
  MIN_TURNOUT,
  PROPOSAL_ENTITY_ID,
  SNAPSHOT_BLOCK,
  START_DATE,
  PROPOSAL_ID,
  VOTING_ADDRESS,
  VOTING_POWER
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
  creatorChoice: string,
  voteWeight: string,
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
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(creatorChoice))
  );
  let voteWeightParam = new ethereum.EventParam(
    'choice',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(voteWeight))
  );

  createProposalCastEvent.parameters.push(proposalIdParam);
  createProposalCastEvent.parameters.push(voterParam);
  createProposalCastEvent.parameters.push(choiceParam);
  createProposalCastEvent.parameters.push(voteWeightParam);

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
  totalSupportThresholdPct: string,
  relativeSupportThresholdPct: string,
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

export function createNewAddressesAddedEvent(
  addresses: Address[],
  contractAddress: string
): AddressesAdded {
  let newAddressesAddedEvent = changetype<AddressesAdded>(newMockEvent());

  newAddressesAddedEvent.address = Address.fromString(contractAddress);
  newAddressesAddedEvent.parameters = [];

  let usersParam = new ethereum.EventParam(
    'users',
    ethereum.Value.fromAddressArray(addresses)
  );

  newAddressesAddedEvent.parameters.push(usersParam);

  return newAddressesAddedEvent;
}

export function createNewAddressesRemovedEvent(
  addresses: Address[],
  contractAddress: string
): AddressesRemoved {
  let newAddressesRemovedEvent = changetype<AddressesRemoved>(newMockEvent());

  newAddressesRemovedEvent.address = Address.fromString(contractAddress);
  newAddressesRemovedEvent.parameters = [];

  let usersParam = new ethereum.EventParam(
    'users',
    ethereum.Value.fromAddressArray(addresses)
  );

  newAddressesRemovedEvent.parameters.push(usersParam);

  return newAddressesRemovedEvent;
}

// calls

export function getVotesLengthCall(
  contractAddress: string,
  returns: string
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'votesLength',
    'votesLength():(uint256)'
  )
    .withArgs([])
    .returns([ethereum.Value.fromSignedBigInt(BigInt.fromString(returns))]);
}

// state

export function createAddresslistProposalEntityState(
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
): AddresslistProposal {
  let addresslistProposal = new AddresslistProposal(entityID);
  addresslistProposal.dao = Address.fromString(dao).toHexString();
  addresslistProposal.plugin = Address.fromString(pkg).toHexString();
  addresslistProposal.proposalId = BigInt.fromString(proposalId);
  addresslistProposal.creator = Address.fromString(creator);

  addresslistProposal.startDate = BigInt.fromString(startDate);
  addresslistProposal.endDate = BigInt.fromString(endDate);
  addresslistProposal.snapshotBlock = BigInt.fromString(snapshotBlock);
  addresslistProposal.relativeSupportThresholdPct = BigInt.fromString(
    relativeSupportThresholdPct
  );
  addresslistProposal.totalSupportThresholdPct = BigInt.fromString(
    totalSupportThresholdPct
  );
  addresslistProposal.totalVotingPower = BigInt.fromString(totalVotingPower);
  addresslistProposal.open = open;
  addresslistProposal.executable = executable;
  addresslistProposal.executed = executed;
  addresslistProposal.createdAt = BigInt.fromString(createdAt);
  addresslistProposal.save();

  return addresslistProposal;
}
