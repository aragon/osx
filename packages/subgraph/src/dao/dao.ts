import {BigInt, Bytes, log, store} from '@graphprotocol/graph-ts';

import {
  MetadataSet,
  Executed,
  Deposited,
  NativeTokenDeposited,
  Granted,
  Revoked,
  TrustedForwarderSet,
  SignatureValidatorSet,
  StandardCallbackRegistered,
  CallbackReceived
} from '../../generated/templates/DaoTemplate/DAO';
import {
  Dao,
  ContractPermissionId,
  Permission,
  StandardCallback,
  Action,
  TransactionActionsProposal
} from '../../generated/schema';

import {ADDRESS_ZERO} from '../utils/constants';

import {handleERC721Action, handleERC721Received} from '../utils/tokens/erc721';
import {handleERC20Action, handleERC20Deposit} from '../utils/tokens/erc20';
import {handleNativeAction, handleNativeDeposit} from '../utils/tokens/eth';
import {
  ERC20_transfer,
  ERC20_transferFrom,
  ERC721_safeTransferFromNoData,
  ERC721_safeTransferFromWithData,
  ERC721_transferFrom,
  onERC721Received
} from '../utils/tokens/common';

export function handleMetadataSet(event: MetadataSet): void {
  let daoId = event.address.toHexString();
  let metadata = event.params.metadata.toString();
  _handleMetadataSet(daoId, metadata);
}

export function _handleMetadataSet(daoId: string, metadata: string): void {
  let entity = Dao.load(daoId);
  if (entity) {
    entity.metadata = metadata;
    entity.save();
  }
}

export function handleCallbackReceived(event: CallbackReceived): void {
  let functionSig = event.params.sig;

  if (functionSig.equals(Bytes.fromHexString(onERC721Received))) {
    handleERC721Received(
      event.params.sender,
      event.address,
      event.params.data,
      event
    );
  }
}

export function handleExecuted(event: Executed): void {
  let proposalId = event.params.actor
    .toHexString()
    .concat('_')
    .concat(event.params.callId.toHexString());

  // If proposal exists, it belongs to one of the plugins.
  // Otherwise, we fallback and create it
  // (in case execute was called without through any plugin).
  let proposal = TransactionActionsProposal.load(proposalId);
  if (!proposal) {
    proposal = new TransactionActionsProposal(proposalId);
    proposal.dao = event.address.toHexString();
    proposal.createdAt = event.block.timestamp;
    proposal.endDate = event.block.timestamp;
    proposal.startDate = event.block.timestamp;
    proposal.creator = event.params.actor;
    proposal.executionTxHash = event.transaction.hash;
    // Since DAO doesn't emit allowFailureMap by mistake, we got no choice now.
    // Using event.params.failureMap is still better than assining 0
    // Becau
    proposal.allowFailureMap = BigInt.zero();
    proposal.executed = true;
    proposal.failureMap = event.params.failureMap;
    proposal.save();
  }

  let actions = event.params.actions;

  for (let index = 0; index < actions.length; index++) {
    const action = actions[index];

    let actionId = proposalId.concat('_').concat(index.toString());
    let actionEntity = Action.load(actionId);

    // In case the execute on the dao is called by the address
    // That we don't currently index for the actions in the subgraph,
    // we fallback and still create an action, but no attachment to the proposal.
    // NOTE that it's important to generate action id differently to not allow overwriting.
    if (!actionEntity) {
      actionId = actionId
        .concat('_')
        .concat(event.transaction.hash.toHexString())
        .concat('_')
        .concat(event.transactionLogIndex.toHexString());
      actionEntity = new Action(actionId);
      actionEntity.to = action.to;
      actionEntity.value = action.value;
      actionEntity.data = action.data;
      actionEntity.proposal = proposal.id;
      actionEntity.dao = event.address.toHexString();
    }

    actionEntity.execResult = event.params.execResults[index];
    actionEntity.save();

    if (action.data.toHexString() == '0x' && action.value.gt(BigInt.zero())) {
      handleNativeAction(
        event.address,
        action.to,
        action.value,
        'Native Token Withdraw',
        proposalId,
        index,
        event
      );
      continue;
    }

    let methodSig = action.data.toHexString().slice(0, 10);

    // Since ERC721 transferFrom and ERC20 transferFrom have the same signature,
    // The below first checks if it's ERC721 by calling `supportsInterface` and then
    // moves to ERC20 check. Currently, if `action` is transferFrom, it will still check
    // both `handleERC721Action`, `handleERC20Action`.
    if (
      methodSig == ERC721_transferFrom ||
      methodSig == ERC721_safeTransferFromNoData ||
      methodSig == ERC721_safeTransferFromWithData
    ) {
      handleERC721Action(
        action.to,
        event.address,
        action.data,
        proposalId,
        index,
        event
      );
    }

    if (methodSig == ERC20_transfer || methodSig == ERC20_transferFrom) {
      handleERC20Action(
        action.to,
        event.address,
        proposalId,
        action.data,
        index,
        event
      );
    }
  }
}

