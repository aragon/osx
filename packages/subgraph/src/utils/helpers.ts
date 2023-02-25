import {BigInt, Bytes} from '@graphprotocol/graph-ts';

export function bigIntToBytes32(input: BigInt): string {
  const inputBytes = Bytes.fromBigInt(input);
  const result = new Bytes(32);

  result.set(inputBytes, 32 - inputBytes.length);

  return result.toHexString();
}
