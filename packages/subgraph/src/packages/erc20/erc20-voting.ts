import {BigInt, dataSource} from '@graphprotocol/graph-ts';

import {
  VoteCast,
  VoteCreated,
  VoteExecuted,
  ConfigUpdated,
  ERC20Voting
} from '../../../generated/templates/ERC20Voting/ERC20Voting';
import {
  Action,
  ERC20VotingPackage,
  ERC20VotingProposal,
  ERC20VotingVoter,
  ERC20Vote
} from '../../../generated/schema';

import {TEN_POWER_16, VOTER_STATE} from '../../utils/constants';

export function handleVoteCreated(event: VoteCreated): void {
  let context = dataSource.context();
  let daoId = context.getString('daoAddress');
  let metadata = event.params.metadata.toString();
  _handleVoteCreated(event, daoId, metadata);
}

// work around: to bypass context and ipfs for testing, as they are not yet supported by matchstick
export function _handleVoteCreated(
  event: VoteCreated,
  daoId: string,
  metadata: string
): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.voteId.toHexString();

  let proposalEntity = new ERC20VotingProposal(proposalId);
  proposalEntity.dao = daoId;
  proposalEntity.pkg = event.address.toHexString();
  proposalEntity.voteId = event.params.voteId;
  proposalEntity.creator = event.params.creator;
  proposalEntity.metadata = metadata;
  proposalEntity.createdAt = event.block.timestamp;

  let contract = ERC20Voting.bind(event.address);
  let vote = contract.try_getVote(event.params.voteId);

  if (!vote.reverted) {
    proposalEntity.open = vote.value.value0;
    proposalEntity.executed = vote.value.value1;
    proposalEntity.startDate = vote.value.value2;
    proposalEntity.endDate = vote.value.value3;
    proposalEntity.snapshotBlock = vote.value.value4;
    proposalEntity.relativeSupportThresholdPct = vote.value.value5;
    proposalEntity.totalSupportThresholdPct = vote.value.value6;
    proposalEntity.plenum = vote.value.value7;

    // actions
    let actions = vote.value.value11;
    for (let index = 0; index < actions.length; index++) {
      const action = actions[index];

      let actionId =
        event.address.toHexString() +
        '_' +
        event.params.voteId.toHexString() +
        '_' +
        index.toString();

      let actionEntity = new Action(actionId);
      actionEntity.to = action.to;
      actionEntity.value = action.value;
      actionEntity.data = action.data;
      actionEntity.dao = daoId;
      actionEntity.proposal = proposalId;
      actionEntity.save();
    }
  }

  proposalEntity.save();

  // update vote length
  let packageEntity = ERC20VotingPackage.load(event.address.toHexString());
  if (packageEntity) {
    let voteLength = contract.try_votesLength();
    if (!voteLength.reverted) {
      packageEntity.votesLength = voteLength.value;
      packageEntity.save();
    }
  }
}

export function handleVoteCast(event: VoteCast): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.voteId.toHexString();
  let voterProposalId = event.params.voter.toHexString() + '_' + proposalId;
  let voterProposalEntity = ERC20Vote.load(voterProposalId);
  if (!voterProposalEntity) {
    voterProposalEntity = new ERC20Vote(voterProposalId);
    voterProposalEntity.voter = event.params.voter.toHexString();
    voterProposalEntity.proposal = proposalId;
  }
  voterProposalEntity.vote = VOTER_STATE.get(event.params.choice);
  voterProposalEntity.weight = event.params.voteWeight;
  voterProposalEntity.createdAt = event.block.timestamp;
  voterProposalEntity.save();

  // voter
  let voterEntity = ERC20VotingVoter.load(event.params.voter.toHexString());
  if (!voterEntity) {
    voterEntity = new ERC20VotingVoter(event.params.voter.toHexString());
    voterEntity.address = event.params.voter.toHexString();
    voterEntity.pkg = event.address.toHexString();
    voterEntity.lastUpdated = event.block.timestamp;
    voterEntity.save();
  } else {
    voterEntity.lastUpdated = event.block.timestamp;
    voterEntity.save();
  }

  // update count
  let proposalEntity = ERC20VotingProposal.load(proposalId);
  if (proposalEntity) {
    let contract = ERC20Voting.bind(event.address);
    let vote = contract.try_getVote(event.params.voteId);
    if (!vote.reverted) {
      let voteCount = vote.value.value8.plus(
        vote.value.value9.plus(vote.value.value10)
      );
      let yes = vote.value.value8;
      proposalEntity.yes = yes;
      proposalEntity.no = vote.value.value9;
      proposalEntity.abstain = vote.value.value10;
      proposalEntity.voteCount = voteCount;
      // check if the current vote results meet
      // the conditions for the proposal to pass:
      // - Minimum participation => => (totalVotes / plenum) >= minParticipation
      // - Minimum suport => (yes / totalVotes) >= minSupport

      // expect a number between 0 and 100
      // where 0.35 => 35
      let currentParticipation = voteCount
        .times(BigInt.fromI32(100))
        .div(proposalEntity.plenum);
      // expect a number between 0 and 100
      // where 0.35 => 35
      let currentSupport = yes.times(BigInt.fromI32(100)).div(voteCount);
      // set the executable param
      proposalEntity.executable =
        currentParticipation.ge(
          proposalEntity.totalSupportThresholdPct.div(
            BigInt.fromString(TEN_POWER_16)
          )
        ) &&
        currentSupport.ge(
          proposalEntity.relativeSupportThresholdPct.div(
            BigInt.fromString(TEN_POWER_16)
          )
        );
      proposalEntity.save();
    }
  }
}

export function handleVoteExecuted(event: VoteExecuted): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.voteId.toHexString();
  let proposalEntity = ERC20VotingProposal.load(proposalId);
  if (proposalEntity) {
    proposalEntity.executed = true;
    proposalEntity.save();
  }

  // update actions
  let contract = ERC20Voting.bind(event.address);
  let vote = contract.try_getVote(event.params.voteId);
  if (!vote.reverted) {
    let actions = vote.value.value11;
    for (let index = 0; index < actions.length; index++) {
      let actionId =
        event.address.toHexString() +
        '_' +
        event.params.voteId.toHexString() +
        '_' +
        index.toString();

      let actionEntity = Action.load(actionId);
      if (actionEntity) {
        actionEntity.execResult = event.params.execResults[index];
        actionEntity.save();
      }
    }
  }
}

export function handleConfigUpdated(event: ConfigUpdated): void {
  let packageEntity = ERC20VotingPackage.load(event.address.toHexString());
  if (packageEntity) {
    packageEntity.relativeSupportThresholdPct =
      event.params.relativeSupportThresholdPct;
    packageEntity.totalSupportThresholdPct =
      event.params.totalSupportThresholdPct;
    packageEntity.minDuration = event.params.minDuration;
    packageEntity.save();
  }
}
