import {
  DAO as DAOContract,
  SetMetadata,
  Executed,
  Deposited,
  ETHDeposited,
  Withdrawn,
  Granted,
  Frozen,
  Revoked
} from '../../generated/templates/DaoTemplate/DAO';
import {
  Dao,
  VaultDeposit,
  VaultWithdraw,
  Role,
  Permission
} from '../../generated/schema';
import {
  Address,
  BigInt,
  ByteArray,
  Bytes,
  ethereum,
  log,
  store
} from '@graphprotocol/graph-ts';
import {ADDRESS_ZERO} from '../utils/constants';
import {addPackage, decodeWithdrawParams, removePackage} from './utils';
import {handleERC20Token, updateBalance} from '../utils/tokens';

export function handleSetMetadata(event: SetMetadata): void {
  let id = event.address.toHexString();
  let entity = Dao.load(id);
  if (entity) {
    entity.metadata = event.params.metadata.toString();
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

export function handleETHDeposited(event: ETHDeposited): void {
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
  // Role
  let daoId = event.address.toHexString();
  let roleEntityId =
    event.params.where.toHexString() + '_' + event.params.role.toHexString();
  let roleEntity = Role.load(roleEntityId);
  if (!roleEntity) {
    roleEntity = new Role(roleEntityId);
    roleEntity.dao = daoId;
    roleEntity.where = event.params.where;
    roleEntity.role = event.params.role;
    roleEntity.frozen = false;
    roleEntity.save();
  }

  // Permission
  let permissionId = roleEntityId + '_' + event.params.who.toHexString();
  let permissionEntity = new Permission(permissionId);
  permissionEntity.dao = daoId;
  permissionEntity.role = roleEntityId;
  permissionEntity.where = event.params.where;
  permissionEntity.who = event.params.who;
  permissionEntity.actor = event.params.actor;
  permissionEntity.oracle = event.params.oracle;
  permissionEntity.save();

  // Package
  let daoContract = DAOContract.bind(event.address);
  // TODO: perhaps hardcoding exec role will be more efficient.
  let executionRole = daoContract.try_EXEC_ROLE();
  if (!executionRole.reverted && event.params.role == executionRole.value) {
    addPackage(daoId, event.params.who);
  }
}

export function handleRevoked(event: Revoked): void {
  // permission
  let permissionId =
    event.params.where.toHexString() +
    '_' +
    event.params.role.toHexString() +
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
  let executionRole = daoContract.try_EXEC_ROLE();
  if (!executionRole.reverted && event.params.role == executionRole.value) {
    removePackage(daoId, event.params.who.toHexString());
  }
}

export function handleFrozen(event: Frozen): void {
  let daoId = event.address.toHexString();
  let roleEntityId =
    event.params.where.toHexString() + '_' + event.params.role.toHexString();
  let roleEntity = Role.load(roleEntityId);
  if (!roleEntity) {
    roleEntity = new Role(roleEntityId);
    roleEntity.dao = daoId;
    roleEntity.where = event.params.where;
    roleEntity.role = event.params.role;
  }
  roleEntity.frozen = true;
  roleEntity.save();
}
