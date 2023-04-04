import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {
  ERC721Balance,
  ERC721Contract,
  ERC721Transfer
} from '../../../generated/schema';
import {ERC721} from '../../../generated/templates/DaoTemplateV1_0_0/ERC721';
import {supportsInterface} from '../erc165';
import {DECODE_OFFSET, getTransferId, TransferType} from './common';
import {
  ERC721_safeTransferFromNoData,
  ERC721_safeTransferFromWithData,
  ERC721_transferFrom
} from './common';

function supportsERC721(token: Address): bool {
  // Double check that it's ERC721 by calling supportsInterface checks.
  let erc721 = ERC721.bind(token);
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
  daoId: string,
  token: string,
  tokenId: BigInt,
  timestamp: BigInt,
  type: TransferType
): void {
  let balanceId = daoId.concat('_').concat(token);
  let erc721Balance = ERC721Balance.load(balanceId);

  if (!erc721Balance) {
    erc721Balance = new ERC721Balance(balanceId);
    erc721Balance.dao = daoId;
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

export function handleERC721Received(
  token: Address,
  dao: Address,
  data: Bytes,
  event: ethereum.Event
): void {
  let contract = fetchERC721(token);
  if (!contract) {
    return;
  }

  let calldata = DECODE_OFFSET + data.toHexString().slice(10);
  let decodeABI = '(address,address,uint256,bytes)';

  let decoded = ethereum.decode(decodeABI, Bytes.fromHexString(calldata));

  if (!decoded) {
    return;
  }

  let tuple = decoded.toTuple();
  let from = tuple[1].toAddress();
  let tokenId = tuple[2].toBigInt();

  let daoId = dao.toHexString();

  updateERC721Balance(
    daoId,
    token.toHexString(),
    tokenId,
    event.block.timestamp,
    TransferType.Deposit
  );

  let transferId = getTransferId(
    event.transaction.hash,
    event.transactionLogIndex,
    0
  );

  let transfer = new ERC721Transfer(transferId);
  transfer.from = from;
  transfer.to = dao;
  transfer.dao = daoId;
  transfer.token = contract.id;
  transfer.tokenId = tokenId;
  transfer.txHash = event.transaction.hash;
  transfer.createdAt = event.block.timestamp;
  transfer.type = 'Deposit';
  transfer.save();
}

export function handleERC721Action(
  token: Address,
  dao: Address,
  data: Bytes,
  proposalId: string,
  actionIndex: number,
  event: ethereum.Event
): void {
  let contract = fetchERC721(token);
  if (!contract) {
    return;
  }

  let functionSelector = data.toHexString().substring(0, 10);
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

  let decoded = ethereum.decode(decodeABI, Bytes.fromHexString(calldata));

  if (!decoded) {
    return;
  }

  let tuple = decoded.toTuple();

  let from = tuple[0].toAddress();
  let to = tuple[1].toAddress();
  let tokenId = tuple[2].toBigInt();

  let daoId = dao.toHexString();

  let transferId = getTransferId(
    event.transaction.hash,
    event.transactionLogIndex,
    actionIndex
  );

  let transfer = new ERC721Transfer(transferId);
  transfer.from = from;
  transfer.to = to;
  transfer.dao = daoId;
  transfer.token = contract.id;
  transfer.tokenId = tokenId;
  transfer.proposal = proposalId;
  transfer.txHash = event.transaction.hash;
  transfer.createdAt = event.block.timestamp;

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

    updateERC721Balance(
      daoId,
      token.toHexString(),
      tokenId,
      event.block.timestamp,
      TransferType.Deposit
    );
  } else {
    transfer.type = 'Withdraw';

    updateERC721Balance(
      daoId,
      token.toHexString(),
      tokenId,
      event.block.timestamp,
      TransferType.Withdraw
    );
  }

  transfer.save();
}
