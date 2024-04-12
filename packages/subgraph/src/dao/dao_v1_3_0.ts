import {TransactionActionsProposal} from '../../generated/schema';
import {
  Executed,
  ExecutedActionsStruct,
} from '../../generated/templates/DaoTemplateV1_3_0/DAO';
import {handleAction} from './utils';
import {
  generateDaoEntityId,
  generateProposalEntityId,
  generateTransactionActionsProposalEntityId,
} from '@aragon/osx-commons-subgraph';
import {BigInt} from '@graphprotocol/graph-ts';

export function handleExecuted(event: Executed): void {
  let proposalEntityId = generateProposalEntityId(
    event.params.actor,
    BigInt.fromByteArray(event.params.callId)
  );

  let transactionActionsProposalEntityId =
    generateTransactionActionsProposalEntityId(
      proposalEntityId,
      event.transaction.hash,
      event.transactionLogIndex
    );
  let proposal = new TransactionActionsProposal(
    transactionActionsProposalEntityId
  );
  proposal.dao = generateDaoEntityId(event.address);
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
      transactionActionsProposalEntityId,
      index,
      event
    );
  }
}
