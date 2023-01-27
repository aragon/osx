import {dataSource} from '@graphprotocol/graph-ts';

import {
  MembershipContractAnnounced,
  ProposalCreated,
  ProposalExecuted
} from '../../../generated/templates/Admin/Admin';
import {
  Action,
  AdminstratorAdminPlugin,
  AdminProposal,
  Adminstrator
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
  proposalEntity.adminstrator = adminstratorAddress.toHexString();
  proposalEntity.allowFailureMap = event.params.allowFailureMap;

  // Adminstrator
  let adminstratorId = adminstratorAddress.toHexString() + '_' + pluginId;
  let adminMemberEntity = AdminstratorAdminPlugin.load(adminstratorId);
  if (!adminMemberEntity) {
    adminMemberEntity = new AdminstratorAdminPlugin(adminstratorId);
    adminMemberEntity.administrator = adminstratorAddress.toHexString();
    adminMemberEntity.plugin = pluginId;
    adminMemberEntity.save();
  }
  let adminstratorEntity = Adminstrator.load(adminstratorAddress.toHexString());
  if (!adminstratorEntity) {
    adminstratorEntity = new Adminstrator(adminstratorAddress.toHexString());
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

    // update actions
    let actionsResultArray = event.params.execResults;
    for (let index = 0; index < actionsResultArray.length; index++) {
      // re-create action id
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

export function handleMembershipContractAnnounced(
  event: MembershipContractAnnounced
): void {
  let dao = event.params.definingContract;
  let packageEntity = AdminstratorAdminPlugin.load(event.address.toHexString());

  if (packageEntity) {
    // TODO: Query `dao` for addresses holding the `EXECUTE_PROPOSAL_PERMISSION` on `where = event.address` and store them as `administrators`
    // <MISSING_IMPLEMENTATION>
    // packageEntity.save();
  }
}
