import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';
import {
  StartVote,
  CastVote,
  ExecuteVote,
  UpdateConfig
} from '../../generated/templates/ERC20Voting/ERC20Voting';

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
  voterState: string,
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
  let voterStateParam = new ethereum.EventParam(
    'voterState',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(voterState))
  );
  let stakeParam = new ethereum.EventParam(
    'stake',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(stake))
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
  newExecuteVoteEvent.parameters = new Array();

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
  newUpdateConfigEvent.parameters = new Array();

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

export function createGetVoteCall(
  contractAddress: string,
  voteId: string,
  open: boolean,
  executed: boolean,
  startDate: string,
  endDate: string,
  snapshotBlock: string,
  supportRequired: string,
  participationRequired: string,
  votingPower: string,
  yea: string,
  nay: string,
  abstain: string,
  actions: ethereum.Tuple[]
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'getVote',
    'getVote(uint256):(bool,bool,uint64,uint64,uint64,uint64,uint64,uint256,uint256,uint256,uint256,(address,uint256,bytes)[])'
  )
    .withArgs([ethereum.Value.fromSignedBigInt(BigInt.fromString(voteId))])
    .returns([
      ethereum.Value.fromBoolean(open),
      ethereum.Value.fromBoolean(executed),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(startDate)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(endDate)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(snapshotBlock)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(supportRequired)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(participationRequired)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(votingPower)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(yea)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(nay)),
      ethereum.Value.fromSignedBigInt(BigInt.fromString(abstain)),
      ethereum.Value.fromTupleArray(actions)
    ]);
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
