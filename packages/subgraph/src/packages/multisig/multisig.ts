import {dataSource, store, BigInt} from '@graphprotocol/graph-ts';

import {
  ProposalCreated,
  ProposalExecuted,
  MembersAdded,
  MembersRemoved,
  Multisig,
  Approved,
  MultisigSettingsUpdated
} from '../../../generated/templates/Multisig/Multisig';
import {
  Action,
  MultisigPlugin,
  MultisigProposal,
  MultisigApprover,
  MultisigProposalApprover
} from '../../../generated/schema';
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
  let pluginProposalId = event.params.proposalId;
  let proposalId = getProposalId(event.address, pluginProposalId);

  let proposalEntity = new MultisigProposal(proposalId);
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

  let contract = Multisig.bind(event.address);
  let vote = contract.try_getProposal(pluginProposalId);

  if (!vote.reverted) {
    proposalEntity.executed = vote.value.value0;
    proposalEntity.approvals = vote.value.value1;

    // ProposalParameters
    let parameters = vote.value.value2;
    proposalEntity.minApprovals = parameters.minApprovals;
    proposalEntity.snapshotBlock = parameters.snapshotBlock;

    // if minApproval is 1, the proposal is always executable
    if (parameters.minApprovals == 1) {
      proposalEntity.potentiallyExecutable = true;
    } else {
      proposalEntity.potentiallyExecutable = false;
    }

    // Actions
    let actions = vote.value.value3;
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
  const memberId = pluginId.concat('_').concat(member);
  let pluginProposalId = event.params.proposalId;
  let proposalId = getProposalId(event.address, pluginProposalId);
  let approverProposalId = member.concat('_').concat(proposalId);

  let approverProposalEntity = MultisigProposalApprover.load(
    approverProposalId
  );
  if (!approverProposalEntity) {
    approverProposalEntity = new MultisigProposalApprover(approverProposalId);
    approverProposalEntity.approver = memberId;
    approverProposalEntity.proposal = proposalId;
  }
  approverProposalEntity.createdAt = event.block.timestamp;
  approverProposalEntity.save();

  // update count
  let proposalEntity = MultisigProposal.load(proposalId);
  if (proposalEntity) {
    let contract = Multisig.bind(event.address);
    let proposal = contract.try_getProposal(pluginProposalId);

    if (!proposal.reverted) {
      let approvals = proposal.value.value1;
      proposalEntity.approvals = approvals;

      // calculate if proposal is executable
      let minApprovalsStruct = proposal.value.value2;

      if (
        approvals >= minApprovalsStruct.minApprovals &&
        !proposalEntity.potentiallyExecutable
      ) {
        proposalEntity.potentiallyExecutable = true;
      }

      proposalEntity.save();
    }
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let pluginProposalId = event.params.proposalId;
  let proposalId = getProposalId(event.address, pluginProposalId);

  let proposalEntity = MultisigProposal.load(proposalId);
  if (proposalEntity) {
    proposalEntity.potentiallyExecutable = false;
    proposalEntity.executed = true;
    proposalEntity.executionDate = event.block.timestamp;
    proposalEntity.executionBlockNumber = event.block.number;
    proposalEntity.executionTxHash = event.transaction.hash;
    proposalEntity.save();
  }
}

export function handleMembersAdded(event: MembersAdded): void {
  const members = event.params.members;
  for (let index = 0; index < members.length; index++) {
    const member = members[index].toHexString();
    const pluginId = event.address.toHexString();
    const memberId = pluginId + '_' + member;

    let approverEntity = MultisigApprover.load(memberId);
    if (!approverEntity) {
      approverEntity = new MultisigApprover(memberId);
      approverEntity.address = member;
      approverEntity.plugin = pluginId;
      approverEntity.save();
    }
  }
}

export function handleMembersRemoved(event: MembersRemoved): void {
  const members = event.params.members;
  for (let index = 0; index < members.length; index++) {
    const member = members[index].toHexString();
    const pluginId = event.address.toHexString();
    const memberId = pluginId + '_' + member;

    const approverEntity = MultisigApprover.load(memberId);
    if (approverEntity) {
      store.remove('MultisigApprover', memberId);
    }
  }
}

export function handleMultisigSettingsUpdated(
  event: MultisigSettingsUpdated
): void {
  let packageEntity = MultisigPlugin.load(event.address.toHexString());
  if (packageEntity) {
    packageEntity.onlyListed = event.params.onlyListed;
    packageEntity.minApprovals = event.params.minApprovals;
    packageEntity.save();
  }
}
