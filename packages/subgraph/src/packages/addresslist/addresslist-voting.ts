import {BigInt, dataSource, store} from '@graphprotocol/graph-ts';

import {
  VoteCast,
  ProposalCreated,
  ProposalExecuted,
  VotingSettingsUpdated,
  MembersAdded,
  MembersRemoved,
  AddresslistVoting
} from '../../../generated/templates/AddresslistVoting/AddresslistVoting';
import {
  Action,
  AddresslistVotingPlugin,
  AddresslistVotingProposal,
  AddresslistVotingVoter,
  AddresslistVotingVote
} from '../../../generated/schema';
import {RATIO_BASE, VOTER_OPTIONS, VOTING_MODES} from '../../utils/constants';
import {getProposalId} from '../../utils/proposals';

export function handleProposalCreated(event: ProposalCreated): void {
  let context = dataSource.context();
  let daoId = context.getString('daoAddress');
  let metdata = event.params.metadata.toString();
  _handleProposalCreated(event, daoId, metdata);
}

// work around: to bypass context and ipfs for testing, as they are not yet supported by matchstick
export function _handleProposalCreated(
  event: ProposalCreated,
  daoId: string,
  metadata: string
): void {
  let pluginAddress = event.address;
  let pluginProposalId = event.params.proposalId;
  let proposalId = getProposalId(pluginAddress, pluginProposalId);

  let proposalEntity = new AddresslistVotingProposal(proposalId);
  proposalEntity.dao = daoId;
  proposalEntity.plugin = pluginAddress.toHexString();
  proposalEntity.proposalId = pluginProposalId;
  proposalEntity.creator = event.params.creator;
  proposalEntity.metadata = metadata;
  proposalEntity.createdAt = event.block.timestamp;
  proposalEntity.creationBlockNumber = event.block.number;
  proposalEntity.startDate = event.params.startDate;
  proposalEntity.endDate = event.params.endDate;
  proposalEntity.allowFailureMap = event.params.allowFailureMap;
  proposalEntity.potentiallyExecutable = false;

  let contract = AddresslistVoting.bind(pluginAddress);
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

      let actionId = getProposalId(pluginAddress, pluginProposalId)
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
  let packageEntity = AddresslistVotingPlugin.load(pluginAddress.toHexString());
  if (packageEntity) {
    let voteLength = contract.try_proposalCount();
    if (!voteLength.reverted) {
      packageEntity.proposalCount = voteLength.value;
      packageEntity.save();
    }
  }
}

export function handleVoteCast(event: VoteCast): void {
  const pluginProposalId = event.params.proposalId;
  const member = event.params.voter.toHexString();
  const pluginAddress = event.address;
  const pluginId = pluginAddress.toHexString();
  const memberId = pluginId.concat('_').concat(member);
  let proposalId = getProposalId(pluginAddress, pluginProposalId);
  let voterVoteId = member.concat('_').concat(proposalId);
  let voteOption = VOTER_OPTIONS.get(event.params.voteOption);

  if (voteOption === 'None') {
    return;
  }

  let voterProposalVoteEntity = AddresslistVotingVote.load(voterVoteId);
  if (voterProposalVoteEntity) {
    voterProposalVoteEntity.voteReplaced = true;
    voterProposalVoteEntity.updatedAt = event.block.timestamp;
  } else {
    voterProposalVoteEntity = new AddresslistVotingVote(voterVoteId);
    voterProposalVoteEntity.voter = memberId;
    voterProposalVoteEntity.proposal = proposalId;
    voterProposalVoteEntity.createdAt = event.block.timestamp;
    voterProposalVoteEntity.voteReplaced = false;
    voterProposalVoteEntity.updatedAt = BigInt.zero();
  }
  voterProposalVoteEntity.voteOption = voteOption;
  voterProposalVoteEntity.votingPower = event.params.votingPower;
  voterProposalVoteEntity.save();

  // update count
  let proposalEntity = AddresslistVotingProposal.load(proposalId);
  if (proposalEntity) {
    let contract = AddresslistVoting.bind(event.address);
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

  let proposalEntity = AddresslistVotingProposal.load(proposalId);
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
  let packageEntity = AddresslistVotingPlugin.load(event.address.toHexString());
  if (packageEntity) {
    packageEntity.votingMode = VOTING_MODES.get(event.params.votingMode);
    packageEntity.supportThreshold = event.params.supportThreshold;
    packageEntity.minParticipation = event.params.minParticipation;
    packageEntity.minDuration = event.params.minDuration;
    packageEntity.minProposerVotingPower = event.params.minProposerVotingPower;
    packageEntity.save();
  }
}

export function handleMembersAdded(event: MembersAdded): void {
  let members = event.params.members;
  for (let index = 0; index < members.length; index++) {
    const member = members[index].toHexString();
    const pluginId = event.address.toHexString();
    const memberId = pluginId + '_' + member;

    let voterEntity = AddresslistVotingVoter.load(memberId);
    if (!voterEntity) {
      voterEntity = new AddresslistVotingVoter(memberId);
      voterEntity.address = member;
      voterEntity.plugin = pluginId;
      voterEntity.save();
    }
  }
}

export function handleMembersRemoved(event: MembersRemoved): void {
  let members = event.params.members;
  for (let index = 0; index < members.length; index++) {
    const member = members[index].toHexString();
    const pluginId = event.address.toHexString();
    const memberId = pluginId + '_' + member;

    let voterEntity = AddresslistVotingVoter.load(memberId);
    if (voterEntity) {
      store.remove('AddresslistVotingVoter', memberId);
    }
  }
}
