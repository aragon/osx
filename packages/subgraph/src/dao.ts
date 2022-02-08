import {
  DAO as DAOContract,
  SetMetadata,
  Executed,
  Deposited,
  ETHDeposited,
  Withdrawn,
} from '../generated/templates/DAO/DAO';
import {
  Dao,
  VaultEthDeposit,
  VaultDeposit,
  VaultWithdraw,
} from '../generated/schema';
import {DataSourceContext, store} from '@graphprotocol/graph-ts';
import {log} from 'matchstick-as/assembly/index';

export function handleSetMetadata(event: SetMetadata): void {
  let id = event.address.toHexString();
  let entity = Dao.load(id);
  if (entity) {
    entity.metadata = event.params.metadata.toString();
    entity.save();
  }
}

export function handleExecuted(event: Executed): void {
  // TODO:
}

export function handleDeposited(event: Deposited): void {
  let daoId = event.address.toHexString();
  let id =
    event.address.toHexString() +
    '_' +
    event.transaction.hash.toHexString() +
    '_' +
    event.transactionLogIndex.toHexString();

  let entity = new VaultDeposit(id);

  entity.dao = daoId;
  entity.token = event.params.token;
  entity.sender = event.params.sender;
  entity.amount = event.params.amount;
  entity.reference = event.params._reference;
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

  let entity = new VaultEthDeposit(id);

  entity.dao = daoId;
  entity.sender = event.params.sender;
  entity.amount = event.params.amount;
  entity.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  let daoId = event.address.toHexString();
  let id =
    event.address.toHexString() +
    '_' +
    event.transaction.hash.toHexString() +
    '_' +
    event.transactionLogIndex.toHexString();

  let entity = new VaultWithdraw(id);

  entity.dao = daoId;
  entity.token = event.params.token;
  entity.to = event.params.to;
  entity.amount = event.params.amount;
  entity.reference = event.params._reference;
  entity.save();
}
