import {Action} from '../../generated/schema';
import {
  Executed,
  ExecutedActionsStruct,
} from '../../generated/templates/DaoTemplateV1_0_0/DAO';
import {getMethodSignature} from '../utils/bytes';
import {
  ERC721_transferFrom,
  ERC721_safeTransferFromNoData,
  ERC721_safeTransferFromWithData,
  ERC20_transfer,
  ERC20_transferFrom,
  ERC1155_safeBatchTransferFrom,
  ERC1155_safeTransferFrom,
} from '../utils/tokens/common';
import {handleERC20Action} from '../utils/tokens/erc20';
import {handleERC721Action} from '../utils/tokens/erc721';
import {handleERC1155Action} from '../utils/tokens/erc1155';
import {handleNativeAction} from '../utils/tokens/eth';
import {generateActionEntityId, generateDeterministicActionId} from './ids';
import {generateDaoEntityId} from '@aragon/osx-commons-subgraph';
import {BigInt} from '@graphprotocol/graph-ts';

export function handleAction<
  T extends ExecutedActionsStruct,
  R extends Executed
>(action: T, actionBatchId: string, index: i32, event: R): void {
  let actionEntity = getOrCreateActionEntity(
    action,
    actionBatchId,
    index,
    event
  );
  actionEntity.execResult = event.params.execResults[index];
  actionEntity.save();

  if (isNativeTokenAction(action)) {
    handleNativeAction(
      event.address,
      action.to,
      action.value,
      'Native Token Withdraw',
      actionBatchId,
      index,
      event
    );
    return;
  }

  handleTokenTransfers(action, actionBatchId, index, event);
}

function getOrCreateActionEntity<
  T extends ExecutedActionsStruct,
  R extends Executed
>(action: T, actionBatchId: string, index: i32, event: R): Action {
  const deterministicActionId = generateDeterministicActionId(
    event.params.actor,
    event.address,
    event.params.callId,
    index
  );
  const actionId = generateActionEntityId(
    event.params.actor,
    event.address,
    event.params.callId,
    index,
    event.transaction.hash,
    event.transactionLogIndex
  );

  const entity = new Action(actionId);
  entity.deterministicId = deterministicActionId;
  entity.to = action.to;
  entity.value = action.value;
  entity.data = action.data;
  entity.actionBatch = actionBatchId;
  entity.dao = generateDaoEntityId(event.address);

  return entity;
}

/**
 * Determines if the action is an ERC20, ERC721 or ERC1155 transfer and calls the appropriate handler if so.
 * Does nothing if the action is not a recognised token transfer.
 * @param action the action to validate
 * @param actionBatchId the id container for a single set of executed actions
 * @param actionIndex the index number of the action inside the executed batch
 * @param event the Executed event emitting the event
 */
function handleTokenTransfers<
  T extends ExecutedActionsStruct,
  R extends Executed
>(action: T, actionBatchId: string, actionIndex: i32, event: R): void {
  const methodSig = getMethodSignature(action.data);

  let handledByErc721: bool = false;
  let handledByErc1155: bool = false;

  if (isERC721Transfer(methodSig)) {
    handledByErc721 = handleERC721Action(
      action.to,
      event.address,
      action.data,
      actionBatchId,
      actionIndex,
      event
    );
  }

  if (isERC1155TransferMethod(methodSig)) {
    handledByErc1155 = handleERC1155Action(
      action.to,
      event.address,
      action.data,
      actionBatchId,
      actionIndex,
      event
    );
  }

  if (isERC20Transfer(methodSig) && !handledByErc721 && !handledByErc1155) {
    handleERC20Action(
      action.to,
      event.address,
      actionBatchId,
      action.data,
      actionIndex,
      event
    );
  }
}

function isERC721Transfer(methodSig: string): bool {
  return [
    ERC721_transferFrom,
    ERC721_safeTransferFromNoData,
    ERC721_safeTransferFromWithData,
  ].includes(methodSig);
}

function isERC20Transfer(methodSig: string): bool {
  return [ERC20_transfer, ERC20_transferFrom].includes(methodSig);
}

function isNativeTokenAction<T extends ExecutedActionsStruct>(action: T): bool {
  return action.data.toHexString() === '0x' && action.value.gt(BigInt.zero());
}

function isERC1155TransferMethod(methodSig: string): bool {
  return [ERC1155_safeBatchTransferFrom, ERC1155_safeTransferFrom].includes(
    methodSig
  );
}
