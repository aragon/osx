import {TransactionActions} from '../../generated/schema';
import {
  Executed,
  ExecutedActionsStruct,
} from '../../generated/templates/DaoTemplateV1_3_0/DAO';
import {handleAction} from './utils';
import {generateDaoEntityId} from '@aragon/osx-commons-subgraph';
import {
  generateTransactionActionsDeterministicId,
  generateTransactionActionsEntityId,
} from './ids';
import {Bytes} from '@graphprotocol/graph-ts';

export function handleExecuted(event: Executed): void {
  let transactionActionsEntityId = generateTransactionActionsEntityId(
    event.address.toHexString(),
    event.params.actor.toHexString(),
    event.params.callId.toString(),
    event.transaction.hash,
    event.transactionLogIndex
  );

  let deterministicId = generateTransactionActionsDeterministicId(
    event.address.toHexString(),
    event.params.actor.toHexString(),
    event.params.callId.toString()
  );

  let transactionActions = new TransactionActions(transactionActionsEntityId);

  transactionActions.dao = generateDaoEntityId(event.address);
  transactionActions.deterministicId = Bytes.fromHexString(deterministicId);
  transactionActions.createdAt = event.block.timestamp;
  transactionActions.endDate = event.block.timestamp;
  transactionActions.startDate = event.block.timestamp;
  transactionActions.creator = event.params.actor;
  transactionActions.executionTxHash = event.transaction.hash;
  transactionActions.allowFailureMap = event.params.allowFailureMap;
  transactionActions.executed = true;
  transactionActions.failureMap = event.params.failureMap;
  transactionActions.save();

  let actions = event.params.actions;

  for (let index = 0; index < actions.length; index++) {
    handleAction<ExecutedActionsStruct, Executed>(
      actions[index],
      transactionActionsEntityId,
      index,
      event
    );
  }
}
