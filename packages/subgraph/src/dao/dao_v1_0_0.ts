import {BigInt, Bytes, store} from '@graphprotocol/graph-ts';

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
} from '../../generated/templates/DaoTemplateV1_0_0/DAO';
import {
  Dao,
  ContractPermissionId,
  Permission,
  StandardCallback,
  Action,
  TransactionActionsProposal
} from '../../generated/schema';

import {ADDRESS_ZERO} from '../utils/constants';

import {handleERC721Received} from '../utils/tokens/erc721';
import {handleERC20Deposit} from '../utils/tokens/erc20';
import {handleNativeDeposit} from '../utils/tokens/eth';
import {onERC721Received} from '../utils/tokens/common';
import {handleAction, updateProposalWithFailureMap} from './utils';

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

  // Not an effective solution, until each plugin has
  // its own subgraph separately.
  // If proposal found, update its failureMap.
  let wasUpdated = updateProposalWithFailureMap(
    proposalId,
    event.params.failureMap
  );

  // If not updated, proposal wasn't found which means,
  // it was called by the address that
  // Subgraph doesn't index, in which case, we still create
  // proposal entity in order to group its actions together.
  if (!wasUpdated) {
    // The id generation must include hash + logindex
    // This is important to not allow overwriting. since
    // the uniqueness of callId isn't checked in DAO, there
    // might be a case when 2 different tx might end up having the same
    // proposal ID which will cause overwrite. In case of plugins,
    // It's plugin's responsibility to pass unique callId per execute.
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
    // Since DAO doesn't emit allowFailureMap by mistake, we got no choice now.
    // In such case, `allowFailureMap` shouldn't be fully trusted.
    proposal.allowFailureMap = BigInt.zero();
    proposal.executed = true;
    proposal.failureMap = event.params.failureMap;
    proposal.save();
  }

  let actions = event.params.actions;

  for (let index = 0; index < actions.length; index++) {
    handleAction(actions[index], proposalId, index, event);
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
