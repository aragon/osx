import {dataSource, store} from '@graphprotocol/graph-ts';

import {
  ProposalCreated,
  ProposalExecuted,
  AddressesAdded,
  AddressesRemoved,
  Multisig,
  Approved,
  MinApprovalUpdated
} from '../../../generated/templates/Multisig/Multisig';
import {
  Action,
  MultisigPlugin,
  MultisigProposal,
  MultisigVoter,
  MultisigVoterProposal
} from '../../../generated/schema';

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

  let proposalEntity = new MultisigProposal(proposalId);
  proposalEntity.dao = daoId;
  proposalEntity.plugin = event.address.toHexString();
  proposalEntity.proposalId = event.params.proposalId;
  proposalEntity.creator = event.params.creator;
  proposalEntity.metadata = metadata;
  proposalEntity.createdAt = event.block.timestamp;
  proposalEntity.creationBlockNumber = event.block.number;

  let contract = Multisig.bind(event.address);
  let vote = contract.try_getProposal(event.params.proposalId);

  if (!vote.reverted) {
    proposalEntity.open = vote.value.value0;
    proposalEntity.executed = vote.value.value1;

    // ProposalParameters
    let parameters = vote.value.value2;
    proposalEntity.minApprovals = parameters.minApprovals;
    proposalEntity.snapshotBlock = parameters.snapshotBlock;

    // Tally
    let tally = vote.value.value3;
    proposalEntity.approvals = tally.approvals;
    proposalEntity.addresslistLength = tally.addresslistLength;

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
  let packageEntity = MultisigPlugin.load(event.address.toHexString());
  if (packageEntity) {
    let voteLength = contract.try_proposalCount();
    if (!voteLength.reverted) {
      packageEntity.proposalCount = voteLength.value;
      packageEntity.save();
    }
  }
}

export function handleApproved(event: Approved): void {
  const member = event.params.approver.toHexString();
  const pluginId = event.address.toHexString();
  const memberId = pluginId + '_' + member;

  let proposalId = pluginId + '_' + event.params.proposalId.toHexString();
  let voterProposalId = member + '_' + proposalId;
  let voterProposalEntity = MultisigVoterProposal.load(voterProposalId);
  if (!voterProposalEntity) {
    voterProposalEntity = new MultisigVoterProposal(voterProposalId);
    voterProposalEntity.voter = memberId;
    voterProposalEntity.proposal = proposalId;
  }
  voterProposalEntity.createdAt = event.block.timestamp;
  voterProposalEntity.save();

  // update count
  let proposalEntity = MultisigProposal.load(proposalId);
  if (proposalEntity) {
    let contract = Multisig.bind(event.address);
    let proposal = contract.try_getProposal(event.params.proposalId);

    if (!proposal.reverted) {
      let parameters = proposal.value.value2;
      let tally = proposal.value.value3;

      proposalEntity.approvals = tally.approvals;

      // check if the current total number of approvals meet the conditions for the proposal to pass:
      // - approvals >= minApprovals
      let executable = tally.approvals.ge(parameters.minApprovals);

      // set the executable param
      proposalEntity.executable = executable;
      proposalEntity.save();
    }
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.proposalId.toHexString();
  let proposalEntity = MultisigProposal.load(proposalId);
  if (proposalEntity) {
    proposalEntity.open = false;
    proposalEntity.executed = true;
    proposalEntity.executionDate = event.block.timestamp;
    proposalEntity.executionBlockNumber = event.block.number;
    proposalEntity.save();
  }

  // update actions
  let contract = Multisig.bind(event.address);
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

export function handleMinApprovalUpdated(event: MinApprovalUpdated): void {
  let packageEntity = MultisigPlugin.load(event.address.toHexString());
  if (packageEntity) {
    packageEntity.minApprovals = event.params.minApprovals;
    packageEntity.save();
  }
}

export function handleAddressesAdded(event: AddressesAdded): void {
  const members = event.params.members;
  for (let index = 0; index < members.length; index++) {
    const member = members[index].toHexString();
    const pluginId = event.address.toHexString();
    const memberId = pluginId + '_' + member;

    let voterEntity = MultisigVoter.load(memberId);
    if (!voterEntity) {
      voterEntity = new MultisigVoter(memberId);
      voterEntity.address = member;
      voterEntity.plugin = pluginId;
      voterEntity.save();
    }
  }
}

export function handleAddressesRemoved(event: AddressesRemoved): void {
  const members = event.params.members;
  for (let index = 0; index < members.length; index++) {
    const member = members[index].toHexString();
    const pluginId = event.address.toHexString();
    const memberId = pluginId + '_' + member;

    const voterEntity = MultisigVoter.load(memberId);
    if (voterEntity) {
      store.remove('MultisigVoter', memberId);
    }
  }
}
