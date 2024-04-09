import {
  Dao,
  Permission,
  StandardCallback,
  TransactionActions,
} from '../../generated/schema';
import {
  MetadataSet,
  Executed,
  Deposited,
  NativeTokenDeposited,
  Granted,
  Revoked,
  TrustedForwarderSet,
  StandardCallbackRegistered,
  CallbackReceived,
  NewURI,
} from '../../generated/templates/DaoTemplateV1_0_0/DAO';
import {ADDRESS_ZERO} from '../utils/constants';
import {
  onERC1155BatchReceived,
  onERC1155Received,
  onERC721Received,
} from '../utils/tokens/common';
import {handleERC20Deposit} from '../utils/tokens/erc20';
import {handleERC721Received} from '../utils/tokens/erc721';
import {
  handleERC1155BatchReceived,
  handleERC1155Received,
} from '../utils/tokens/erc1155';
import {handleNativeDeposit} from '../utils/tokens/eth';
import {handleAction, updateProposalWithFailureMap} from './utils';
import {
  generateDaoEntityId,
  generatePermissionEntityId,
  generateStandardCallbackEntityId,
} from '@aragon/osx-commons-subgraph';
import {BigInt, Bytes, store} from '@graphprotocol/graph-ts';
import {
  generateTransactionActionsDeterministicId,
  generateTransactionActionsEntityId,
} from './ids';

export function handleMetadataSet(event: MetadataSet): void {
  let daoId = generateDaoEntityId(event.address);
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
  if (functionSig.equals(Bytes.fromHexString(onERC1155Received))) {
    handleERC1155Received(
      event.params.sender,
      event.address,
      event.params.data,
      event
    );
  }
  if (functionSig.equals(Bytes.fromHexString(onERC1155BatchReceived))) {
    handleERC1155BatchReceived(
      event.params.sender,
      event.address,
      event.params.data,
      event
    );
  }
}

export function handleExecuted(event: Executed): void {
  const transactionActionsEntityId = generateTransactionActionsEntityId(
    event.params.actor /* caller */,
    event.address /* daoAddress */,
    event.params.callId,
    event.transaction.hash,
    event.transactionLogIndex
  );

  const deterministicId = generateTransactionActionsDeterministicId(
    event.params.actor /* caller */,
    event.address /* daoAddress */,
    event.params.callId
  );

  const transactionActions = new TransactionActions(transactionActionsEntityId);
  transactionActions.dao = generateDaoEntityId(event.address);
  transactionActions.deterministicId = deterministicId;
  transactionActions.createdAt = event.block.timestamp;
  transactionActions.creator = event.params.actor;
  transactionActions.executionTxHash = event.transaction.hash;
  // Since DAO v1.0.0 doesn't emit allowFailureMap by mistake, we got no choice now.
  // In such case, `allowFailureMap` shouldn't be fully trusted.
  transactionActions.allowFailureMap = BigInt.zero();
  transactionActions.executed = true;
  transactionActions.failureMap = event.params.failureMap;
  transactionActions.save();

  let actions = event.params.actions;

  for (let index = 0; index < actions.length; index++) {
    handleAction(actions[index], transactionActionsEntityId, index, event);
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
  const contractAddress = event.address;
  const where = event.params.where;
  const permissionId = event.params.permissionId;
  const who = event.params.who;

  const permissionEntityId = generatePermissionEntityId(
    contractAddress,
    permissionId,
    where,
    who
  );

  // Permission
  let permissionEntity = Permission.load(permissionEntityId);
  if (!permissionEntity) {
    permissionEntity = new Permission(permissionEntityId);
    permissionEntity.where = where;
    permissionEntity.permissionId = permissionId;
    permissionEntity.who = who;
    permissionEntity.actor = event.params.here;
    permissionEntity.condition = event.params.condition;

    permissionEntity.dao = generateDaoEntityId(contractAddress);
    permissionEntity.save();
  }
}

export function handleRevoked(event: Revoked): void {
  // permission
  const contractAddress = event.address;
  const where = event.params.where;
  const permissionId = event.params.permissionId;
  const who = event.params.who;

  const permissionEntityId = generatePermissionEntityId(
    contractAddress,
    permissionId,
    where,
    who
  );

  let permissionEntity = Permission.load(permissionEntityId);
  if (permissionEntity) {
    store.remove('Permission', permissionEntityId);
  }
}

export function handleTrustedForwarderSet(event: TrustedForwarderSet): void {
  let daoId = generateDaoEntityId(event.address);
  let entity = Dao.load(daoId);
  if (entity) {
    entity.trustedForwarder = event.params.forwarder;
    entity.save();
  }
}

export function handleStandardCallbackRegistered(
  event: StandardCallbackRegistered
): void {
  let daoAddress = event.address;
  let interfaceId = event.params.interfaceId;

  let daoId = generateDaoEntityId(daoAddress);
  let entityId = generateStandardCallbackEntityId(daoAddress, interfaceId);
  let entity = StandardCallback.load(entityId);
  if (!entity) {
    entity = new StandardCallback(entityId);
    entity.dao = daoId;
  }
  entity.interfaceId = interfaceId;
  entity.callbackSelector = event.params.callbackSelector;
  entity.magicNumber = event.params.magicNumber;
  entity.save();
}

export function handleNewURI(event: NewURI): void {
  let daoEntityId = generateDaoEntityId(event.address);
  let entity = Dao.load(daoEntityId);
  if (entity) {
    entity.daoURI = event.params.daoURI;
    entity.save();
  }
}
