import {
  Action,
  MultisigPlugin,
  MultisigProposal,
  MultisigApprover,
  MultisigProposalApprover,
} from '../../../generated/schema';
import {
  ProposalCreated,
  ProposalExecuted,
  MembersAdded,
  MembersRemoved,
  Multisig,
  Approved,
  MultisigSettingsUpdated,
} from '../../../generated/templates/Multisig/Multisig';
import {generateMemberEntityId, generateVoterEntityId} from '../../utils/ids';
import {
  generateActionEntityId,
  generatePluginEntityId,
  generateProposalEntityId,
} from '@aragon/osx-commons-subgraph';
import {dataSource, store} from '@graphprotocol/graph-ts';

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
  let pluginAddress = event.address;
  let proposalEntityId = generateProposalEntityId(
    pluginAddress,
    pluginProposalId
  );
  let pluginEntityId = generatePluginEntityId(pluginAddress);

  let proposalEntity = new MultisigProposal(proposalEntityId);
  proposalEntity.dao = daoId;
  proposalEntity.plugin = pluginEntityId;
  proposalEntity.pluginProposalId = pluginProposalId;
  proposalEntity.creator = event.params.creator;
  proposalEntity.metadata = metadata;
  proposalEntity.createdAt = event.block.timestamp;
  proposalEntity.creationBlockNumber = event.block.number;
  proposalEntity.startDate = event.params.startDate;
  proposalEntity.endDate = event.params.endDate;
  proposalEntity.allowFailureMap = event.params.allowFailureMap;

  let contract = Multisig.bind(pluginAddress);
  let proposal = contract.try_getProposal(pluginProposalId);

  if (!proposal.reverted) {
    proposalEntity.executed = proposal.value.value0;
    proposalEntity.approvals = proposal.value.value1;

    // ProposalParameters
    let parameters = proposal.value.value2;
    proposalEntity.minApprovals = parameters.minApprovals;
    proposalEntity.snapshotBlock = parameters.snapshotBlock;
    proposalEntity.approvalReached = false;

    // Actions
    let actions = proposal.value.value3;
    for (let index = 0; index < actions.length; index++) {
      const action = actions[index];

      let actionId = generateActionEntityId(proposalEntityId, index);

      let actionEntity = new Action(actionId);
      actionEntity.to = action.to;
      actionEntity.value = action.value;
      actionEntity.data = action.data;
      actionEntity.dao = daoId;
      actionEntity.proposal = proposalEntityId;
      actionEntity.save();
    }
    proposalEntity.isSignaling = actions.length == 0;
  }

  proposalEntity.save();

  // update vote length
  let packageEntity = MultisigPlugin.load(pluginEntityId);
  if (packageEntity) {
    let voteLength = contract.try_proposalCount();
    if (!voteLength.reverted) {
      packageEntity.proposalCount = voteLength.value;
      packageEntity.save();
    }
  }
}

export function handleApproved(event: Approved): void {
  let memberAddress = event.params.approver;
  let pluginAddress = event.address;
  let memberEntityId = generateMemberEntityId(pluginAddress, memberAddress);
  let pluginProposalId = event.params.proposalId;
  let proposalEntityId = generateProposalEntityId(
    event.address,
    pluginProposalId
  );
  let approverProposalId = generateVoterEntityId(
    memberEntityId,
    proposalEntityId
  );

  let approverProposalEntity =
    MultisigProposalApprover.load(approverProposalId);
  if (!approverProposalEntity) {
    approverProposalEntity = new MultisigProposalApprover(approverProposalId);
    approverProposalEntity.approver = memberEntityId;
    approverProposalEntity.proposal = proposalEntityId;
  }
  approverProposalEntity.createdAt = event.block.timestamp;
  approverProposalEntity.save();

  // update count
  let proposalEntity = MultisigProposal.load(proposalEntityId);
  if (proposalEntity) {
    let contract = Multisig.bind(pluginAddress);
    let proposal = contract.try_getProposal(pluginProposalId);

    if (!proposal.reverted) {
      let approvals = proposal.value.value1;
      proposalEntity.approvals = approvals;

      // calculate if proposal is executable
      let minApprovalsStruct = proposal.value.value2;

      if (
        approvals >= minApprovalsStruct.minApprovals &&
        !proposalEntity.approvalReached
      ) {
        proposalEntity.approvalReached = true;
      }

      proposalEntity.save();
    }
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let pluginProposalId = event.params.proposalId;
  let proposalEntityId = generateProposalEntityId(
    event.address,
    pluginProposalId
  );

  let proposalEntity = MultisigProposal.load(proposalEntityId);
  if (proposalEntity) {
    proposalEntity.approvalReached = false;
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
    const memberAddress = members[index];
    const pluginEntityId = generatePluginEntityId(event.address);
    const memberEntityId = [pluginEntityId, memberAddress.toHexString()].join(
      '_'
    );

    let approverEntity = MultisigApprover.load(memberEntityId);
    if (!approverEntity) {
      approverEntity = new MultisigApprover(memberEntityId);
      approverEntity.address = memberAddress.toHexString();
      approverEntity.plugin = pluginEntityId;
      approverEntity.save();
    }
  }
}

export function handleMembersRemoved(event: MembersRemoved): void {
  const members = event.params.members;
  for (let index = 0; index < members.length; index++) {
    const memberAddress = members[index];
    const pluginEntityId = generatePluginEntityId(event.address);
    const memberEntityId = [pluginEntityId, memberAddress.toHexString()].join(
      '_'
    );

    const approverEntity = MultisigApprover.load(memberEntityId);
    if (approverEntity) {
      store.remove('MultisigApprover', memberEntityId);
    }
  }
}

export function handleMultisigSettingsUpdated(
  event: MultisigSettingsUpdated
): void {
  let packageEntity = MultisigPlugin.load(
    generatePluginEntityId(event.address)
  );
  if (packageEntity) {
    packageEntity.onlyListed = event.params.onlyListed;
    packageEntity.minApprovals = event.params.minApprovals;
    packageEntity.save();
  }
}
