import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';
import {
  StartVote,
  CastVote,
  ExecuteVote,
  UpdateConfig,
  AddUsers,
  RemoveUsers,
  TrustedForwarderSet
} from '../../generated/templates/WhitelistVoting/WhitelistVoting';

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

export function createNewStartVoteEvent(
  voteId: string,
  creator: string,
  description: string,
  contractAddress: string
): StartVote {
  let newStartVoteEvent = changetype<StartVote>(newMockEvent());

  newStartVoteEvent.address = Address.fromString(contractAddress);
  newStartVoteEvent.parameters = [];

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

  newStartVoteEvent.parameters.push(voteIdParam);
  newStartVoteEvent.parameters.push(creatorParam);
  newStartVoteEvent.parameters.push(descriptionParam);

  return newStartVoteEvent;
}

export function createNewCastVoteEvent(
  voteId: string,
  voter: string,
  voterState: string,
  voterWeight: string,
  contractAddress: string
): CastVote {
  let newCastVoteEvent = changetype<CastVote>(newMockEvent());

  newCastVoteEvent.address = Address.fromString(contractAddress);
  newCastVoteEvent.parameters = [];

  let voteIdParam = new ethereum.EventParam(
    'voteId',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(voteId))
  );
  let voterParam = new ethereum.EventParam(
    'voter',
    ethereum.Value.fromAddress(Address.fromString(voter))
  );
  let voterStateParam = new ethereum.EventParam(
    'voterState',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(voterState))
  );
  let voterWeightParam = new ethereum.EventParam(
    'voterState',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(voterWeight))
  );

  newCastVoteEvent.parameters.push(voteIdParam);
  newCastVoteEvent.parameters.push(voterParam);
  newCastVoteEvent.parameters.push(voterStateParam);
  newCastVoteEvent.parameters.push(voterWeightParam);

  return newCastVoteEvent;
}

export function createNewExecuteVoteEvent(
  voteId: string,
  contractAddress: string
): ExecuteVote {
  let newExecuteVoteEvent = changetype<ExecuteVote>(newMockEvent());

  newExecuteVoteEvent.address = Address.fromString(contractAddress);
  newExecuteVoteEvent.parameters = [];

  let voteIdParam = new ethereum.EventParam(
    'voteId',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(voteId))
  );
  let execResultsParam = new ethereum.EventParam(
    'execResults',
    ethereum.Value.fromBytesArray([Bytes.fromUTF8('')])
  );

  newExecuteVoteEvent.parameters.push(voteIdParam);
  newExecuteVoteEvent.parameters.push(execResultsParam);

  return newExecuteVoteEvent;
}

export function createNewUpdateConfigEvent(
  participationRequiredPct: string,
  supportRequiredPct: string,
  minDuration: string,
  contractAddress: string
): UpdateConfig {
  let newUpdateConfigEvent = changetype<UpdateConfig>(newMockEvent());

  newUpdateConfigEvent.address = Address.fromString(contractAddress);
  newUpdateConfigEvent.parameters = [];

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

  newUpdateConfigEvent.parameters.push(participationRequiredPctParam);
  newUpdateConfigEvent.parameters.push(supportRequiredPctParam);
  newUpdateConfigEvent.parameters.push(minDurationParam);

  return newUpdateConfigEvent;
}

export function createNewAddUsersEvent(
  addresses: Address[],
  contractAddress: string
): AddUsers {
  let newAddUsersEvent = changetype<AddUsers>(newMockEvent());

  newAddUsersEvent.address = Address.fromString(contractAddress);
  newAddUsersEvent.parameters = [];

  let usersParam = new ethereum.EventParam(
    'users',
    ethereum.Value.fromAddressArray(addresses)
  );

  newAddUsersEvent.parameters.push(usersParam);

  return newAddUsersEvent;
}

export function createNewRemoveUsersEvent(
  addresses: Address[],
  contractAddress: string
): RemoveUsers {
  let newRemoveUsersEvent = changetype<RemoveUsers>(newMockEvent());

  newRemoveUsersEvent.address = Address.fromString(contractAddress);
  newRemoveUsersEvent.parameters = [];

  let usersParam = new ethereum.EventParam(
    'users',
    ethereum.Value.fromAddressArray(addresses)
  );

  newRemoveUsersEvent.parameters.push(usersParam);

  return newRemoveUsersEvent;
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
