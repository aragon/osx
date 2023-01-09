import {Address, Bytes, store} from '@graphprotocol/graph-ts';

import {
  MetadataSet,
  Executed,
  Deposited,
  NativeTokenDeposited,
  Granted,
  Frozen,
  Revoked,
  Withdrawn,
  TrustedForwarderSet,
  SignatureValidatorSet,
  StandardCallbackRegistered
} from '../../generated/templates/DaoTemplate/DAO';
import {
  Dao,
  ContractPermissionId,
  Permission,
  VaultTransfer,
  StandardCallback
} from '../../generated/schema';

import {ADDRESS_ZERO} from '../utils/constants';
import {handleERC20Token, updateBalance} from '../utils/tokens';
import {decodeWithdrawParams} from './utils';

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

export function handleDeposited(event: Deposited): void {
  let daoId = event.address.toHexString();
  let depositId =
    event.address.toHexString() +
    '_' +
    event.transaction.hash.toHexString() +
    '_' +
    event.transactionLogIndex.toHexString();
  let token = event.params.token;
  let balanceId = daoId + '_' + token.toHexString();

  // handle token
  let tokenId = handleERC20Token(token);
  // update balance
  updateBalance(
    balanceId,
    event.address,
    token,
    event.params.amount,
    true,
    event.block.timestamp
  );

  let entity = new VaultTransfer(depositId);
  entity.dao = daoId;
  entity.token = tokenId;
  entity.sender = event.params.sender;
  entity.amount = event.params.amount;
  entity.reference = event.params._reference;
  entity.transaction = event.transaction.hash.toHexString();
  entity.createdAt = event.block.timestamp;
  entity.type = 'Deposit';
  entity.save();
}

export function handleNativeTokenDeposited(event: NativeTokenDeposited): void {
  let daoId = event.address.toHexString();
  let id =
    event.address.toHexString() +
    '_' +
    event.transaction.hash.toHexString() +
    '_' +
    event.transactionLogIndex.toHexString();

  let entity = new VaultTransfer(id);
  let balanceId = daoId + '_' + ADDRESS_ZERO;

  // handle token
  let tokenId = handleERC20Token(Address.fromString(ADDRESS_ZERO));
  // update Eth balance
  updateBalance(
    balanceId,
    event.address,
    Address.fromString(ADDRESS_ZERO),
    event.params.amount,
    true,
    event.block.timestamp
  );

  entity.dao = daoId;
  entity.token = tokenId;
  entity.sender = event.params.sender;
  entity.amount = event.params.amount;
  entity.reference = 'Eth deposit';
  entity.transaction = event.transaction.hash.toHexString();
  entity.createdAt = event.block.timestamp;
  entity.type = 'Deposit';
  entity.save();
}

export function handleExecuted(event: Executed): void {
  let daoId = event.address.toHexString();
  let actions = event.params.actions;
  for (let index = 0; index < actions.length; index++) {
    const action = actions[index];

    // check for withdraw
    let methodSig = action.data.toHexString().slice(0, 10);

    if (methodSig == '0x4f065632') {
      // then decode params
      let callParams = action.data.toHexString().slice(10);
      let withdrawParams = decodeWithdrawParams(
        Bytes.fromHexString('0x' + callParams)
      );

      // handle token
      let tokenId = handleERC20Token(withdrawParams.token);
      // update balance
      if (withdrawParams.token.toHexString() == ADDRESS_ZERO) {
        // update Eth balance
        let balanceId = daoId + '_' + ADDRESS_ZERO;
        updateBalance(
          balanceId,
          event.address,
          Address.fromString(ADDRESS_ZERO),
          withdrawParams.amount,
          false,
          event.block.timestamp
        );
      } else {
        // update token balance
        let balanceId = daoId + '_' + tokenId;
        updateBalance(
          balanceId,
          event.address,
          withdrawParams.token,
          withdrawParams.amount,
          false,
          event.block.timestamp
        );
      }

      let proposalId = event.params.callId.toHexString();

      // create a withdraw entity
      let withdrawId =
        daoId +
        '_' +
        event.transaction.hash.toHexString() +
        '_' +
        event.transactionLogIndex.toHexString() +
        '_' +
        withdrawParams.to.toHexString() +
        '_' +
        withdrawParams.amount.toString() +
        '_' +
        tokenId +
        '_' +
        withdrawParams.reference;

      let vaultWithdrawEntity = new VaultTransfer(withdrawId);
      vaultWithdrawEntity.dao = daoId;
      vaultWithdrawEntity.token = tokenId;
      vaultWithdrawEntity.to = withdrawParams.to;
      vaultWithdrawEntity.amount = withdrawParams.amount;
      vaultWithdrawEntity.reference = withdrawParams.reference;
      vaultWithdrawEntity.proposal = proposalId;
      vaultWithdrawEntity.transaction = event.transaction.hash.toHexString();
      vaultWithdrawEntity.createdAt = event.block.timestamp;
      vaultWithdrawEntity.type = 'Withdraw';
      vaultWithdrawEntity.save();
    }
  }
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
    contractPermissionIdEntity.frozen = false;
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
  permissionEntity.oracle = event.params.oracle;
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

export function handleFrozen(event: Frozen): void {
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
  }
  contractPermissionIdEntity.frozen = true;
  contractPermissionIdEntity.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  let daoId = event.address.toHexString();
  let token = event.params.token;
  let tokenId = handleERC20Token(token);
  let withdrawnId =
    daoId +
    '_' +
    event.transaction.hash.toHexString() +
    '_' +
    event.transactionLogIndex.toHexString() +
    '_' +
    event.params.to.toHexString() +
    '_' +
    event.params.amount.toString() +
    '_' +
    tokenId +
    '_' +
    event.params._reference;
  let balanceId = `${daoId}_${token.toHexString()}`;

  let entity = VaultTransfer.load(withdrawnId);
  if (entity) {
    return;
  }

  updateBalance(
    balanceId,
    event.address,
    token,
    event.params.amount,
    false,
    event.block.timestamp
  );

  entity = new VaultTransfer(withdrawnId);
  entity.dao = daoId;
  entity.token = tokenId;
  entity.sender = event.address;
  entity.to = event.params.to;
  entity.amount = event.params.amount;
  entity.reference = event.params._reference;
  entity.transaction = event.transaction.hash.toHexString();
  entity.createdAt = event.block.timestamp;
  entity.type = 'Withdraw';
  entity.save();
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
