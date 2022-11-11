import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';
import {AllowlistProposal} from '../../generated/schema';

import {
  VoteCreated,
  VoteCast,
  VoteExecuted,
  ConfigUpdated,
  UsersAdded,
  UsersRemoved
} from '../../generated/templates/AllowlistVoting/AllowlistVoting';
import {
  ADDRESS_ONE,
  CREATED_AT,
  DAO_ADDRESS,
  END_DATE,
  MIN_SUPPORT,
  MIN_TURNOUT,
  PROPOSAL_ID,
  SNAPSHOT_BLOCK,
  START_DATE,
  VOTE_ID,
  VOTING_ADDRESS,
  VOTING_POWER
} from '../constants';

// events

export function createNewVoteCreatedEvent(
  voteId: string,
  creator: string,
  description: string,
  contractAddress: string
): VoteCreated {
  let createVoteCreatedEvent = changetype<VoteCreated>(newMockEvent());

  createVoteCreatedEvent.address = Address.fromString(contractAddress);
  createVoteCreatedEvent.parameters = [];

  let voteIdParam = new ethereum.EventParam(
    'voteId',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(voteId))
  );
  let creatorParam = new ethereum.EventParam(
    'creator',
    ethereum.Value.fromAddress(Address.fromString(creator))
  );
  let descriptionParam = new ethereum.EventParam(
    'description',
    ethereum.Value.fromBytes(Bytes.fromUTF8(description))
  );

  createVoteCreatedEvent.parameters.push(voteIdParam);
  createVoteCreatedEvent.parameters.push(creatorParam);
  createVoteCreatedEvent.parameters.push(descriptionParam);

  return createVoteCreatedEvent;
}

export function createNewVoteCastEvent(
  voteId: string,
  voter: string,
  creatorChoice: string,
  voteWeight: string,
  contractAddress: string
): VoteCast {
  let createVoteCastEvent = changetype<VoteCast>(newMockEvent());

  createVoteCastEvent.address = Address.fromString(contractAddress);
  createVoteCastEvent.parameters = [];

  let voteIdParam = new ethereum.EventParam(
    'voteId',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(voteId))
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

  createVoteCastEvent.parameters.push(voteIdParam);
  createVoteCastEvent.parameters.push(voterParam);
  createVoteCastEvent.parameters.push(choiceParam);
  createVoteCastEvent.parameters.push(voteWeightParam);

  return createVoteCastEvent;
}

export function createNewVoteExecutedEvent(
  voteId: string,
  contractAddress: string
): VoteExecuted {
  let createVoteExecutedEvent = changetype<VoteExecuted>(newMockEvent());

  createVoteExecutedEvent.address = Address.fromString(contractAddress);
  createVoteExecutedEvent.parameters = [];

  let voteIdParam = new ethereum.EventParam(
    'voteId',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(voteId))
  );
  let execResultsParam = new ethereum.EventParam(
    'execResults',
    ethereum.Value.fromBytesArray([Bytes.fromUTF8('')])
  );

  createVoteExecutedEvent.parameters.push(voteIdParam);
  createVoteExecutedEvent.parameters.push(execResultsParam);

  return createVoteExecutedEvent;
}

export function createNewConfigUpdatedEvent(
  totalSupportThresholdPct: string,
  relativeSupportThresholdPct: string,
  minDuration: string,
  contractAddress: string
): ConfigUpdated {
  let newConfigUpdatedEvent = changetype<ConfigUpdated>(newMockEvent());

  newConfigUpdatedEvent.address = Address.fromString(contractAddress);
  newConfigUpdatedEvent.parameters = [];

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

  newConfigUpdatedEvent.parameters.push(totalSupportThresholdPctParam);
  newConfigUpdatedEvent.parameters.push(relativeSupportThresholdPctParam);
  newConfigUpdatedEvent.parameters.push(minDurationParam);

  return newConfigUpdatedEvent;
}

export function createNewUsersAddedEvent(
  addresses: Address[],
  contractAddress: string
): UsersAdded {
  let newUsersAddedEvent = changetype<UsersAdded>(newMockEvent());

  newUsersAddedEvent.address = Address.fromString(contractAddress);
  newUsersAddedEvent.parameters = [];

  let usersParam = new ethereum.EventParam(
    'users',
    ethereum.Value.fromAddressArray(addresses)
  );

  newUsersAddedEvent.parameters.push(usersParam);

  return newUsersAddedEvent;
}

export function createNewUsersRemovedEvent(
  addresses: Address[],
  contractAddress: string
): UsersRemoved {
  let newUsersRemovedEvent = changetype<UsersRemoved>(newMockEvent());

  newUsersRemovedEvent.address = Address.fromString(contractAddress);
  newUsersRemovedEvent.parameters = [];

  let usersParam = new ethereum.EventParam(
    'users',
    ethereum.Value.fromAddressArray(addresses)
  );

  newUsersRemovedEvent.parameters.push(usersParam);

  return newUsersRemovedEvent;
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

export function createAllowlistProposalEntityState(
  entityID: string = PROPOSAL_ID,
  dao: string = DAO_ADDRESS,
  pkg: string = VOTING_ADDRESS,
  creator: string = ADDRESS_ONE,
  voteId: string = VOTE_ID,
  startDate: string = START_DATE,
  endDate: string = END_DATE,
  snapshotBlock: string = SNAPSHOT_BLOCK,
  relativeSupportThresholdPct: string = MIN_SUPPORT,
  totalSupportThresholdPct: string = MIN_TURNOUT,
  census: string = VOTING_POWER,
  createdAt: string = CREATED_AT,
  open: boolean = true,
  executable: boolean = false,
  executed: boolean = false
): AllowlistProposal {
  let allowlistProposal = new AllowlistProposal(entityID);
  allowlistProposal.dao = Address.fromString(dao).toHexString();
  allowlistProposal.pkg = Address.fromString(pkg).toHexString();
  allowlistProposal.voteId = BigInt.fromString(voteId);
  allowlistProposal.creator = Address.fromString(creator);

  allowlistProposal.startDate = BigInt.fromString(startDate);
  allowlistProposal.endDate = BigInt.fromString(endDate);
  allowlistProposal.snapshotBlock = BigInt.fromString(snapshotBlock);
  allowlistProposal.relativeSupportThresholdPct = BigInt.fromString(
    relativeSupportThresholdPct
  );
  allowlistProposal.totalSupportThresholdPct = BigInt.fromString(
    totalSupportThresholdPct
  );
  allowlistProposal.census = BigInt.fromString(census);
  allowlistProposal.open = open;
  allowlistProposal.executable = executable;
  allowlistProposal.executed = executed;
  allowlistProposal.createdAt = BigInt.fromString(createdAt);
  allowlistProposal.save();

  return allowlistProposal;
}
