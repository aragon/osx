import {BigInt, dataSource, store} from '@graphprotocol/graph-ts';

import {
  VoteCast,
  ProposalCreated,
  ProposalExecuted,
  VoteSettingsUpdated,
  AddressesAdded,
  AddressesRemoved,
  Addresslist
} from '../../../generated/templates/Addresslist/Addresslist';
import {
  Action,
  AddresslistPlugin,
  AddresslistProposal,
  AddresslistVoter,
  AddresslistVote
} from '../../../generated/schema';
import {TEN_POWER_16, VOTER_STATE} from '../../utils/constants';

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

  let proposalEntity = new AddresslistProposal(proposalId);
  proposalEntity.dao = daoId;
  proposalEntity.plugin = event.address.toHexString();
  proposalEntity.proposalId = event.params.proposalId;
  proposalEntity.creator = event.params.creator;
  proposalEntity.metadata = metadata;
  proposalEntity.createdAt = event.block.timestamp;

  let contract = Addresslist.bind(event.address);
  let vote = contract.try_getProposal(event.params.proposalId);

  if (!vote.reverted) {
    proposalEntity.open = vote.value.value0;
    proposalEntity.executed = vote.value.value1;
    proposalEntity.startDate = vote.value.value2;
    proposalEntity.endDate = vote.value.value3;
    proposalEntity.snapshotBlock = vote.value.value4;
    proposalEntity.supportThreshold = vote.value.value5;
    proposalEntity.participationThreshold = vote.value.value6;
    proposalEntity.totalVotingPower = vote.value.value7;

    // actions
    let actions = vote.value.value11;
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
  let packageEntity = AddresslistPlugin.load(event.address.toHexString());
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
  let voterProposalEntity = AddresslistVote.load(voterProposalId);
  if (!voterProposalEntity) {
    voterProposalEntity = new AddresslistVote(voterProposalId);
    voterProposalEntity.voter = event.params.voter.toHexString();
    voterProposalEntity.proposal = proposalId;
  }
  voterProposalEntity.vote = VOTER_STATE.get(event.params.choice);
  voterProposalEntity.votingPower = event.params.votingPower;
  voterProposalEntity.createdAt = event.block.timestamp;
  voterProposalEntity.save();

  // update count
  let proposalEntity = AddresslistProposal.load(proposalId);
  if (proposalEntity) {
    let contract = Addresslist.bind(event.address);
    let vote = contract.try_getProposal(event.params.proposalId);
    if (!vote.reverted) {
      let yes = vote.value.value8;
      let no = vote.value.value9;
      let abstain = vote.value.value10;
      let voteCount = yes.plus(no.plus(abstain));

      proposalEntity.yes = yes;
      proposalEntity.no = no;
      proposalEntity.abstain = abstain;
      proposalEntity.voteCount = voteCount;

      // check if the current vote results meet the conditions for the proposal to pass:
      // - participation      :  (N_yes + N_no + N_abstain) / N_total > participation threshold
      // - worst case support :  N_yes / (N_total - N_abstain) > support threshold

      // expect a number between 0 and 100
      let currentParticipation = voteCount
        .times(BigInt.fromI32(100))
        .div(proposalEntity.totalVotingPower);

      let worstCaseSupport = yes
        .times(BigInt.fromI32(100))
        .div(proposalEntity.totalVotingPower.minus(abstain));

      /*
      let currentSupport = new BigInt(0);
      if (voteCount.gt(new BigInt(0))) {
        currentSupport = yes.times(BigInt.fromI32(100)).div(yes.plus(no));
      }
      */

      // set the executable param
      proposalEntity.executable =
        currentParticipation.gt(
          proposalEntity.participationThreshold.div(
            BigInt.fromString(TEN_POWER_16)
          )
        ) &&
        worstCaseSupport.gt(
          proposalEntity.supportThreshold.div(BigInt.fromString(TEN_POWER_16))
        );
      proposalEntity.save();
    }
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.proposalId.toHexString();
  let proposalEntity = AddresslistProposal.load(proposalId);
  if (proposalEntity) {
    proposalEntity.executed = true;
    proposalEntity.save();
  }

  // update actions
  let contract = Addresslist.bind(event.address);
  let vote = contract.try_getProposal(event.params.proposalId);
  if (!vote.reverted) {
    let actions = vote.value.value10;
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

export function handleVoteSettingsUpdated(event: VoteSettingsUpdated): void {
  let packageEntity = AddresslistPlugin.load(event.address.toHexString());
  if (packageEntity) {
    packageEntity.participationThreshold = event.params.participationThreshold;
    packageEntity.supportThreshold = event.params.supportThreshold;
    packageEntity.minDuration = event.params.minDuration;
    packageEntity.save();
  }
}

export function handleAddressesAdded(event: AddressesAdded): void {
  let members = event.params.members;
  for (let index = 0; index < members.length; index++) {
    const member = members[index];
    let voterEntity = AddresslistVoter.load(member.toHexString());
    if (!voterEntity) {
      voterEntity = new AddresslistVoter(member.toHexString());
      voterEntity.address = member.toHexString();
      voterEntity.plugin = event.address.toHexString();
      voterEntity.save();
    }
  }
}

export function handleAddressesRemoved(event: AddressesRemoved): void {
  let members = event.params.members;
  for (let index = 0; index < members.length; index++) {
    const member = members[index];
    let voterEntity = AddresslistVoter.load(member.toHexString());
    if (voterEntity) {
      store.remove('AddresslistVoter', member.toHexString());
    }
  }
}
