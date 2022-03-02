import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction} from 'matchstick-as/assembly/index';

export function createMockGetter(
  contractAddress: string,
  funcName: string,
  funcSigniture: string,
  returns: ethereum.Value[]
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    funcName,
    funcSigniture
  )
    .withArgs([])
    .returns(returns);
}

export function createTokenCalls(
  contractAddress: string,
  name: string,
  symbol: string,
  decimals: string
): void {
  createMockGetter(contractAddress, 'name', 'name():(string)', [
    ethereum.Value.fromString(name)
  ]);

  createMockGetter(contractAddress, 'symbol', 'symbol():(string)', [
    ethereum.Value.fromString(symbol)
  ]);

  createMockGetter(contractAddress, 'decimals', 'decimals():(uint8)', [
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(decimals))
  ]);
}

export function createDummyAcctions(
  address: string,
  value: string,
  data: string
): ethereum.Tuple[] {
  let tuple = new ethereum.Tuple();

  tuple.push(ethereum.Value.fromAddress(Address.fromString(address)));
  tuple.push(ethereum.Value.fromSignedBigInt(BigInt.fromString(value)));
  tuple.push(ethereum.Value.fromBytes(Bytes.fromHexString(data) as Bytes));

  return [tuple];
}
