import {
  SetMetadata,
  Executed,
  Deposited,
  ETHDeposited,
  Withdrawn
} from '../generated/templates/DAO/DAO';
import {GovernanceWrappedERC20} from '../generated/templates/DAO/GovernanceWrappedERC20';
import {
  Dao,
  VaultDeposit,
  VaultWithdraw,
  ERC20Token,
  Balance
} from '../generated/schema';
import {Address, BigInt} from '@graphprotocol/graph-ts';
import {ADDRESS_ZERO} from './utils/constants';

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

function updateBalance(
  balanceId: string,
  daoAddress: Address,
  token: Address,
  amount: BigInt,
  isDeposit: boolean,
  timestamp: BigInt
): void {
  let daoId = daoAddress.toHexString();
  let entity = Balance.load(balanceId);

  if (!entity) {
    entity = new Balance(balanceId);
    entity.token = token.toHexString();
    entity.dao = daoId;
  }

  if (token.toHexString() == ADDRESS_ZERO) {
    // ETH
    entity.balance = isDeposit
      ? entity.balance.plus(amount)
      : entity.balance.minus(amount);
  } else {
    // ERC20 token
    let tokenContract = GovernanceWrappedERC20.bind(token);
    let daoBalance = tokenContract.try_balanceOf(daoAddress);
    if (!daoBalance.reverted) {
      entity.balance = daoBalance.value;
    }
  }

  entity.lastUpdated = timestamp;
  entity.save();
}

function handleERC20Token(token: Address): void {
  let entity = ERC20Token.load(token.toHexString());
  if (!entity) {
    entity = new ERC20Token(token.toHexString());

    if (token.toHexString() == ADDRESS_ZERO) {
      entity.name = 'Ethereum (Canonical)';
      entity.symbol = 'ETH';
      entity.decimals = BigInt.fromString('18');
      entity.save();
      return;
    }

    let tokenContract = GovernanceWrappedERC20.bind(token);
    let tokenName = tokenContract.try_name();
    let tokenSymbol = tokenContract.try_symbol();
    let tokenDecimals = tokenContract.try_decimals();

    if (
      !tokenName.reverted &&
      !tokenSymbol.reverted &&
      !tokenDecimals.reverted
    ) {
      entity.name = tokenName.value;
      entity.symbol = tokenSymbol.value;
      entity.decimals = BigInt.fromString(tokenDecimals.value.toString());
    }

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
  handleERC20Token(token);
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
  entity.token = token;
  entity.sender = event.params.sender;
  entity.amount = event.params.amount;
  entity.reference = event.params._reference;
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
  handleERC20Token(Address.fromString(ADDRESS_ZERO));
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
  entity.token = Address.fromString(ADDRESS_ZERO);
  entity.sender = event.params.sender;
  entity.amount = event.params.amount;
  entity.reference = 'Eth deposit';
  entity.createdAt = event.block.timestamp;
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

  let token = event.params.token;
  let entity = new VaultWithdraw(id);

  if (token.toHexString() == ADDRESS_ZERO) {
    // update Eth balance
    let balanceId = daoId + '_' + ADDRESS_ZERO;
    updateBalance(
      balanceId,
      event.address,
      Address.fromString(ADDRESS_ZERO),
      event.params.amount,
      false,
      event.block.timestamp
    );
  } else {
    // update balance
    let balanceId = daoId + '_' + token.toHexString();
    updateBalance(
      balanceId,
      event.address,
      token,
      event.params.amount,
      false,
      event.block.timestamp
    );
  }

  entity.dao = daoId;
  entity.token = token;
  entity.to = event.params.to;
  entity.amount = event.params.amount;
  entity.reference = event.params._reference;
  entity.createdAt = event.block.timestamp;
  entity.save();
}
