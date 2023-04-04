import {TransactionActionsProposal} from '../../generated/schema';
import {
  Executed,
  ExecutedActionsStruct
} from '../../generated/templates/DaoTemplateV1_2_0/DAO';
import {handleAction} from './utils';

export function handleExecuted(event: Executed): void {
  let proposalId = event.params.actor
    .toHexString()
    .concat('_')
    .concat(event.params.callId.toHexString());

  proposalId = proposalId
    .concat('_')
    .concat(event.transaction.hash.toHexString())
    .concat('_')
    .concat(event.transactionLogIndex.toHexString());
  let proposal = new TransactionActionsProposal(proposalId);
  proposal.dao = event.address.toHexString();
  proposal.createdAt = event.block.timestamp;
  proposal.endDate = event.block.timestamp;
  proposal.startDate = event.block.timestamp;
  proposal.creator = event.params.actor;
  proposal.executionTxHash = event.transaction.hash;
  proposal.allowFailureMap = event.params.allowFailureMap;
  proposal.executed = true;
  proposal.failureMap = event.params.failureMap;
  proposal.save();

  let actions = event.params.actions;

  for (let index = 0; index < actions.length; index++) {
    handleAction<ExecutedActionsStruct, Executed>(
      actions[index],
      proposalId,
      index,
      event
    );
  }
}
