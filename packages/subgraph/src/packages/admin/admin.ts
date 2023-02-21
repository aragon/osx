import {dataSource, DataSourceContext} from '@graphprotocol/graph-ts';

import {
  MembershipContractAnnounced,
  ProposalCreated,
  ProposalExecuted
} from '../../../generated/templates/Admin/Admin';
import {
  Action,
  AdministratorAdminPlugin,
  AdminProposal,
  Administrator
} from '../../../generated/schema';
import {AdminMembers} from '../../../generated/templates';

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

  let pluginId = event.address.toHexString();

  let adminstratorAddress = event.params.creator;

  let proposalEntity = new AdminProposal(proposalId);
  proposalEntity.dao = daoId;
  proposalEntity.plugin = pluginId;
  proposalEntity.proposalId = event.params.proposalId;
  proposalEntity.creator = adminstratorAddress;
  proposalEntity.metadata = metadata;
  proposalEntity.executed = false;
  proposalEntity.createdAt = event.block.timestamp;
  proposalEntity.startDate = event.params.startDate;
  proposalEntity.endDate = event.params.endDate;
  proposalEntity.administrator = adminstratorAddress.toHexString();
  proposalEntity.allowFailureMap = event.params.allowFailureMap;

  // Adminstrator
  let adminstratorId = adminstratorAddress.toHexString() + '_' + pluginId;
  let adminMemberEntity = AdministratorAdminPlugin.load(adminstratorId);
  if (!adminMemberEntity) {
    adminMemberEntity = new AdministratorAdminPlugin(adminstratorId);
    adminMemberEntity.administrator = adminstratorAddress.toHexString();
    adminMemberEntity.plugin = pluginId;
    adminMemberEntity.save();
  }
  let adminstratorEntity = Administrator.load(
    adminstratorAddress.toHexString()
  );
  if (!adminstratorEntity) {
    adminstratorEntity = new Administrator(adminstratorAddress.toHexString());
    adminstratorEntity.address = adminstratorAddress.toHexString();
    adminstratorEntity.save();
  }

  // actions
  let actions = event.params.actions;
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

  proposalEntity.save();
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposalId =
    event.address.toHexString() + '_' + event.params.proposalId.toHexString();
  let proposalEntity = AdminProposal.load(proposalId);
  if (proposalEntity) {
    proposalEntity.executed = true;
    proposalEntity.executionTxHash = event.transaction.hash;
    proposalEntity.save();
  }
}

export function handleMembershipContractAnnounced(
  event: MembershipContractAnnounced
): void {
  let context = new DataSourceContext();
  context.setString('pluginAddress', event.address.toHexString());
  context.setString(
    'permissionId',
    '0xf281525e53675515a6ba7cc7bea8a81e649b3608423ee2d73be1752cea887889' // keccack256 of EXECUTE_PROPOSAL_PERMISSION
  );
  AdminMembers.createWithContext(event.params.definingContract, context);
}
