import {ActionBatch} from '../../generated/schema';
import {
  Executed,
  ExecutedActionsStruct,
} from '../../generated/templates/DaoTemplateV1_3_0/DAO';
import {
  generateDeterministicActionBatchId,
  generateActionBatchEntityId,
} from './ids';
import {handleAction} from './utils';
import {generateDaoEntityId} from '@aragon/osx-commons-subgraph';

export function handleExecuted(event: Executed): void {
  let actionBatchEntityId = generateActionBatchEntityId(
    event.params.actor,
    event.address,
    event.params.callId,
    event.transaction.hash,
    event.transactionLogIndex
  );

  let deterministicId = generateDeterministicActionBatchId(
    event.params.actor,
    event.address,
    event.params.callId
  );

  let actionBatch = new ActionBatch(actionBatchEntityId);

  actionBatch.dao = generateDaoEntityId(event.address);
  actionBatch.deterministicId = deterministicId;
  actionBatch.createdAt = event.block.timestamp;
  actionBatch.creator = event.params.actor;
  actionBatch.executionTxHash = event.transaction.hash;
  actionBatch.allowFailureMap = event.params.allowFailureMap;
  actionBatch.executed = true;
  actionBatch.failureMap = event.params.failureMap;
  actionBatch.save();

  let actions = event.params.actions;

  for (let index = 0; index < actions.length; index++) {
    handleAction<ExecutedActionsStruct, Executed>(
      actions[index],
      actionBatchEntityId,
      index,
      event
    );
  }
}
