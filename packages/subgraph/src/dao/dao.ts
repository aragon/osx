import {Address, Bytes, store} from '@graphprotocol/graph-ts';

import {
  DAO as DAOContract,
  MetadataSet,
  Executed,
  Deposited,
  NativeTokenDeposited,
  Granted,
  MadeImmutable,
  Revoked
} from '../../generated/templates/DaoTemplate/DAO';
import {
  Dao,
  VaultDeposit,
  VaultWithdraw,
  ContractPermissionID,
  Permission
} from '../../generated/schema';

import {ADDRESS_ZERO} from '../utils/constants';
import {handleERC20Token, updateBalance} from '../utils/tokens';
import {addPackage, decodeWithdrawParams, removePackage} from './utils';

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

  let entity = new VaultDeposit(depositId);
  entity.dao = daoId;
  entity.token = tokenId;
  entity.sender = event.params.sender;
  entity.amount = event.params.amount;
  entity.reference = event.params._reference;
  entity.transaction = event.transaction.hash.toHexString();
  entity.createdAt = event.block.timestamp;
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

  let entity = new VaultDeposit(id);
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

      let proposalId =
        event.params.actor.toHexString() +
        '_' +
        event.params.callId.toHexString();

      // create a withdraw entity
      let withdrawId =
        daoId +
        '_' +
        event.transaction.hash.toHexString() +
        '_' +
        event.transactionLogIndex.toHexString() +
        '_' +
        index.toString();

      let vaultWithdrawEntity = new VaultWithdraw(withdrawId);
      vaultWithdrawEntity.dao = daoId;
      vaultWithdrawEntity.token = tokenId;
      vaultWithdrawEntity.to = withdrawParams.to;
      vaultWithdrawEntity.amount = withdrawParams.amount;
      vaultWithdrawEntity.reference = withdrawParams.reference;
      vaultWithdrawEntity.proposal = proposalId;
      vaultWithdrawEntity.transaction = event.transaction.hash.toHexString();
      vaultWithdrawEntity.createdAt = event.block.timestamp;
      vaultWithdrawEntity.save();
    }
  }
}

export function handleGranted(event: Granted): void {
  // ContractPermissionID
  let daoId = event.address.toHexString();
  let contractPermissionIDEntityId =
    event.params.where.toHexString() +
    '_' +
    event.params.permissionID.toHexString();
  let contractPermissionIDEntity = ContractPermissionID.load(
    contractPermissionIDEntityId
  );
  if (!contractPermissionIDEntity) {
    contractPermissionIDEntity = new ContractPermissionID(
      contractPermissionIDEntityId
    );
    contractPermissionIDEntity.dao = daoId;
    contractPermissionIDEntity.where = event.params.where;
    contractPermissionIDEntity.permissionID = event.params.permissionID;
    contractPermissionIDEntity.immutable = false;
    contractPermissionIDEntity.save();
  }

  // Permission
  let permissionId =
    contractPermissionIDEntityId + '_' + event.params.who.toHexString();
  let permissionEntity = new Permission(permissionId);
  permissionEntity.dao = daoId;
  permissionEntity.contractPermissionID = contractPermissionIDEntityId;
  permissionEntity.where = event.params.where;
  permissionEntity.who = event.params.who;
  permissionEntity.actor = event.params.here;
  permissionEntity.oracle = event.params.oracle;
  permissionEntity.save();

  // Package
  let daoContract = DAOContract.bind(event.address);
  // TODO: perhaps hardcoding exec contractPermissionID will be more efficient.
  let executionContractPermissionID = daoContract.try_EXECUTE_PERMISSION_ID();
  if (
    !executionContractPermissionID.reverted &&
    event.params.permissionID == executionContractPermissionID.value
  ) {
    addPackage(daoId, event.params.who);
  }
}

export function handleRevoked(event: Revoked): void {
  // permission
  let permissionId =
    event.params.where.toHexString() +
    '_' +
    event.params.permissionID.toHexString() +
    '_' +
    event.params.who.toHexString();
  let permissionEntity = Permission.load(permissionId);
  if (permissionEntity) {
    store.remove('Permission', permissionId);
  }

  // Package
  // TODO: rethink this once the market place is ready
  let daoId = event.address.toHexString();
  let daoContract = DAOContract.bind(event.address);
  let executionContractPermissionID = daoContract.try_EXECUTE_PERMISSION_ID();
  if (
    !executionContractPermissionID.reverted &&
    event.params.permissionID == executionContractPermissionID.value
  ) {
    removePackage(daoId, event.params.who.toHexString());
  }
}

export function handleMadeImmutable(event: MadeImmutable): void {
  let daoId = event.address.toHexString();
  let contractPermissionIDEntityId =
    event.params.where.toHexString() +
    '_' +
    event.params.permissionID.toHexString();
  let contractPermissionIDEntity = ContractPermissionID.load(
    contractPermissionIDEntityId
  );
  if (!contractPermissionIDEntity) {
    contractPermissionIDEntity = new ContractPermissionID(
      contractPermissionIDEntityId
    );
    contractPermissionIDEntity.dao = daoId;
    contractPermissionIDEntity.where = event.params.where;
    contractPermissionIDEntity.permissionID = event.params.permissionID;
  }
  contractPermissionIDEntity.immutable = true;
  contractPermissionIDEntity.save();
}
