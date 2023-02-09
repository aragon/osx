import {Address, BigInt, Bytes, ethereum, log} from '@graphprotocol/graph-ts';
import {
  ERC20Balance,
  ERC20Contract,
  ERC20Transfer
} from '../../../generated/schema';
import {ERC20} from '../../../generated/templates/DaoTemplate/ERC20';

enum TypeHere {
  Withdraw,
  Deposit
}

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
  let totalSupply = erc20.try_totalSupply();
  if (totalSupply.reverted) {
    return null;
  }
  contract.name = try_name.reverted ? '' : try_name.value;
  contract.symbol = try_symbol.reverted ? '' : try_symbol.value;

  contract.save();

  return contract;
}

export function createERC20Transfer(
  dao: Address,
  token: Address,
  from: Address,
  to: Address,
  amount: BigInt,
  txHash: Bytes,
  timestamp: BigInt
): ERC20Transfer {
  let id = dao
    .toHexString()
    .concat('-')
    .concat(token.toHexString())
    .concat('-')
    .concat(from.toHexString())
    .concat('-')
    .concat(to.toHexString())
    .concat('-')
    .concat(amount.toString())
    .concat('-')
    .concat(txHash.toHexString());
  let erc20Transfer = new ERC20Transfer(id);
  erc20Transfer.from = from;
  erc20Transfer.to = dao;
  erc20Transfer.dao = dao.toHexString();
  erc20Transfer.amount = amount;
  erc20Transfer.txHash = txHash;
  erc20Transfer.createdAt = timestamp;
  return erc20Transfer;
}

export function updateERC20Balance(
  token: Address,
  dao: string,
  amount: BigInt,
  timestamp: BigInt,
  type: TypeHere
): void {
  let balanceId = dao + '_' + token.toHexString();
  let erc20Balance = ERC20Balance.load(balanceId);
  if (!erc20Balance) {
    erc20Balance = new ERC20Balance(balanceId);
    erc20Balance.dao = dao;
    erc20Balance.token = token.toHexString();
    erc20Balance.balance = BigInt.zero();
  }

  // TODO: IF IT REVERTS, SHALL WE TRY TO use amount ?
  let erc20 = ERC20.bind(token);
  let balance = erc20.try_balanceOf(Address.fromString(dao));
  if (!balance.reverted) {
    erc20Balance.balance = balance.value;
  }

  erc20Balance.lastUpdated = timestamp;
  erc20Balance.save();
}

export function handleERC20Withdraw(
  token: Address,
  dao: Address,
  proposalId: string,
  data: Bytes,
  timestamp: BigInt,
  txHash: Bytes
): void {
  log.warning('whatthefuck? {}', ['fofo']);
  let contract = fetchERC20(token);
  if (!contract) {
    return;
  }

  log.warning('whatuuuk? {}', ['fofo']);

  let decodeABI = '(address,uint256)';

  let decoded = ethereum.decode(
    decodeABI,
    Bytes.fromHexString(data.toHexString().slice(10))
  );

  if (!decoded) {
    return;
  }

  let tuple = decoded.toTuple();

  log.debug('DECODED CORRECTLY {}', ['12345']);
  const from = dao;
  const to = tuple[0].toAddress();
  const amount = tuple[1].toBigInt();

  let erc20Transfer = createERC20Transfer(
    dao,
    token,
    from,
    to,
    amount,
    txHash,
    timestamp
  );
  erc20Transfer.token = contract.id;
  erc20Transfer.proposal = proposalId;
  erc20Transfer.type = 'Withdraw';

  erc20Transfer.save();

  updateERC20Balance(
    token,
    dao.toHexString(),
    amount,
    timestamp,
    TypeHere.Deposit
  );
}

export function handleERC20Deposit(
  dao: Address,
  token: Address,
  from: Address,
  to: Address,
  amount: BigInt,
  txHash: Bytes,
  timestamp: BigInt
): void {
  let contract = fetchERC20(token);
  if (!contract) {
    return;
  }

  let erc20Transfer = createERC20Transfer(
    dao,
    token,
    from,
    to,
    amount,
    txHash,
    timestamp
  );
  erc20Transfer.token = contract.id;
  erc20Transfer.type = 'Deposit';

  erc20Transfer.save();

  updateERC20Balance(
    token,
    dao.toHexString(),
    amount,
    timestamp,
    TypeHere.Deposit
  );
}
