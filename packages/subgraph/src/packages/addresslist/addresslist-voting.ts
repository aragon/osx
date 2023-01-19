import {BigInt, dataSource, store} from '@graphprotocol/graph-ts';

import {
  VoteCast,
  ProposalCreated,
  ProposalExecuted,
  VotingSettingsUpdated,
  MembersAnnounced,
  MembersRenounced,
  AddresslistVoting
} from '../../../generated/templates/AddresslistVoting/AddresslistVoting';
import {
  Action,
  AddresslistVotingPlugin,
  AddresslistVotingProposal,
  AddresslistVotingVoter,
  AddresslistVotingVote
} from '../../../generated/schema';
import {TEN_POWER_16, VOTER_OPTIONS, VOTING_MODES} from '../../utils/constants';

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
  let proposalId =
    event.address.toHexString() + '_' + event.params.proposalId.toHexString();

  let proposalEntity = new AddresslistVotingProposal(proposalId);
  proposalEntity.dao = daoId;
  proposalEntity.plugin = event.address.toHexString();
  proposalEntity.proposalId = event.params.proposalId;
  proposalEntity.creator = event.params.creator;
  proposalEntity.metadata = metadata;
  proposalEntity.createdAt = event.block.timestamp;
  proposalEntity.creationBlockNumber = event.block.number;
  proposalEntity.startDate = event.params.startDate;
  proposalEntity.endDate = event.params.endDate;

  let contract = AddresslistVoting.bind(event.address);
  let vote = contract.try_getProposal(event.params.proposalId);

  if (!vote.reverted) {
    proposalEntity.open = vote.value.value0;
    proposalEntity.executed = vote.value.value1;

    // ProposalParameters
    let parameters = vote.value.value2;
    proposalEntity.votingMode = VOTING_MODES.get(parameters.votingMode);
    proposalEntity.supportThreshold = parameters.supportThreshold;
    proposalEntity.minParticipation = parameters.minParticipation;
    proposalEntity.snapshotBlock = parameters.snapshotBlock;

    // Tally
    let tally = vote.value.value3;
    proposalEntity.abstain = tally.abstain;
    proposalEntity.yes = tally.yes;
    proposalEntity.no = tally.no;
    proposalEntity.totalVotingPower = tally.totalVotingPower;

    // Actions
    let actions = vote.value.value4;
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
  let packageEntity = AddresslistVotingPlugin.load(event.address.toHexString());
  if (packageEntity) {
    let voteLength = contract.try_proposalCount();
    if (!voteLength.reverted) {
      packageEntity.proposalCount = voteLength.value;
      packageEntity.save();
    }
  }
}

export function handleVoteCast(event: VoteCast): void {
  const member = event.params.voter.toHexString();
  const pluginId = event.address.toHexString();
  const memberId = pluginId + '_' + member;
  let proposalId = pluginId + '_' + event.params.proposalId.toHexString();
  let voterVoteId = member + '_' + proposalId;
  let voteOption = VOTER_OPTIONS.get(event.params.voteOption);

  if (voteOption === 'None') {
    return;
  }

  let voterProposalVoteEntity = AddresslistVotingVote.load(voterVoteId);
  if (!voterProposalVoteEntity) {
    voterProposalVoteEntity = new AddresslistVotingVote(voterVoteId);
    voterProposalVoteEntity.voter = memberId;
    voterProposalVoteEntity.proposal = proposalId;
  }
  voterProposalVoteEntity.voteOption = voteOption;
  voterProposalVoteEntity.votingPower = event.params.votingPower;
  voterProposalVoteEntity.createdAt = event.block.timestamp;
  voterProposalVoteEntity.save();

  // update count
  let proposalEntity = AddresslistVotingProposal.load(proposalId);
  if (proposalEntity) {
    let contract = AddresslistVoting.bind(event.address);
    let proposal = contract.try_getProposal(event.params.proposalId);

    if (!proposal.reverted) {
      let tally = proposal.value.value3;

      let abstain = tally.abstain;
      let yes = tally.yes;
      let no = tally.no;
      let castedVotingPower = yes.plus(no.plus(abstain));

      proposalEntity.yes = yes;
      proposalEntity.no = no;
      proposalEntity.abstain = abstain;
      proposalEntity.castedVotingPower = castedVotingPower;

      // check if the current vote results meet the conditions for the proposal to pass:
      // - worst case support :  N_yes / (N_total - N_abstain) > support threshold
      // - participation      :  (N_yes + N_no + N_abstain) / N_total >= minimum participation

      // expect a number between 0 and 100
      let currentParticipation = castedVotingPower
        .times(BigInt.fromI32(100))
        .div(proposalEntity.totalVotingPower);

      let worstCaseSupport = yes
        .times(BigInt.fromI32(100))
        .div(proposalEntity.totalVotingPower.minus(abstain));

      // set the executable param
      proposalEntity.executable =
        worstCaseSupport.gt(
          proposalEntity.supportThreshold.div(BigInt.fromString(TEN_POWER_16))
        ) &&
        currentParticipation.ge(
          proposalEntity.minParticipation.div(BigInt.fromString(TEN_POWER_16))
        );
      proposalEntity.save();
    }
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.proposalId.toHexString();
  let proposalEntity = AddresslistVotingProposal.load(proposalId);
  if (proposalEntity) {
    proposalEntity.executed = true;
    proposalEntity.executionDate = event.block.timestamp;
    proposalEntity.executionBlockNumber = event.block.number;
    proposalEntity.save();
  }

  // update actions
  let contract = AddresslistVoting.bind(event.address);
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

export function handleMembersAnnounced(event: MembersAnnounced): void {
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

export function handleMembersRenounced(event: MembersRenounced): void {
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
