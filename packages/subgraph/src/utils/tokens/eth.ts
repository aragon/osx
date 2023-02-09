import {Address, BigInt, Bytes} from '@graphprotocol/graph-ts';
import {NativeBalance, NativeTransfer} from '../../../generated/schema';
import {ADDRESS_ZERO} from '../constants';
import {TransferType} from './common';

export function createNativeTransfer(
  dao: Address,
  from: Address,
  to: Address,
  amount: BigInt,
  reference: string,
  txHash: Bytes,
  timestamp: BigInt
): NativeTransfer {
  let id = dao
    .toHexString()
    .concat('-')
    .concat(from.toHexString())
    .concat('-')
    .concat(to.toHexString())
    .concat('-')
    .concat(amount.toString())
    .concat('-')
    .concat(txHash.toHexString());
  let transfer = new NativeTransfer(id);
  transfer.from = from;
  transfer.to = dao;
  transfer.dao = dao.toHexString();
  transfer.amount = amount;
  transfer.reference = reference;
  transfer.txHash = txHash;
  transfer.createdAt = timestamp;
  return transfer;
}

export function updateNativeBalance(
  dao: string,
  amount: BigInt,
  timestamp: BigInt,
  type: TransferType
): void {
  let balanceId = dao + '_' + ADDRESS_ZERO;
  let nativeBalance = NativeBalance.load(balanceId);
  if (!nativeBalance) {
    nativeBalance = new NativeBalance(balanceId);
    nativeBalance.dao = dao;
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
  to: Address,
  amount: BigInt,
  reference: string,
  timestamp: BigInt,
  txHash: Bytes
): void {
  let transfer = createNativeTransfer(
    dao,
    from,
    to,
    amount,
    reference,
    txHash,
    timestamp
  );
  transfer.type = 'Deposit';
  transfer.save();

  updateNativeBalance(
    dao.toHexString(),
    amount,
    timestamp,
    TransferType.Deposit
  );
}

export function handleNativeAction(
  dao: Address,
  from: Address,
  to: Address,
  amount: BigInt,
  reference: string,
  proposal: string,
  timestamp: BigInt,
  txHash: Bytes
): void {
  let transfer = createNativeTransfer(
    dao,
    from,
    to,
    amount,
    reference,
    txHash,
    timestamp
  );
  transfer.type = 'Withdraw';
  transfer.proposal = proposal;
  transfer.save();

  updateNativeBalance(
    dao.toHexString(),
    amount,
    timestamp,
    TransferType.Withdraw
  );
}
