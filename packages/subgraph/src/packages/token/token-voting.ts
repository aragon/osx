import {BigInt, dataSource} from '@graphprotocol/graph-ts';

import {
  VoteCast,
  ProposalCreated,
  ProposalExecuted,
  VotingSettingsUpdated,
  TokenVoting
} from '../../../generated/templates/TokenVoting/TokenVoting';
import {
  Action,
  TokenVotingPlugin,
  TokenVotingProposal,
  TokenVotingVoter,
  TokenVotingVote
} from '../../../generated/schema';

import {RATIO_BASE, VOTER_OPTIONS, VOTING_MODES} from '../../utils/constants';

export function handleProposalCreated(event: ProposalCreated): void {
  let context = dataSource.context();
  let daoId = context.getString('daoAddress');
  let metadata = event.params.metadata.toString();
  _handleProposalCreated(event, daoId, metadata);
}

// work around: to bypass context and ipfs for testing, as they are not yet supported by matchstick
export function _handleProposalCreated(
  event: ProposalCreated,
  daoId: string,
  metadata: string
): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.proposalId.toHexString();

  let proposalEntity = new TokenVotingProposal(proposalId);
  proposalEntity.dao = daoId;
  proposalEntity.plugin = event.address.toHexString();
  proposalEntity.proposalId = event.params.proposalId;
  proposalEntity.creator = event.params.creator;
  proposalEntity.metadata = metadata;
  proposalEntity.createdAt = event.block.timestamp;
  proposalEntity.creationBlockNumber = event.block.number;
  proposalEntity.startDate = event.params.startDate;
  proposalEntity.endDate = event.params.endDate;
  proposalEntity.allowFailureMap = event.params.allowFailureMap;

  let contract = TokenVoting.bind(event.address);
  let proposal = contract.try_getProposal(event.params.proposalId);

  if (!proposal.reverted) {
    proposalEntity.open = proposal.value.value0;
    proposalEntity.executed = proposal.value.value1;

    // ProposalParameters
    let parameters = proposal.value.value2;
    proposalEntity.votingMode = VOTING_MODES.get(parameters.votingMode);
    proposalEntity.supportThreshold = parameters.supportThreshold;
    proposalEntity.snapshotBlock = parameters.snapshotBlock;
    proposalEntity.minVotingPower = parameters.minVotingPower;

    // Tally
    let tally = proposal.value.value3;
    proposalEntity.abstain = tally.abstain;
    proposalEntity.yes = tally.yes;
    proposalEntity.no = tally.no;

    proposalEntity.totalVotingPower = tally.totalVotingPower;

    // Actions
    let actions = proposal.value.value4;
    for (let index = 0; index < actions.length; index++) {
      const action = actions[index];

      let actionId =
        event.address.toHexString() +
        '_' +
        event.params.proposalId.toHexString() +
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
  let packageEntity = TokenVotingPlugin.load(event.address.toHexString());
  if (packageEntity) {
    let voteLength = contract.try_proposalCount();
    if (!voteLength.reverted) {
      packageEntity.proposalCount = voteLength.value;
      packageEntity.save();
    }
  }
}

export function handleVoteCast(event: VoteCast): void {
  let pluginId = event.address.toHexString();
  let member = event.params.voter.toHexString();
  let memberId = pluginId + '_' + member;
  let proposalId = pluginId + '_' + event.params.proposalId.toHexString();
  let voterVoteId = member + '_' + proposalId;
  let voteOption = VOTER_OPTIONS.get(event.params.voteOption);

  if (voteOption === 'None') {
    return;
  }

  let voterProposalVoteEntity = TokenVotingVote.load(voterVoteId);
  if (!voterProposalVoteEntity) {
    voterProposalVoteEntity = new TokenVotingVote(voterVoteId);
    voterProposalVoteEntity.voter = memberId;
    voterProposalVoteEntity.proposal = proposalId;
  }
  voterProposalVoteEntity.voteOption = voteOption;
  voterProposalVoteEntity.votingPower = event.params.votingPower;
  voterProposalVoteEntity.createdAt = event.block.timestamp;
  voterProposalVoteEntity.save();

  // voter
  let voterEntity = TokenVotingVoter.load(memberId);
  if (!voterEntity) {
    voterEntity = new TokenVotingVoter(memberId);
    voterEntity.address = member;
    voterEntity.plugin = pluginId;
    voterEntity.lastUpdated = event.block.timestamp;
    voterEntity.save();
  } else {
    voterEntity.lastUpdated = event.block.timestamp;
    voterEntity.save();
  }

  // update count
  let proposalEntity = TokenVotingProposal.load(proposalId);
  if (proposalEntity) {
    let contract = TokenVoting.bind(event.address);
    let proposal = contract.try_getProposal(event.params.proposalId);

    if (!proposal.reverted) {
      let parameters = proposal.value.value2;
      let tally = proposal.value.value3;

      let abstain = tally.abstain;
      let yes = tally.yes;
      let no = tally.no;
      let castedVotingPower = yes.plus(no.plus(abstain));
      let totalVotingPower = tally.totalVotingPower;

      let supportThreshold = parameters.supportThreshold;
      let minVotingPower = parameters.minVotingPower;

      let BASE = BigInt.fromString(RATIO_BASE);

      proposalEntity.yes = yes;
      proposalEntity.no = no;
      proposalEntity.abstain = abstain;
      proposalEntity.castedVotingPower = castedVotingPower;

      // check if the current vote results meet the conditions for the proposal to pass:
      // - worst-case support :  N_yes / (N_total - N_abstain) > support threshold
      // - participation      :  (N_yes + N_no + N_abstain) / N_total >= minimum participation

      let supportThresholdReachedEarly = BASE.minus(supportThreshold)
        .times(yes)
        .ge(totalVotingPower.minus(yes).minus(abstain));

      let minParticipationReached = castedVotingPower.ge(minVotingPower);

      // set the executable param
      proposalEntity.executable =
        supportThresholdReachedEarly && minParticipationReached;

      proposalEntity.save();
    }
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.proposalId.toHexString();
  let proposalEntity = TokenVotingProposal.load(proposalId);
  if (proposalEntity) {
    proposalEntity.executed = true;
    proposalEntity.executionDate = event.block.timestamp;
    proposalEntity.executionBlockNumber = event.block.number;
    proposalEntity.save();
  }

  // update actions
  let contract = TokenVoting.bind(event.address);
  let proposal = contract.try_getProposal(event.params.proposalId);
  if (!proposal.reverted) {
    let actions = proposal.value.value4;
    for (let index = 0; index < actions.length; index++) {
      let actionId =
        event.address.toHexString() +
        '_' +
        event.params.proposalId.toHexString() +
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

export function handleVotingSettingsUpdated(
  event: VotingSettingsUpdated
): void {
  let packageEntity = TokenVotingPlugin.load(event.address.toHexString());
  if (packageEntity) {
    packageEntity.votingMode = VOTING_MODES.get(event.params.votingMode);
    packageEntity.supportThreshold = event.params.supportThreshold;
    packageEntity.minParticipation = event.params.minParticipation;
    packageEntity.minDuration = event.params.minDuration;
    packageEntity.minProposerVotingPower = event.params.minProposerVotingPower;
    packageEntity.save();
  }
}
