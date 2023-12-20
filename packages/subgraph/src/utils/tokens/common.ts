import {BigInt, Bytes} from '@graphprotocol/graph-ts';

export const onERC721Received = '0x150b7a02';
export const ERC721_safeTransferFromNoData = '0x42842e0e';
export const ERC721_safeTransferFromWithData = '0xb88d4fde';
export const ERC721_transferFrom = '0x23b872dd';

export const ERC20_transfer = '0xa9059cbb';
export const ERC20_transferFrom = '0x23b872dd';

export const onERC1155Received = '0xf23a6e61'; // `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))` (i.e. 0xf23a6e61) if it accepts the transfer.
export const onERC1155BatchReceived = '0xbc197c81'; // `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))` (i.e. 0xbc197c81) if it accepts the transfer(s).
export const ERC1155_safeTransferFrom = '0xf242432a'; // `bytes4(keccak256("safeTransferFrom(address,address,uint256,uint256,bytes)"))` (i.e. 0xf242432a).
export const ERC1155_safeBatchTransferFrom = '0x2eb2c2d6'; // `bytes4(keccak256("safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)"))` (i.e. 0x2eb2c2d6).

export enum TransferType {
  Withdraw,
  Deposit,
}

export const DECODE_OFFSET =
  '0x0000000000000000000000000000000000000000000000000000000000000020';

export const ERC165_INTERFACE_ID = '01ffc9a7';
export const ERC1155_INTERFACE_ID = 'd9b67a26';

// Unique ID generation for token transfer entities
export function getTransferId(
  txHash: Bytes,
  logIndex: BigInt,
  actionIndex: number
): string {
  return txHash
    .toHexString()
    .concat('_')
    .concat(logIndex.toString())
    .concat('_')
    .concat(actionIndex.toString());
}

// Unique ID generation for token balance entities
export function getBalanceId(daoId: string, token: string): string {
  return daoId.concat('_').concat(token);
}

// Unique ID generation for token balance entities
export function getTokenIdBalanceId(
  daoId: string,
  token: string,
  tokenId: BigInt
): string {
  return daoId.concat('_').concat(token).concat('_').concat(tokenId.toString());
}

// Unique ID generation for ERC1155 transfers
export function getERC1155TransferId(
  txHash: Bytes,
  logIndex: BigInt,
  actionIndex: number,
  batchIndex: number
): string {
  return (
    txHash
      .toHexString()
      .concat('_')
      .concat(logIndex.toString())
      .concat('_')
      .concat(actionIndex.toString())
      .concat('_')
      // add iteration for supporting batch transfers
      .concat(batchIndex.toString())
  );
}
