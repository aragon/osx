import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';
import {
  StartVote,
  CastVote,
  ExecuteVote,
  UpdateConfig
} from '../../generated/templates/ERC20Voting/ERC20Voting';

// events

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
  let stakeParam = new ethereum.EventParam(
    'voterWeight',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(voterWeight))
  );

  newCastVoteEvent.parameters.push(voteIdParam);
  newCastVoteEvent.parameters.push(voterParam);
  newCastVoteEvent.parameters.push(voterStateParam);
  newCastVoteEvent.parameters.push(stakeParam);

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
  supportRequiredPct: string,
  participationRequiredPct: string,
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
