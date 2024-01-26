import {
  ERC1155Balance,
  ERC1155Contract,
  ERC1155TokenIdBalance,
  ERC1155Transfer,
} from '../../../generated/schema';
import {ERC1155} from '../../../generated/templates/DaoTemplateV1_0_0/ERC1155';
import {getMethodSignature} from '../bytes';
import {supportsInterface} from '../erc165';
import {generateTokenEntityId} from '../ids';
import {
  DECODE_OFFSET,
  ERC1155_INTERFACE_ID,
  ERC1155_safeBatchTransferFrom,
  ERC1155_safeTransferFrom,
  ERC165_INTERFACE_ID,
  TransferType,
  getBalanceId,
  getERC1155TransferId,
  getTokenIdBalanceId,
} from './common';
import {generateDaoEntityId} from '@aragon/osx-commons-subgraph';
import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';

export function supportsERC1155(token: Address): bool {
  // Double check that it's ERC1155 by calling supportsInterface checks.
  let erc1155 = ERC1155.bind(token);
  let introspection_ERC165 = supportsInterface(erc1155, ERC165_INTERFACE_ID); // ERC165
  let introspection_ERC1155 = supportsInterface(erc1155, ERC1155_INTERFACE_ID); // ERC1155
  let introspection_ffffffff = supportsInterface(erc1155, 'ffffffff', false);
  return (
    introspection_ERC165 && introspection_ERC1155 && introspection_ffffffff
  );
}

export function fetchERC1155(address: Address): ERC1155Contract | null {
  // Try load entry
  let contract = ERC1155Contract.load(address.toHexString());
  if (contract != null) {
    return contract;
  }

  // Detect using ERC165
  if (!supportsERC1155(address)) {
    return null;
  }
  contract = new ERC1155Contract(address.toHexString());
  contract.save();

  return contract;
}

export function updateERC1155Balance(
  daoId: string,
  token: string,
  tokenId: BigInt,
  amount: BigInt,
  timestamp: BigInt,
  type: TransferType
): void {
  // generate unique balance id
  let balanceId = getBalanceId(daoId, token);
  // load balance
  let erc1155Balance = ERC1155Balance.load(balanceId);

  if (!erc1155Balance) {
    // if not exists create it
    erc1155Balance = new ERC1155Balance(balanceId);
    erc1155Balance.dao = daoId;
    erc1155Balance.token = token;
    let erc1155 = ERC1155.bind(Address.fromString(token));
    let metadataUri = erc1155.uri(tokenId);
    erc1155Balance.metadataUri = metadataUri;
  }
  // update lastUpdated
  erc1155Balance.lastUpdated = timestamp;
  // generate unique tokenIdBalanceId
  let tokenIdBalanceId = getTokenIdBalanceId(daoId, token, tokenId);
  // load tokenIdbalnce
  let erc1155TokenIdBalance = ERC1155TokenIdBalance.load(tokenIdBalanceId);
  // if not exists create it
  if (!erc1155TokenIdBalance) {
    erc1155TokenIdBalance = new ERC1155TokenIdBalance(tokenIdBalanceId);
    erc1155TokenIdBalance.amount = amount;
    erc1155TokenIdBalance.tokenId = tokenId;
    erc1155TokenIdBalance.balance = balanceId;
  } else {
    // if exists update it
    if (type == TransferType.Deposit) {
      erc1155TokenIdBalance.amount = erc1155TokenIdBalance.amount.plus(amount);
    } else {
      erc1155TokenIdBalance.amount = erc1155TokenIdBalance.amount.minus(amount);
    }
  }
  // update lastUpdated
  erc1155TokenIdBalance.lastUpdated = timestamp;
  // save
  erc1155Balance.save();
  erc1155TokenIdBalance.save();
}

export function handleERC1155Received(
  token: Address,
  dao: Address,
  data: Bytes,
  event: ethereum.Event
): void {
  let contract = fetchERC1155(token);
  if (!contract) {
    return;
  }
  let calldata = data.toHexString().slice(10);
  calldata = DECODE_OFFSET.concat(calldata);
  let decodeABI = '(address,address,uint256,uint256,bytes)';
  let decoded = ethereum.decode(decodeABI, Bytes.fromHexString(calldata));
  if (!decoded) {
    return;
  }
  let tuple = decoded.toTuple();
  let operator = tuple[0].toAddress();
  let from = tuple[1].toAddress();
  // in single transfer create a single transfer
  let tokenId = tuple[2].toBigInt();
  let amount = tuple[3].toBigInt();
  // generate unique transfer id
  let transferId = getERC1155TransferId(
    event.transaction.hash,
    event.transactionLogIndex,
    0,
    0
  );
  // create transfer
  createErc1155Transfer(
    transferId,
    operator,
    from,
    dao, // to field, the to field is going to be always the dao because is the one handling the onERC1155Received callback
    dao,
    token,
    tokenId,
    amount,
    null,
    event.transaction.hash,
    event.block.timestamp
  );
}

