import {Address, BigInt} from '@graphprotocol/graph-ts';
import {Balance, ERC20Token} from '../../generated/schema';
import {ERC20} from '../../generated/templates/DaoTemplate/ERC20';
import {ADDRESS_ZERO} from './constants';

class ERCInfo {
  decimals: BigInt | null;
  name: string | null;
  symbol: string | null;
}

export function getERC20Info(address: Address): ERCInfo {
  let token = ERC20.bind(address);

  let decimals = token.try_decimals();
  let name = token.try_name();
  let symbol = token.try_symbol();

  return {
    decimals: decimals.reverted ? null : BigInt.fromI32(decimals.value),
    name: name.reverted ? null : name.value,
    symbol: decimals.reverted ? null : symbol.value
  };
}

export function handleERC20Token(token: Address): string {
  let entity = ERC20Token.load(token.toHexString());
  if (!entity) {
    entity = new ERC20Token(token.toHexString());

    if (token.toHexString() == ADDRESS_ZERO) {
      entity.name = 'Ethereum (Canonical)';
      entity.symbol = 'ETH';
      entity.decimals = BigInt.fromString('18');
      entity.save();
      return ADDRESS_ZERO;
    }

    let tokenInfo = getERC20Info(token);

    entity.name = tokenInfo.name;
    entity.symbol = tokenInfo.symbol;
    entity.decimals = tokenInfo.decimals;

    entity.save();
  }
  return token.toHexString();
}

export function updateBalance(
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
    let tokenContract = ERC20.bind(token);
    let daoBalance = tokenContract.try_balanceOf(daoAddress);
    if (!daoBalance.reverted) {
      entity.balance = daoBalance.value;
    }
  }

  entity.lastUpdated = timestamp;
  entity.save();
}
