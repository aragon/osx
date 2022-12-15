import {BigInt, dataSource} from '@graphprotocol/graph-ts';

import {
  VoteCast,
  ProposalCreated,
  ProposalExecuted,
  MajorityVotingSettingsUpdated,
  TokenVoting
} from '../../../generated/templates/TokenVoting/TokenVoting';
import {
  Action,
  TokenVotingPlugin,
  TokenVotingProposal,
  TokenVotingVoter,
  TokenVotingVote
} from '../../../generated/schema';

import {TEN_POWER_16, VOTER_OPTIONS, VOTE_MODES} from '../../utils/constants';

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

  let contract = TokenVoting.bind(event.address);
  let proposal = contract.try_getProposal(event.params.proposalId);

  if (!proposal.reverted) {
    proposalEntity.open = proposal.value.value0;
    proposalEntity.executed = proposal.value.value1;

    // Configuration
    let configuration = proposal.value.value2;
    proposalEntity.voteMode = VOTE_MODES.get(configuration.voteMode);
    proposalEntity.supportThreshold = configuration.supportThreshold;
    proposalEntity.minParticipation = configuration.minParticipation;
    proposalEntity.startDate = configuration.startDate;
    proposalEntity.endDate = configuration.endDate;
    proposalEntity.snapshotBlock = configuration.snapshotBlock;

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
  let proposalId =
    event.address.toHexString() + '_' + event.params.proposalId.toHexString();
  let voterProposalId = event.params.voter.toHexString() + '_' + proposalId;
  let voterProposalEntity = TokenVotingVote.load(voterProposalId);
  if (!voterProposalEntity) {
    voterProposalEntity = new TokenVotingVote(voterProposalId);
    voterProposalEntity.voter = event.params.voter.toHexString();
    voterProposalEntity.proposal = proposalId;
  }
  voterProposalEntity.voteOption = VOTER_OPTIONS.get(event.params.voteOption);
  voterProposalEntity.votingPower = event.params.votingPower;
  voterProposalEntity.createdAt = event.block.timestamp;
  voterProposalEntity.save();

  // voter
  let voterEntity = TokenVotingVoter.load(event.params.voter.toHexString());
  if (!voterEntity) {
    voterEntity = new TokenVotingVoter(event.params.voter.toHexString());
    voterEntity.address = event.params.voter.toHexString();
    voterEntity.plugin = event.address.toHexString();
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
      let tally = proposal.value.value3;

      let abstain = tally.abstain;
      let yes = tally.yes;
      let no = tally.no;
      let voteCount = yes.plus(no.plus(abstain));

      proposalEntity.yes = yes;
      proposalEntity.no = no;
      proposalEntity.abstain = abstain;
      proposalEntity.voteCount = voteCount;

      // check if the current vote results meet the conditions for the proposal to pass:
      // - worst case support :  N_yes / (N_total - N_abstain) > support threshold
      // - participation      :  (N_yes + N_no + N_abstain) / N_total >= minimum participation

      // expect a number between 0 and 100
      let currentParticipation = voteCount
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

export function handleMajorityVotingSettingsUpdated(
  event: MajorityVotingSettingsUpdated
): void {
  let packageEntity = TokenVotingPlugin.load(event.address.toHexString());
  if (packageEntity) {
    packageEntity.voteMode = VOTE_MODES.get(event.params.voteMode);
    packageEntity.supportThreshold = event.params.supportThreshold;
    packageEntity.minParticipation = event.params.minParticipation;
    packageEntity.minDuration = event.params.minDuration;
    packageEntity.minProposerVotingPower = event.params.minProposerVotingPower;
    packageEntity.save();
  }
}
