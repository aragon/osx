import {BigInt, Bytes} from '@graphprotocol/graph-ts';

export const onERC721Received = '0x150b7a02';
export const ERC721_safeTransferFromNoData = '0x42842e0e';
export const ERC721_safeTransferFromWithData = '0xb88d4fde';
export const ERC721_transferFrom = '0x23b872dd';

export const ERC20_transfer = '0xa9059cbb';
export const ERC20_transferFrom = '0x23b872dd';

export enum TransferType {
  Withdraw,
  Deposit
}

export const DECODE_OFFSET =
  '0x0000000000000000000000000000000000000000000000000000000000000020';

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
