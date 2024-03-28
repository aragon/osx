import {
  ERC20Balance,
  ERC20Contract,
  ERC20Transfer,
  ERC20WrapperContract,
} from '../../../generated/schema';
import {ERC20} from '../../../generated/templates/DaoTemplateV1_0_0/ERC20';
import {GovernanceWrappedERC20} from '../../../generated/templates/TokenVoting/GovernanceWrappedERC20';
import {GOVERNANCE_WRAPPED_ERC20_INTERFACE_ID} from '../../utils/constants';
import {supportsInterface} from '../erc165';
import {generateTokenEntityId} from '../ids';
import {ERC20_transfer, ERC20_transferFrom} from './common';
import {
  generateBalanceEntityId,
  generateDaoEntityId,
  generateTransferEntityId,
} from '@aragon/osx-commons-subgraph';
import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';

export function supportsERC20Wrapped(token: Address): bool {
  // Double check that it's ERC20Wrapped by calling supportsInterface checks.
  let erc20Wrapped = GovernanceWrappedERC20.bind(token);
  let introspection_wrapped_erc20 = supportsInterface(
    erc20Wrapped,
    GOVERNANCE_WRAPPED_ERC20_INTERFACE_ID
  ); // GovernanceWrappedERC20
  if (!introspection_wrapped_erc20) {
    return false;
  }
  let introspection_ffffffff = supportsInterface(
    erc20Wrapped,
    'ffffffff',
    false
  );
  return introspection_ffffffff;
}

export function fetchOrCreateWrappedERC20Entity(
  address: Address
): ERC20WrapperContract | null {
  const tokenEntityId = generateTokenEntityId(address);
  let wrappedErc20 = GovernanceWrappedERC20.bind(address);
  // try load entry
  let contract = ERC20WrapperContract.load(tokenEntityId);
  if (contract != null) {
    return contract;
  }

  contract = new ERC20WrapperContract(tokenEntityId);

  let try_name = wrappedErc20.try_name();
  let try_symbol = wrappedErc20.try_symbol();
  let totalSupply = wrappedErc20.try_totalSupply();
  let try_decimals = wrappedErc20.try_decimals();
  // extra checks
  let balanceOf = wrappedErc20.try_balanceOf(address);
  let underlying = wrappedErc20.try_underlying();
  if (totalSupply.reverted || balanceOf.reverted || underlying.reverted) {
    return null;
  }
  // get and save the underliying contract
  let underlyingContract = fetchOrCreateERC20Entity(underlying.value);
  if (!underlyingContract) {
    return null;
  }
  // set params and save
  contract.name = try_name.reverted ? '' : try_name.value;
  contract.symbol = try_symbol.reverted ? '' : try_symbol.value;
  contract.decimals = try_decimals.reverted ? 18 : try_decimals.value;
  contract.underlyingToken = underlyingContract.id;
  contract.save();
  return contract;
}

export function fetchOrCreateERC20Entity(
  address: Address
): ERC20Contract | null {
  const tokenEntityId = generateTokenEntityId(address);
  let erc20 = ERC20.bind(address);

  // Try load entry
  let contract = ERC20Contract.load(tokenEntityId);
  if (contract != null) {
    return contract;
  }

  contract = new ERC20Contract(tokenEntityId);

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

/**
 * @dev Identifies the type of ERC20 token (wrapped or regular), fetches or creates the corresponding entity, and returns its entity ID.
 *
 * 1. Checks whether the token supports wrapped ERC20.
 * 2. Fetches the existing entity if it exists.
 * 3. Creates a new entity if it doesn't exist.
 *
 * @param token The address of the token to be identified.
 * @return entityId The entity ID of the ERC20 token if it's either wrapped or regular, null otherwise.
 */
export function identifyAndFetchOrCreateERC20TokenEntity(
  token: Address
): string | null {
  let tokenAddress: string;
  if (supportsERC20Wrapped(token)) {
    let contract = fetchOrCreateWrappedERC20Entity(token);
    if (!contract) {
      return null;
    }
    tokenAddress = contract.id;
  } else {
    let contract = fetchOrCreateERC20Entity(token);
    if (!contract) {
      return null;
    }
    tokenAddress = contract.id;
  }

  return tokenAddress;
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

  let daoEntityId = generateDaoEntityId(dao);
  let balanceEntityId = generateBalanceEntityId(dao, token);
  let tokenEntityId = generateTokenEntityId(token);

  let erc20Balance = ERC20Balance.load(balanceEntityId);

  if (!erc20Balance) {
    erc20Balance = new ERC20Balance(balanceEntityId);
    erc20Balance.dao = daoEntityId;
    erc20Balance.token = tokenEntityId;
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
  let tokenAddress = identifyAndFetchOrCreateERC20TokenEntity(token);
  if (!tokenAddress) {
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

  let daoEntityId = generateDaoEntityId(dao);

  let transferEntityId = generateTransferEntityId(
    event.transaction.hash,
    event.transactionLogIndex,
    actionIndex as i32
  );

  let transfer = new ERC20Transfer(transferEntityId);

  transfer.from = from;
  transfer.to = to;
  transfer.dao = daoEntityId;
  transfer.amount = amount;
  transfer.txHash = event.transaction.hash;
  transfer.createdAt = event.block.timestamp;
  transfer.token = tokenAddress as string;
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
  let tokenAddress = identifyAndFetchOrCreateERC20TokenEntity(token);
  if (!tokenAddress) {
    return;
  }

  let daoEntityId = generateDaoEntityId(dao);

  let transferEntityId = generateTransferEntityId(
    event.transaction.hash,
    event.transactionLogIndex,
    0
  );

  let erc20Transfer = new ERC20Transfer(transferEntityId);

  erc20Transfer.from = from;
  erc20Transfer.to = dao;
  erc20Transfer.dao = daoEntityId;
  erc20Transfer.amount = amount;
  erc20Transfer.txHash = event.transaction.hash;
  erc20Transfer.createdAt = event.block.timestamp;
  erc20Transfer.token = tokenAddress as string;
  erc20Transfer.type = 'Deposit';

  erc20Transfer.save();

  updateERC20Balance(token, dao, event.block.timestamp);
}
