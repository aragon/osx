import {
  AddresslistVotingProposal,
  AdminProposal,
  MultisigProposal,
  TokenVotingProposal,
  TransactionAction,
} from '../../generated/schema';
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
import {
  generateTransactionActionEntityId,
  generateDeterministicActionId,
} from './ids';
import {generateDaoEntityId} from '@aragon/osx-commons-subgraph';
import {BigInt} from '@graphprotocol/graph-ts';

// AssemblyScript struggles having multiple return types. Due to this,
// The below seems most effective way.
export function updateProposalWithFailureMap(
  proposalId: string,
  failureMap: BigInt
): boolean {
  let tokenVotingProposal = TokenVotingProposal.load(proposalId);
  if (tokenVotingProposal) {
    tokenVotingProposal.failureMap = failureMap;
    tokenVotingProposal.save();
    return true;
  }

  let multisigProposal = MultisigProposal.load(proposalId);
  if (multisigProposal) {
    multisigProposal.failureMap = failureMap;
    multisigProposal.save();
    return true;
  }

  let addresslistProposal = AddresslistVotingProposal.load(proposalId);
  if (addresslistProposal) {
    addresslistProposal.failureMap = failureMap;
    addresslistProposal.save();
    return true;
  }

  let adminProposal = AdminProposal.load(proposalId);
  if (adminProposal) {
    adminProposal.failureMap = failureMap;
    adminProposal.save();
    return true;
  }

  return false;
}

export function handleAction<
  T extends ExecutedActionsStruct,
  R extends Executed
>(action: T, transactionActionsId: string, index: i32, event: R): void {
  let actionEntity = getOrCreateActionEntity(
    action,
    transactionActionsId,
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
      transactionActionsId,
      index,
      event
    );
    return;
  }

  handleTokenTransfers(action, transactionActionsId, index, event);
}

function getOrCreateActionEntity<
  T extends ExecutedActionsStruct,
  R extends Executed
>(
  action: T,
  transactionActionId: string,
  index: i32,
  event: R
): TransactionAction {
  const deterministicActionId = generateDeterministicActionId(
    event.params.actor,
    event.address,
    event.params.callId,
    index
  );
  const actionId = generateTransactionActionEntityId(
    event.params.actor,
    event.address,
    event.params.callId,
    index,
    event.transaction.hash,
    event.transactionLogIndex
  );

  /// we shouldn't need to load the entity as it should be created each time
  let entity = TransactionAction.load(actionId);

  if (!entity) {
    entity = new TransactionAction(actionId);
    entity.deterministicId = deterministicActionId;
    entity.to = action.to;
    entity.value = action.value;
    entity.data = action.data;
    entity.transactionActions = transactionActionId;
    entity.dao = generateDaoEntityId(event.address);
  }

  return entity;
}

/**
 * Determines if the action is an ERC20, ERC721 or ERC1155 transfer and calls the appropriate handler if so.
 * Does nothing if the action is not a recognised token transfer.
 * @param action the action to validate
 * @param transactionActionsId the id container for a single set of executed actions
 * @param actionIndex the index number of the action inside the executed batch
 * @param event the Executed event emitting the event
 */
function handleTokenTransfers<
  T extends ExecutedActionsStruct,
  R extends Executed
>(action: T, transactionActionsId: string, actionIndex: i32, event: R): void {
  const methodSig = getMethodSignature(action.data);

  let handledByErc721: bool = false;
  let handledByErc1155: bool = false;

  if (isERC721Transfer(methodSig)) {
    handledByErc721 = handleERC721Action(
      action.to,
      event.address,
      action.data,
      transactionActionsId,
      actionIndex,
      event
    );
  }

  if (isERC1155TransferMethod(methodSig)) {
    handledByErc1155 = handleERC1155Action(
      action.to,
      event.address,
      action.data,
      transactionActionsId,
      actionIndex,
      event
    );
  }

  if (isERC20Transfer(methodSig) && !handledByErc721 && !handledByErc1155) {
    handleERC20Action(
      action.to,
      event.address,
      transactionActionsId,
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
