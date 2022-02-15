import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';
import {
  StartVote,
  CastVote,
  ExecuteVote,
  UpdateConfig
} from '../../generated/templates/SimpleVoting/SimpleVoting';

export function createNewStartVoteEvent(
  voteId: string,
  creator: string,
  description: string,
  contractAddress: string
): StartVote {
  let newStartVoteEvent = changetype<StartVote>(newMockEvent());

  newStartVoteEvent.address = Address.fromString(contractAddress);
  newStartVoteEvent.parameters = new Array();

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
  voterSupports: boolean,
  stake: string,
  contractAddress: string
): CastVote {
  let newCastVoteEvent = changetype<CastVote>(newMockEvent());

  newCastVoteEvent.address = Address.fromString(contractAddress);
  newCastVoteEvent.parameters = new Array();

  let voteIdParam = new ethereum.EventParam(
    'voteId',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(voteId))
  );
  let voterParam = new ethereum.EventParam(
    'voter',
    ethereum.Value.fromAddress(Address.fromString(voter))
  );
  let voterSupportsParam = new ethereum.EventParam(
    'voterSupports',
    ethereum.Value.fromBoolean(voterSupports)
  );
  let stakeParam = new ethereum.EventParam(
    'stake',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(stake))
  );

  newCastVoteEvent.parameters.push(voteIdParam);
  newCastVoteEvent.parameters.push(voterParam);
  newCastVoteEvent.parameters.push(voterSupportsParam);
  newCastVoteEvent.parameters.push(stakeParam);

  return newCastVoteEvent;
}

export function createNewExecuteVoteEvent(
  voteId: string,
  contractAddress: string
): ExecuteVote {
  let newExecuteVoteEvent = changetype<ExecuteVote>(newMockEvent());

  newExecuteVoteEvent.address = Address.fromString(contractAddress);
  newExecuteVoteEvent.parameters = new Array();

  let voteIdParam = new ethereum.EventParam(
    'voteId',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(voteId))
  );

  newExecuteVoteEvent.parameters.push(voteIdParam);

  return newExecuteVoteEvent;
}

export function createNewUpdateConfigEvent(
  supportRequiredPct: string,
  minAcceptQuorumPct: string,
  contractAddress: string
): UpdateConfig {
  let newUpdateConfigEvent = changetype<UpdateConfig>(newMockEvent());

  newUpdateConfigEvent.address = Address.fromString(contractAddress);
  newUpdateConfigEvent.parameters = new Array();

  let supportRequiredPctParam = new ethereum.EventParam(
    'supportRequiredPct',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(supportRequiredPct))
  );
  let minAcceptQuorumPctParam = new ethereum.EventParam(
    'minAcceptQuorumPct',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(minAcceptQuorumPct))
  );

  newUpdateConfigEvent.parameters.push(supportRequiredPctParam);
  newUpdateConfigEvent.parameters.push(minAcceptQuorumPctParam);

  return newUpdateConfigEvent;
}

export function createGetVoteCall(
  contractAddress: string,
  voteId: string,
  open: boolean,
  executed: boolean,
  startDate: string,
  snapshotBlock: string,
  supportRequired: string,
  minAcceptQuorum: string,
  yea: string,
  nay: string,
  votingPower: string,
  actions: ethereum.Tuple[]
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'getVote',
    'getVote(uint256):(bool,bool,uint64,uint64,uint64,uint64,uint256,uint256,uint256,(address,uint256,bytes)[])'
  )
    .withArgs([ethereum.Value.fromSignedBigInt(BigInt.fromString(voteId))])
    .returns([
      ethereum.Value.fromBoolean(open),
      ethereum.Value.fromBoolean(executed),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(startDate)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(snapshotBlock)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(supportRequired)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(minAcceptQuorum)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(yea)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(nay)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(votingPower)),
      ethereum.Value.fromTupleArray(actions)
    ]);
}

export function createDummyAcctions(
  address: string,
  value: string,
  data: string
): ethereum.Tuple[] {
  let tuple = new ethereum.Tuple();

  tuple.push(ethereum.Value.fromAddress(Address.fromString(address)));
  tuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromString(value)));
  tuple.push(ethereum.Value.fromBytes(Bytes.fromUTF8(data)));

  return [tuple];
}

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
