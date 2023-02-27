import {Address, BigInt, ethereum} from '@graphprotocol/graph-ts';
import {NativeBalance, NativeTransfer} from '../../../generated/schema';
import {ADDRESS_ZERO} from '../constants';
import {getTransferId, TransferType} from './common';

export function updateNativeBalance(
  daoId: string,
  amount: BigInt,
  timestamp: BigInt,
  type: TransferType
): void {
  let balanceId = daoId.concat('_').concat(ADDRESS_ZERO);
  let nativeBalance = NativeBalance.load(balanceId);

  if (!nativeBalance) {
    nativeBalance = new NativeBalance(balanceId);
    nativeBalance.dao = daoId;
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
  let daoId = dao.toHexString();

  let id = getTransferId(event.transaction.hash, event.transactionLogIndex, 0);

  let transfer = new NativeTransfer(id);
  transfer.from = from;
  transfer.to = dao;
  transfer.dao = daoId;
  transfer.amount = amount;
  transfer.reference = reference;
  transfer.txHash = event.transaction.hash;
  transfer.createdAt = event.block.timestamp;
  transfer.type = 'Deposit';
  transfer.save();

  if (from == dao) {
    return;
  }

  updateNativeBalance(
    daoId,
    amount,
    event.block.timestamp,
    TransferType.Deposit
  );
}

export function handleNativeAction(
  dao: Address,
  to: Address,
  amount: BigInt,
  reference: string,
  proposalId: string,
  actionIndex: number,
  event: ethereum.Event
): void {
  let daoId = dao.toHexString();

  let id = getTransferId(
    event.transaction.hash,
    event.transactionLogIndex,
    actionIndex
  );

  let transfer = new NativeTransfer(id);
  transfer.from = dao;
  transfer.to = to;
  transfer.dao = daoId;
  transfer.amount = amount;
  transfer.reference = reference;
  transfer.txHash = event.transaction.hash;
  transfer.createdAt = event.block.timestamp;
  transfer.proposal = proposalId;
  transfer.type = 'Withdraw';
  transfer.save();

  if (dao == to) {
    return;
  }

  updateNativeBalance(
    daoId,
    amount,
    event.block.timestamp,
    TransferType.Withdraw
  );
}
