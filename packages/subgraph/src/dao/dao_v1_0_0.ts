import {
  Dao,
  Permission,
  StandardCallback,
  TransactionActionsProposal,
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
  generateProposalEntityId,
  generateStandardCallbackEntityId,
  generateTransactionActionsProposalEntityId,
} from '@aragon/osx-commons-subgraph';
import {BigInt, Bytes, store} from '@graphprotocol/graph-ts';

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
  let proposalEntityId = generateProposalEntityId(
    event.params.actor,
    BigInt.fromByteArray(event.params.callId)
  );

  // Not an effective solution, until each plugin has
  // its own subgraph separately.
  // If proposal found, update its failureMap.
  let wasUpdated = updateProposalWithFailureMap(
    proposalEntityId,
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
    proposalEntityId = generateTransactionActionsProposalEntityId(
      proposalEntityId,
      event.transaction.hash,
      event.logIndex
    );

    let proposal = new TransactionActionsProposal(proposalEntityId);
    proposal.dao = generateDaoEntityId(event.address);
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
    handleAction(actions[index], proposalEntityId, index, event);
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
