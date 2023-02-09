import {Address, BigInt, Bytes, ethereum, log} from '@graphprotocol/graph-ts';
import {
  ERC721Balance,
  ERC721Contract,
  ERC721Transfer
} from '../../../generated/schema';
import {ERC721} from '../../../generated/templates/DaoTemplate/ERC721';
import {supportsInterface} from '../erc165';
import {
  ERC721_safeTransferFromNoData,
  ERC721_safeTransferFromWithData,
  ERC721_transferFrom
} from './selectors';

enum TransferType {
  Withdraw,
  Deposit
}

const DECODE_OFFSET =
  '0x0000000000000000000000000000000000000000000000000000000000000020';

function supportsERC721(token: Address): bool {
  // Double check that it's ERC721 by calling supportsInterface checks.
  const erc721 = ERC721.bind(token);
  let introspection_01ffc9a7 = supportsInterface(erc721, '01ffc9a7'); // ERC165
  let introspection_80ac58cd = supportsInterface(erc721, '80ac58cd'); // ERC721
  let introspection_00000000 = supportsInterface(erc721, '00000000', false);
  return (
    introspection_01ffc9a7 && introspection_80ac58cd && introspection_00000000
  );
}

export function fetchERC721(address: Address): ERC721Contract | null {
  let erc721 = ERC721.bind(address);

  // Try load entry
  let contract = ERC721Contract.load(address.toHexString());
  if (contract != null) {
    return contract;
  }

  // Detect using ERC165
  if (!supportsERC721(address)) {
    return null;
  }

  contract = new ERC721Contract(address.toHexString());

  let try_name = erc721.try_name();
  let try_symbol = erc721.try_symbol();
  contract.name = try_name.reverted ? '' : try_name.value;
  contract.symbol = try_symbol.reverted ? '' : try_symbol.value;

  contract.save();

  return contract;
}

export function updateERC721Balance(
  dao: string,
  token: string,
  tokenId: BigInt,
  timestamp: BigInt,
  type: TransferType
): void {
  let balanceId = dao + '_' + token;
  let erc721Balance = ERC721Balance.load(balanceId);

  if (!erc721Balance) {
    erc721Balance = new ERC721Balance(balanceId);
    erc721Balance.dao = dao;
    erc721Balance.token = token;
    erc721Balance.tokenIds = [];
  }

  let tokenIds = erc721Balance.tokenIds;
  if (type == TransferType.Withdraw) {
    tokenIds.splice(tokenIds.indexOf(tokenId), 1);
  } else {
    tokenIds.push(tokenId);
  }

  erc721Balance.tokenIds = tokenIds;
  erc721Balance.lastUpdated = timestamp;
  erc721Balance.save();
}

export function createERC721Transfer(
  dao: Address,
  from: Address,
  to: Address,
  token: Address,
  tokenId: BigInt,
  txHash: Bytes,
  timestamp: BigInt
): ERC721Transfer {
  let transferId = dao
    .toHexString()
    .concat('-')
    .concat(token.toHexString())
    .concat('-')
    .concat(tokenId.toHexString())
    .concat('-')
    .concat(from.toHexString())
    .concat('-')
    .concat(to.toHexString())
    .concat('-')
    .concat(txHash.toHexString());

  let erc721Transfer = new ERC721Transfer(transferId);

  erc721Transfer.from = from;
  erc721Transfer.to = to;
  erc721Transfer.dao = dao.toHexString();
  erc721Transfer.tokenId = tokenId;
  erc721Transfer.txHash = txHash;
  erc721Transfer.createdAt = timestamp;
  return erc721Transfer;
}

export function handleERC721Deposit(
  token: Address,
  dao: Address,
  data: Bytes,
  timestamp: BigInt,
  txHash: Bytes
): void {
  let contract = fetchERC721(token);
  if (!contract) {
    return;
  }

  log.warning('fetch happened {} ', [token.toHexString()]);

  let calldata = DECODE_OFFSET + data.toHexString().slice(10);

  let decodeABI = '(address,address,uint256,bytes)';

  const decoded = ethereum.decode(
    decodeABI, // from, tokenId,
    Bytes.fromHexString(calldata)
  );

  log.warning('here we go again {} ', [token.toHexString()]);

  if (!decoded) {
    return;
  }

  log.warning('oo vnaxot {} ', [token.toHexString()]);

  let tuple = decoded.toTuple();

  log.debug('DECODED CORRECTLY {}', ['12345']);
  const from = tuple[1].toAddress();
  const tokenId = tuple[2].toBigInt();

  updateERC721Balance(
    dao.toHexString(),
    token.toHexString(),
    tokenId,
    timestamp,
    TransferType.Deposit
  );

  let erc721Transfer = createERC721Transfer(
    dao,
    from,
    dao,
    token,
    tokenId,
    txHash,
    timestamp
  );

  erc721Transfer.type = 'Deposit';
  erc721Transfer.token = contract.id;
  erc721Transfer.save();
}

export function handleERC721Withdraw(
  token: Address,
  dao: Address,
  data: Bytes,
  proposalId: string,
  timestamp: BigInt,
  txHash: Bytes
): void {
  let contract = fetchERC721(token);
  if (!contract) {
    return;
  }

  const functionSelector = data.toHexString().substring(0, 10);
  let calldata = data.toHexString().slice(10);

  let decodeABI = '';

  if (
    functionSelector == ERC721_transferFrom ||
    functionSelector == ERC721_safeTransferFromNoData
  ) {
    decodeABI = '(address,address,uint256)';
  }

  if (functionSelector == ERC721_safeTransferFromWithData) {
    decodeABI = '(address,address,uint256,bytes)';
    calldata = DECODE_OFFSET + calldata;
  }

  const decoded = ethereum.decode(
    decodeABI, // from, tokenId,
    Bytes.fromHexString(calldata)
  );

  if (!decoded) {
    return;
  }

  let tuple = decoded.toTuple();

  log.debug('DECODED CORRECTLY {}', ['12345']);
  const from = tuple[0].toAddress();
  const to = tuple[1].toAddress();
  const tokenId = tuple[2].toBigInt();

  let erc721Transfer = createERC721Transfer(
    dao,
    from,
    to,
    token,
    tokenId,
    txHash,
    timestamp
  );

  erc721Transfer.proposal = proposalId;
  erc721Transfer.token = contract.id;
  erc721Transfer.type = 'Withdraw';
  erc721Transfer.save();

  updateERC721Balance(
    dao.toHexString(),
    token.toHexString(),
    tokenId,
    timestamp,
    TransferType.Withdraw
  );
}
