import {Address, BigInt, Bytes, ethereum, log} from '@graphprotocol/graph-ts';
import {ETHBalance, ETHTransfer} from '../../../generated/schema';
import {ERC20} from '../../../generated/templates/DaoTemplate/ERC20';
import {ADDRESS_ZERO} from '../constants';

enum TypeHere {
  Withdraw,
  Deposit
}

export function createETHTransfer(
  dao: Address,
  from: Address,
  to: Address,
  amount: BigInt,
  reference: string,
  txHash: Bytes,
  timestamp: BigInt
): ETHTransfer {
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
  let ethTransfer = new ETHTransfer(id);
  ethTransfer.from = from;
  ethTransfer.to = dao;
  ethTransfer.dao = dao.toHexString();
  ethTransfer.amount = amount;
  ethTransfer.reference = reference;
  ethTransfer.txHash = txHash;
  ethTransfer.createdAt = timestamp;
  return ethTransfer;
}

export function updateETHBalance(
  dao: string,
  amount: BigInt,
  timestamp: BigInt,
  type: TypeHere
): void {
  let balanceId = dao + '_' + ADDRESS_ZERO;
  let ethBalance = ETHBalance.load(balanceId);
  if (!ethBalance) {
    ethBalance = new ETHBalance(balanceId);
    ethBalance.dao = dao;
    ethBalance.balance = BigInt.zero();
  }

  ethBalance.balance =
    type == TypeHere.Deposit
      ? ethBalance.balance.plus(amount)
      : ethBalance.balance.minus(amount);
  ethBalance.lastUpdated = timestamp;
  ethBalance.save();
}

export function handleETHDeposit(
  dao: Address,
  from: Address,
  to: Address,
  amount: BigInt,
  reference: string,
  timestamp: BigInt,
  txHash: Bytes
): void {
  let ethTransfer = createETHTransfer(
    dao,
    from,
    to,
    amount,
    reference,
    txHash,
    timestamp
  );
  ethTransfer.type = 'Deposit';
  ethTransfer.save();

  updateETHBalance(dao.toHexString(), amount, timestamp, TypeHere.Deposit);
}

export function handleETHWithdraw(
  dao: Address,
  from: Address,
  to: Address,
  amount: BigInt,
  reference: string,
  proposal: string,
  timestamp: BigInt,
  txHash: Bytes
): void {
  let ethTransfer = createETHTransfer(
    dao,
    from,
    to,
    amount,
    reference,
    txHash,
    timestamp
  );
  ethTransfer.type = 'Withdraw';
  ethTransfer.proposal = proposal;
  ethTransfer.save();

  updateETHBalance(dao.toHexString(), amount, timestamp, TypeHere.Withdraw);
}
