import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';

import {
  VoteStarted,
  VoteCast,
  VoteExecuted,
  ConfigUpdated,
  UsersAdded,
  UsersRemoved,
  TrustedForwarderSet
} from '../../generated/templates/AllowlistVoting/AllowlistVoting';

// events

export function createNewTrustedForwarderSetEvent(
  forwarderAddress: string,
  contractAddress: string
): TrustedForwarderSet {
  let newTrustedForwarderSetEvent = changetype<TrustedForwarderSet>(
    newMockEvent()
  );

  newTrustedForwarderSetEvent.address = Address.fromString(contractAddress);
  newTrustedForwarderSetEvent.parameters = [];

  let forwarderAddressParam = new ethereum.EventParam(
    'forwarder',
    ethereum.Value.fromAddress(Address.fromString(forwarderAddress))
  );

  newTrustedForwarderSetEvent.parameters.push(forwarderAddressParam);

  return newTrustedForwarderSetEvent;
}

export function createNewVoteStartedEvent(
  voteId: string,
  creator: string,
  description: string,
  contractAddress: string
): VoteStarted {
  let newVoteStartedEvent = changetype<VoteStarted>(newMockEvent());

  newVoteStartedEvent.address = Address.fromString(contractAddress);
  newVoteStartedEvent.parameters = [];

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

  newVoteStartedEvent.parameters.push(voteIdParam);
  newVoteStartedEvent.parameters.push(creatorParam);
  newVoteStartedEvent.parameters.push(descriptionParam);

  return newVoteStartedEvent;
}

export function createNewVoteCastEvent(
  voteId: string,
  voter: string,
  voteOption: string,
  voteWeight: string,
  contractAddress: string
): VoteCast {
  let newVoteCastEvent = changetype<VoteCast>(newMockEvent());

  newVoteCastEvent.address = Address.fromString(contractAddress);
  newVoteCastEvent.parameters = [];

  let voteIdParam = new ethereum.EventParam(
    'voteId',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(voteId))
  );
  let voterParam = new ethereum.EventParam(
    'voter',
    ethereum.Value.fromAddress(Address.fromString(voter))
  );
  let voteOptionParam = new ethereum.EventParam(
    'voteOption',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(voteOption))
  );
  let voteWeightParam = new ethereum.EventParam(
    'voteOption',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(voteWeight))
  );

  newVoteCastEvent.parameters.push(voteIdParam);
  newVoteCastEvent.parameters.push(voterParam);
  newVoteCastEvent.parameters.push(voteOptionParam);
  newVoteCastEvent.parameters.push(voteWeightParam);

  return newVoteCastEvent;
}

export function createNewVoteExecutedEvent(
  voteId: string,
  contractAddress: string
): VoteExecuted {
  let newVoteExecutedEvent = changetype<VoteExecuted>(newMockEvent());

  newVoteExecutedEvent.address = Address.fromString(contractAddress);
  newVoteExecutedEvent.parameters = [];

  let voteIdParam = new ethereum.EventParam(
    'voteId',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(voteId))
  );
  let execResultsParam = new ethereum.EventParam(
    'execResults',
    ethereum.Value.fromBytesArray([Bytes.fromUTF8('')])
  );

  newVoteExecutedEvent.parameters.push(voteIdParam);
  newVoteExecutedEvent.parameters.push(execResultsParam);

  return newVoteExecutedEvent;
}

export function createNewConfigUpdatedEvent(
  participationRequiredPct: string,
  supportRequiredPct: string,
  minDuration: string,
  contractAddress: string
): ConfigUpdated {
  let newConfigUpdatedEvent = changetype<ConfigUpdated>(newMockEvent());

  newConfigUpdatedEvent.address = Address.fromString(contractAddress);
  newConfigUpdatedEvent.parameters = [];

  let participationRequiredPctParam = new ethereum.EventParam(
    'participationRequiredPct',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(participationRequiredPct))
  );
  let supportRequiredPctParam = new ethereum.EventParam(
    'supportRequiredPct',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(supportRequiredPct))
  );
  let minDurationParam = new ethereum.EventParam(
    'minDuration',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(minDuration))
  );

  newConfigUpdatedEvent.parameters.push(participationRequiredPctParam);
  newConfigUpdatedEvent.parameters.push(supportRequiredPctParam);
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