// ERC20 + Native
export function handleDeposited(event: Deposited): void {
  if (event.params.token.toHexString() != ADDRESS_ZERO) {
    handleERC20Deposit(
      event.address,
      event.params.token,
      event.params.sender,
      event.params.amount,
      event
    );
    return;
  }
  handleNativeDeposit(
    event.address,
    event.params.sender,
    event.params.amount,
    event.params._reference,
    event
  );
}

export function handleNativeTokenDeposited(event: NativeTokenDeposited): void {
  handleNativeDeposit(
    event.address,
    event.params.sender,
    event.params.amount,
    'Native Deposit',
    event
  );
}

export function handleGranted(event: Granted): void {
  // ContractPermissionId
  let daoId = event.address.toHexString();
  let contractPermissionIdEntityId =
    event.params.where.toHexString() +
    '_' +
    event.params.permissionId.toHexString();
  let contractPermissionIdEntity = ContractPermissionId.load(
    contractPermissionIdEntityId
  );
  if (!contractPermissionIdEntity) {
    contractPermissionIdEntity = new ContractPermissionId(
      contractPermissionIdEntityId
    );
    contractPermissionIdEntity.dao = daoId;
    contractPermissionIdEntity.where = event.params.where;
    contractPermissionIdEntity.permissionId = event.params.permissionId;
    contractPermissionIdEntity.save();
  }

  // Permission
  let permissionId =
    contractPermissionIdEntityId + '_' + event.params.who.toHexString();
  let permissionEntity = new Permission(permissionId);
  permissionEntity.dao = daoId;
  permissionEntity.contractPermissionId = contractPermissionIdEntityId;
  permissionEntity.where = event.params.where;
  permissionEntity.who = event.params.who;
  permissionEntity.actor = event.params.here;
  permissionEntity.condition = event.params.condition;
  permissionEntity.save();
}

export function handleRevoked(event: Revoked): void {
  // permission
  let permissionId =
    event.params.where.toHexString() +
    '_' +
    event.params.permissionId.toHexString() +
    '_' +
    event.params.who.toHexString();
  let permissionEntity = Permission.load(permissionId);
  if (permissionEntity) {
    store.remove('Permission', permissionId);
  }
}

export function handleTrustedForwarderSet(event: TrustedForwarderSet): void {
  let daoId = event.address.toHexString();
  let entity = Dao.load(daoId);
  if (entity) {
    entity.trustedForwarder = event.params.forwarder;
    entity.save();
  }
}

export function handleSignatureValidatorSet(
  event: SignatureValidatorSet
): void {
  let daoId = event.address.toHexString();
  let entity = Dao.load(daoId);
  if (entity) {
    entity.signatureValidator = event.params.signatureValidator;
    entity.save();
  }
}

export function handleStandardCallbackRegistered(
  event: StandardCallbackRegistered
): void {
  let daoId = event.address.toHexString();
  let entityId = `${daoId}_${event.params.interfaceId.toHexString()}`;
  let entity = StandardCallback.load(entityId);
  if (!entity) {
    entity = new StandardCallback(entityId);
    entity.dao = daoId;
  }
  entity.interfaceId = event.params.interfaceId;
  entity.callbackSelector = event.params.callbackSelector;
  entity.magicNumber = event.params.magicNumber;
  entity.save();
}
