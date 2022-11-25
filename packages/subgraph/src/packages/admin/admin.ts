import {dataSource} from '@graphprotocol/graph-ts';

import {
  ProposalCreated,
  ProposalExecuted
} from '../../../generated/templates/Admin/AdminAddress';
import {Action, AdminProposal} from '../../../generated/schema';

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

  let proposalEntity = new AdminProposal(proposalId);
  proposalEntity.dao = daoId;
  proposalEntity.plugin = event.address.toHexString();
  proposalEntity.proposalId = event.params.proposalId;
  proposalEntity.creator = event.params.creator.toHexString();
  proposalEntity.metadata = metadata;
  proposalEntity.createdAt = event.block.timestamp;

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
    proposalEntity.save();

    // update actions
    let actions = proposalEntity.actions;
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
