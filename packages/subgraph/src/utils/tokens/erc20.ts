import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {
  ERC20Balance,
  ERC20Contract,
  ERC20Transfer
} from '../../../generated/schema';
import {ERC20} from '../../../generated/templates/DaoTemplateV1_0_0/ERC20';
import {ERC20_transfer, ERC20_transferFrom, getTransferId} from './common';

export function fetchERC20(address: Address): ERC20Contract | null {
  let erc20 = ERC20.bind(address);

  // Try load entry
  let contract = ERC20Contract.load(address.toHexString());
  if (contract != null) {
    return contract;
  }

  contract = new ERC20Contract(address.toHexString());

  let try_name = erc20.try_name();
  let try_symbol = erc20.try_symbol();
  let try_decimals = erc20.try_decimals();

  // Extra check to make sure contract is ERC20.
  let totalSupply = erc20.try_totalSupply();
  let balanceOf = erc20.try_balanceOf(address);
  if (totalSupply.reverted || balanceOf.reverted) {
    return null;
  }

  contract.name = try_name.reverted ? '' : try_name.value;
  contract.symbol = try_symbol.reverted ? '' : try_symbol.value;
  contract.decimals = try_decimals.reverted ? 18 : try_decimals.value;
  contract.save();

  return contract;
}

export function updateERC20Balance(
  token: Address,
  dao: Address,
  timestamp: BigInt
): void {
  let erc20 = ERC20.bind(token);
  let balance = erc20.try_balanceOf(dao);

  // if reverted, means it's not ERC20.
  if (balance.reverted) {
    return;
  }

  let daoId = dao.toHexString();
  let balanceId = daoId.concat('_').concat(token.toHexString());

  let erc20Balance = ERC20Balance.load(balanceId);

  if (!erc20Balance) {
    erc20Balance = new ERC20Balance(balanceId);
    erc20Balance.dao = daoId;
    erc20Balance.token = token.toHexString();
    erc20Balance.balance = BigInt.zero();
  }

  erc20Balance.balance = balance.value;
  erc20Balance.lastUpdated = timestamp;
  erc20Balance.save();
}

export function handleERC20Action(
  token: Address,
  dao: Address,
  proposalId: string,
  data: Bytes,
  actionIndex: number,
  event: ethereum.Event
): void {
  let contract = fetchERC20(token);
  if (!contract) {
    return;
  }

  let decodeABI = '';

  let functionSelector = data.toHexString().substring(0, 10);
  let calldata = data.toHexString().slice(10);

  if (functionSelector == ERC20_transfer) {
    decodeABI = '(address,uint256)';
  }

  if (functionSelector == ERC20_transferFrom) {
    decodeABI = '(address,address,uint256)';
  }

  let decoded = ethereum.decode(decodeABI, Bytes.fromHexString(calldata));

  if (!decoded) {
    return;
  }

  let tuple = decoded.toTuple();

  let from = new Address(0);
  let to = new Address(0);
  let amount = BigInt.zero();

  if (functionSelector == ERC20_transfer) {
    from = dao;
    to = tuple[0].toAddress();
    amount = tuple[1].toBigInt();
  }

  if (functionSelector == ERC20_transferFrom) {
    from = tuple[0].toAddress();
    to = tuple[1].toAddress();
    amount = tuple[2].toBigInt();
  }

  let daoId = dao.toHexString();

  let id = getTransferId(
    event.transaction.hash,
    event.transactionLogIndex,
    actionIndex
  );

  let transfer = new ERC20Transfer(id);

  transfer.from = from;
  transfer.to = to;
  transfer.dao = daoId;
  transfer.amount = amount;
  transfer.txHash = event.transaction.hash;
  transfer.createdAt = event.block.timestamp;
  transfer.token = contract.id;
  transfer.proposal = proposalId;

  // If from/to both aren't equal to dao, it means
  // dao must have been approved for the `tokenId`
  // and played the role of transfering between 2 parties.
  if (from != dao && to != dao) {
    transfer.type = 'ExternalTransfer';
    transfer.save();
    return;
  }

  if (from != dao && to == dao) {
    // 1. some party `y` approved `x` tokenId to the dao.
    // 2. dao calls transferFrom as an action to transfer it from `y` to itself.
    transfer.type = 'Deposit';

    updateERC20Balance(token, dao, event.block.timestamp);
  } else {
    // from is dao address, to is some other address
    transfer.type = 'Withdraw';

    updateERC20Balance(token, dao, event.block.timestamp);
  }

  transfer.save();
}

export function handleERC20Deposit(
  dao: Address,
  token: Address,
  from: Address,
  amount: BigInt,
  event: ethereum.Event
): void {
  let contract = fetchERC20(token);
  if (!contract) {
    return;
  }

  let daoId = dao.toHexString();

  let id = getTransferId(event.transaction.hash, event.transactionLogIndex, 0);

  let erc20Transfer = new ERC20Transfer(id);

  erc20Transfer.from = from;
  erc20Transfer.to = dao;
  erc20Transfer.dao = daoId;
  erc20Transfer.amount = amount;
  erc20Transfer.txHash = event.transaction.hash;
  erc20Transfer.createdAt = event.block.timestamp;
  erc20Transfer.token = contract.id;
  erc20Transfer.type = 'Deposit';

  erc20Transfer.save();

  updateERC20Balance(token, dao, event.block.timestamp);
}
