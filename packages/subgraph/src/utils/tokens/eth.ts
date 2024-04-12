import {NativeBalance, NativeTransfer} from '../../../generated/schema';
import {ADDRESS_ZERO} from '../constants';
import {TransferType} from './common';
import {
  generateBalanceEntityId,
  generateDaoEntityId,
  generateTransferEntityId,
} from '@aragon/osx-commons-subgraph';
import {Address, BigInt, ethereum} from '@graphprotocol/graph-ts';

export function updateNativeBalance(
  dao: Address,
  amount: BigInt,
  timestamp: BigInt,
  type: TransferType
): void {
  let balanceEntityId = generateBalanceEntityId(
    dao,
    Address.fromString(ADDRESS_ZERO)
  );
  let daoEntityId = generateDaoEntityId(dao);
  let nativeBalance = NativeBalance.load(balanceEntityId);

  if (!nativeBalance) {
    nativeBalance = new NativeBalance(balanceEntityId);
    nativeBalance.dao = daoEntityId;
    nativeBalance.balance = BigInt.zero();
  }

  nativeBalance.balance =
    type == TransferType.Deposit
      ? nativeBalance.balance.plus(amount)
      : nativeBalance.balance.minus(amount);
  nativeBalance.lastUpdated = timestamp;
  nativeBalance.save();
}

export function handleNativeDeposit(
  dao: Address,
  from: Address,
  amount: BigInt,
  reference: string,
  event: ethereum.Event
): void {
  let daoEntityId = generateDaoEntityId(dao);

  let transferEntityId = generateTransferEntityId(
    event.transaction.hash,
    event.transactionLogIndex,
    0
  );

  let transfer = new NativeTransfer(transferEntityId);
  transfer.from = from;
  transfer.to = dao;
  transfer.dao = daoEntityId;
  transfer.amount = amount;
  transfer.reference = reference;
  transfer.txHash = event.transaction.hash;
  transfer.createdAt = event.block.timestamp;
  transfer.type = 'Deposit';
  transfer.save();

  if (from == dao) {
    return;
  }

  updateNativeBalance(dao, amount, event.block.timestamp, TransferType.Deposit);
}

export function handleNativeAction(
  dao: Address,
  to: Address,
  amount: BigInt,
  reference: string,
  actionBatchId: string,
  actionIndex: number,
  event: ethereum.Event
): void {
  let daoEntityId = generateDaoEntityId(dao);

  let transferEntityId = generateTransferEntityId(
    event.transaction.hash,
    event.transactionLogIndex,
    actionIndex as i32
  );

  let transfer = new NativeTransfer(transferEntityId);
  transfer.from = dao;
  transfer.to = to;
  transfer.dao = daoEntityId;
  transfer.amount = amount;
  transfer.reference = reference;
  transfer.txHash = event.transaction.hash;
  transfer.createdAt = event.block.timestamp;
  transfer.actionBatch = actionBatchId;
  transfer.type = 'Withdraw';
  transfer.save();

  if (dao == to) {
    return;
  }

  updateNativeBalance(
    dao,
    amount,
    event.block.timestamp,
    TransferType.Withdraw
  );
}
