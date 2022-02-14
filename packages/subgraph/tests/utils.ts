import {Address, ethereum} from '@graphprotocol/graph-ts';
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
