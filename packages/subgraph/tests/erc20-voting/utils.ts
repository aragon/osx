import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';

import {
  VoteSettingsUpdated,
  VoteCast,
  VoteCreated,
  VoteExecuted
} from '../../generated/templates/ERC20Voting/ERC20Voting';
import {ERC20VotingProposal} from '../../generated/schema';
import {
  ADDRESS_ONE,
  DAO_ADDRESS,
  PROPOSAL_ID,
  VOTE_ID,
  VOTING_ADDRESS,
  CREATED_AT,
  END_DATE,
  MIN_SUPPORT,
  MIN_TURNOUT,
  SNAPSHOT_BLOCK,
  START_DATE,
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
  choice: string,
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
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(choice))
  );
  let stakeParam = new ethereum.EventParam(
    'voteWeight',
    ethereum.Value.fromSignedBigInt(BigInt.fromString(voteWeight))
  );

  createVoteCastEvent.parameters.push(voteIdParam);
  createVoteCastEvent.parameters.push(voterParam);
  createVoteCastEvent.parameters.push(choiceParam);
  createVoteCastEvent.parameters.push(stakeParam);

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

export function createERC20VotingProposalEntityState(
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
): ERC20VotingProposal {
  let erc20VotingProposal = new ERC20VotingProposal(entityID);
  erc20VotingProposal.dao = Address.fromString(dao).toHexString();
  erc20VotingProposal.plugin = Address.fromString(pkg).toHexString();
  erc20VotingProposal.voteId = BigInt.fromString(voteId);
  erc20VotingProposal.creator = Address.fromString(creator);

  erc20VotingProposal.startDate = BigInt.fromString(startDate);
  erc20VotingProposal.endDate = BigInt.fromString(endDate);
  erc20VotingProposal.snapshotBlock = BigInt.fromString(snapshotBlock);
  erc20VotingProposal.relativeSupportThresholdPct = BigInt.fromString(
    relativeSupportThresholdPct
  );
  erc20VotingProposal.totalSupportThresholdPct = BigInt.fromString(
    totalSupportThresholdPct
  );
  erc20VotingProposal.census = BigInt.fromString(census);
  erc20VotingProposal.open = open;
  erc20VotingProposal.executable = executable;
  erc20VotingProposal.executed = executed;
  erc20VotingProposal.createdAt = BigInt.fromString(createdAt);
  erc20VotingProposal.save();

  return erc20VotingProposal;
}
