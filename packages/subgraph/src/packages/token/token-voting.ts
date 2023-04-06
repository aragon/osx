import {BigInt, dataSource, DataSourceContext} from '@graphprotocol/graph-ts';

import {
  VoteCast,
  ProposalCreated,
  ProposalExecuted,
  VotingSettingsUpdated,
  MembershipContractAnnounced,
  TokenVoting
} from '../../../generated/templates/TokenVoting/TokenVoting';

import {GovernanceERC20} from '../../../generated/templates';

import {
  Action,
  TokenVotingPlugin,
  TokenVotingProposal,
  TokenVotingVoter,
  TokenVotingVote
} from '../../../generated/schema';

import {RATIO_BASE, VOTER_OPTIONS, VOTING_MODES} from '../../utils/constants';
import {fetchERC20} from '../../utils/tokens/erc20';
import {getProposalId} from '../../utils/proposals';

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
  let pluginProposalId = event.params.proposalId;
  let proposalId = getProposalId(event.address, pluginProposalId);

  let proposalEntity = new TokenVotingProposal(proposalId);
  proposalEntity.dao = daoId;
  proposalEntity.plugin = event.address.toHexString();
  proposalEntity.proposalId = pluginProposalId;
  proposalEntity.creator = event.params.creator;
  proposalEntity.metadata = metadata;
  proposalEntity.createdAt = event.block.timestamp;
  proposalEntity.creationBlockNumber = event.block.number;
  proposalEntity.startDate = event.params.startDate;
  proposalEntity.endDate = event.params.endDate;
  proposalEntity.allowFailureMap = event.params.allowFailureMap;
  proposalEntity.potentiallyExecutable = false;

  let contract = TokenVoting.bind(event.address);
  let proposal = contract.try_getProposal(pluginProposalId);

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

    // Actions
    let actions = proposal.value.value4;
    for (let index = 0; index < actions.length; index++) {
      const action = actions[index];

      let actionId = getProposalId(event.address, pluginProposalId)
        .concat('_')
        .concat(index.toString());

      let actionEntity = new Action(actionId);
      actionEntity.to = action.to;
      actionEntity.value = action.value;
      actionEntity.data = action.data;
      actionEntity.dao = daoId;
      actionEntity.proposal = proposalId;
      actionEntity.save();
    }

    // totalVotingPower
    proposalEntity.totalVotingPower = contract.try_totalVotingPower(
      parameters.snapshotBlock
    ).value;
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
  let voter = event.params.voter.toHexString();
  let voterId = pluginId.concat('_').concat(voter);
  let pluginProposalId = event.params.proposalId;
  let proposalId = getProposalId(event.address, pluginProposalId);
  let voterVoteId = voter.concat('_').concat(proposalId);
  let voteOption = VOTER_OPTIONS.get(event.params.voteOption);

  if (voteOption === 'None') {
    return;
  }

  let voterProposalVoteEntity = TokenVotingVote.load(voterVoteId);
  if (voterProposalVoteEntity) {
    voterProposalVoteEntity.voteReplaced = true;
    voterProposalVoteEntity.updatedAt = event.block.timestamp;
  } else {
    voterProposalVoteEntity = new TokenVotingVote(voterVoteId);
    voterProposalVoteEntity.voter = voterId;
    voterProposalVoteEntity.proposal = proposalId;
    voterProposalVoteEntity.createdAt = event.block.timestamp;
    voterProposalVoteEntity.voteReplaced = false;
    voterProposalVoteEntity.updatedAt = BigInt.zero();
  }
  voterProposalVoteEntity.voteOption = voteOption;
  voterProposalVoteEntity.votingPower = event.params.votingPower;
  voterProposalVoteEntity.save();

  // voter
  let voterEntity = TokenVotingVoter.load(voterId);
  if (!voterEntity) {
    voterEntity = new TokenVotingVoter(voterId);
    voterEntity.address = voter;
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
    let proposal = contract.try_getProposal(pluginProposalId);

    if (!proposal.reverted) {
      let parameters = proposal.value.value2;
      let tally = proposal.value.value3;
      let totalVotingPowerCall = contract.try_totalVotingPower(
        parameters.snapshotBlock
      );

      if (!totalVotingPowerCall.reverted) {
        let abstain = tally.abstain;
        let yes = tally.yes;
        let no = tally.no;
        let castedVotingPower = yes.plus(no).plus(abstain);
        let totalVotingPower = totalVotingPowerCall.value;
        let noVotesWorstCase = totalVotingPower.minus(yes).minus(abstain);

        let supportThreshold = parameters.supportThreshold;
        let minVotingPower = parameters.minVotingPower;

        let BASE = BigInt.fromString(RATIO_BASE);

        proposalEntity.yes = yes;
        proposalEntity.no = no;
        proposalEntity.abstain = abstain;
        proposalEntity.castedVotingPower = castedVotingPower;

        // check if the current vote results meet the conditions for the proposal to pass:

        // `(1 - supportThreshold) * N_yes > supportThreshold *  N_no,worst-case`
        let supportThresholdReachedEarly = BASE.minus(supportThreshold)
          .times(yes)
          .gt(supportThreshold.times(noVotesWorstCase));

        // `(1 - supportThreshold) * N_yes > supportThreshold *  N_no
        let supportThresholdReached = BASE.minus(supportThreshold)
          .times(yes)
          .gt(supportThreshold.times(no));

        // `N_yes + N_no + N_abstain >= minVotingPower = minParticipation * N_total`
        let minParticipationReached = castedVotingPower.ge(minVotingPower);

        // Used when proposal has ended.
        proposalEntity.potentiallyExecutable =
          supportThresholdReached && minParticipationReached;

        // Used when proposal has not ended.
        proposalEntity.earlyExecutable =
          supportThresholdReachedEarly &&
          minParticipationReached &&
          proposalEntity.votingMode === VOTING_MODES.get(1);
      }
      proposalEntity.save();
    }
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let pluginProposalId = event.params.proposalId;
  let proposalId = getProposalId(event.address, pluginProposalId);

  let proposalEntity = TokenVotingProposal.load(proposalId);
  if (proposalEntity) {
    proposalEntity.executed = true;
    proposalEntity.potentiallyExecutable = false;
    proposalEntity.executionDate = event.block.timestamp;
    proposalEntity.executionBlockNumber = event.block.number;
    proposalEntity.executionTxHash = event.transaction.hash;
    proposalEntity.save();
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

export function handleMembershipContractAnnounced(
  event: MembershipContractAnnounced
): void {
  let token = event.params.definingContract;
  let packageEntity = TokenVotingPlugin.load(event.address.toHexString());

  if (packageEntity) {
    let contract = fetchERC20(token);
    if (contract) {
      packageEntity.token = contract.id;

      packageEntity.save();

      // Both GovernanceWrappedERC20/GovernanceERC20 use the `Transfer` event, so
      // It's safe to create the same type of template for them.
      let context = new DataSourceContext();
      context.setString('pluginId', event.address.toHexString());
      GovernanceERC20.createWithContext(event.params.definingContract, context);
    }
  }
}