export function handleERC1155BatchReceived(
  token: Address,
  dao: Address,
  data: Bytes,
  event: ethereum.Event
): void {
  let contract = fetchERC1155(token);
  if (!contract) {
    return;
  }
  let calldata = data.toHexString().slice(10);
  calldata = DECODE_OFFSET.concat(calldata);

  let decodeABI = '(address,address,uint256[],uint256[],bytes)';
  let decoded = ethereum.decode(decodeABI, Bytes.fromHexString(calldata));
  if (!decoded) {
    return;
  }
  let tuple = decoded.toTuple();
  let operator = tuple[0].toAddress();
  let from = tuple[1].toAddress();
  let tokenIds = tuple[2].toBigIntArray();
  let amounts = tuple[3].toBigIntArray();
  // in batch transfer iterate over the tokenIds and create a transfer for each
  for (let i = 0; i < tokenIds.length; i++) {
    // generate unique transfer id by adding the index of the tokenIds array
    let transferId = getERC1155TransferId(
      event.transaction.hash,
      event.transactionLogIndex,
      0,
      i
    );
    // create transfer
    createErc1155Transfer(
      transferId,
      operator,
      from,
      dao, // to field, the to field is going to be always the dao because is the one handling the onERC1155Received callback
      dao,
      token,
      tokenIds[i],
      amounts[i],
      null,
      event.transaction.hash,
      event.block.timestamp
    );
  }
}

export function handleERC1155Action(
  token: Address,
  dao: Address,
  data: Bytes,
  proposalId: string,
  actionIndex: number,
  event: ethereum.Event
): bool {
  let contract = fetchERC1155(token);
  if (!contract) {
    return false;
  }

  let functionSelector = getMethodSignature(data);
  let decodeABI = determineERC1155DecodeABI(functionSelector);

  // If decodeABI is not determined, return false
  if (!decodeABI) return false;

  let calldata = DECODE_OFFSET + data.toHexString().slice(10);
  let bytes = Bytes.fromHexString(calldata);
  let decoded = ethereum.decode(decodeABI as string, bytes);

  if (!decoded) {
    return false;
  }

  let tuple = decoded.toTuple();

  if (functionSelector == ERC1155_safeTransferFrom) {
    handleERC1155SingleTransfer(
      tuple,
      dao,
      token,
      proposalId,
      event,
      actionIndex
    );
  } else if (functionSelector == ERC1155_safeBatchTransferFrom) {
    handleERC1155BatchTransfer(
      tuple,
      dao,
      token,
      proposalId,
      event,
      actionIndex
    );
  }

  return true;
}

function determineERC1155DecodeABI(functionSelector: string): string | null {
  if (functionSelector == ERC1155_safeTransferFrom) {
    return '(address,address,uint256,uint256,bytes)';
  }

  if (functionSelector == ERC1155_safeBatchTransferFrom) {
    return '(address,address,uint256[],uint256[],bytes)';
  }

  return null;
}

function handleERC1155SingleTransfer(
  tuple: ethereum.Tuple,
  dao: Address,
  token: Address,
  proposalId: string,
  event: ethereum.Event,
  actionIndex: number
): void {
  let tokenId = tuple[2].toBigInt();
  let amount = tuple[3].toBigInt();

  // generate unique transfer id
  let transferId = getERC1155TransferId(
    event.transaction.hash,
    event.transactionLogIndex,
    actionIndex,
    0
  );

  createErc1155Transfer(
    transferId,
    dao, // operator field, the operator is going to be the dao since is the one executing the action
    tuple[0].toAddress(),
    tuple[1].toAddress(),
    dao,
    token,
    tokenId,
    amount,
    proposalId,
    event.transaction.hash,
    event.block.timestamp
  );
}

function handleERC1155BatchTransfer(
  tuple: ethereum.Tuple,
  dao: Address,
  token: Address,
  proposalId: string,
  event: ethereum.Event,
  actionIndex: number
): void {
  let tokenIds = tuple[2].toBigIntArray();
  let amounts = tuple[3].toBigIntArray();

  // in batch transfer iterate over the tokenIds and create a transfer for each
  for (let i = 0; i < tokenIds.length; i++) {
    // generate unique transfer id by adding the index of the tokenIds array
    let transferId = getERC1155TransferId(
      event.transaction.hash,
      event.transactionLogIndex,
      actionIndex,
      i
    );

    createErc1155Transfer(
      transferId,
      dao, // operator field, the operator is going to be the dao since is the one executing the action
      tuple[0].toAddress(),
      tuple[1].toAddress(),
      dao,
      token,
      tokenIds[i],
      amounts[i],
      proposalId,
      event.transaction.hash,
      event.block.timestamp
    );
  }
}

function createErc1155Transfer(
  transferId: string,
  operator: Address,
  from: Address,
  to: Address,
  dao: Address,
  token: Address,
  tokenId: BigInt,
  amount: BigInt,
  proposalId: string | null,
  txHash: Bytes,
  timestamp: BigInt
): void {
  let daoEntityId = generateDaoEntityId(dao);
  let tokenEntityId = generateTokenEntityId(token);
  // create transfer
  let transfer = new ERC1155Transfer(transferId);
  transfer.from = from;
  transfer.to = to;
  transfer.operator = operator;
  transfer.dao = daoEntityId;
  transfer.token = tokenEntityId;
  transfer.amount = amount;
  transfer.tokenId = tokenId;
  transfer.proposal = proposalId;
  transfer.txHash = txHash;
  transfer.createdAt = timestamp;
  // check the transfer type
  if (from == dao && to == dao) {
    transfer.type = 'Withdraw';
    transfer.save();
    return;
  }
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
    updateERC1155Balance(
      daoEntityId,
      tokenEntityId,
      tokenId,
      amount,
      timestamp,
      TransferType.Deposit
    );
  } else {
    transfer.type = 'Withdraw';

    updateERC1155Balance(
      daoEntityId,
      tokenEntityId,
      tokenId,
      amount,
      timestamp,
      TransferType.Withdraw
    );
  }
  transfer.save();
}
