import {BigInt} from '@graphprotocol/graph-ts';

export function bigIntToBytes32(input: BigInt): string {
  const hexString = input
    .toHexString() // convert to hex, example: 0x1
    .slice(2) // remove 0x
    .padStart(64, '0'); // pad left with '0' until reaching target length of 32 bytes
  return `0x${hexString}`; // add 0x to the start
}
