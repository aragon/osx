import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction, newMockEvent} from 'matchstick-as';

import {
  VoteCreated,
  VoteCast,
  VoteExecuted,
  ConfigUpdated,
  TrustedForwarderSet
} from '../../generated/templates/ERC20Voting/ERC20Voting';
import {ERC20VotingProposal} from '../../generated/schema';

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

export function createNewConfigUpdatedEvent(
  supportRequiredPct: string,
  participationRequiredPct: string,
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
  entityID: string,
  dao: string,
  voting: string,
  creator: string
): ERC20VotingProposal {
  let erc20VotingProposal = new ERC20VotingProposal(entityID);
  erc20VotingProposal.dao = Address.fromString(dao).toHexString();
  erc20VotingProposal.pkg = Address.fromString(voting).toHexString();
  erc20VotingProposal.voteId = BigInt.zero();
  erc20VotingProposal.creator = Address.fromString(creator);

  erc20VotingProposal.startDate = BigInt.zero();
  erc20VotingProposal.endDate = BigInt.zero();
  erc20VotingProposal.snapshotBlock = BigInt.zero();
  erc20VotingProposal.supportRequiredPct = BigInt.zero();
  erc20VotingProposal.participationRequiredPct = BigInt.zero();
  erc20VotingProposal.votingPower = BigInt.zero();
  erc20VotingProposal.open = true;
  erc20VotingProposal.executable = false;
  erc20VotingProposal.executed = false;
  erc20VotingProposal.createdAt = BigInt.zero();
  erc20VotingProposal.save();

  return erc20VotingProposal;
}
