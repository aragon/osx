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

export function createDummyActions(
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

export function createGetProposalCall(
  contractAddress: string,
  proposalId: string,
  open: boolean,
  executed: boolean,
  startDate: string,
  endDate: string,
  snapshotBlock: string,
  supportThreshold: string,
  participationThreshold: string,
  totalVotingPower: string,
  yes: string,
  no: string,
  abstain: string,
  actions: ethereum.Tuple[]
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'getProposal',
    'getProposal(uint256):(bool,bool,uint64,uint64,uint64,uint64,uint64,uint256,uint256,uint256,uint256,(address,uint256,bytes)[])'
  )
    .withArgs([
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(proposalId))
    ])
    .returns([
      ethereum.Value.fromBoolean(open),
      ethereum.Value.fromBoolean(executed),
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(startDate)),
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(endDate)),
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(snapshotBlock)),
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(supportThreshold)),
      ethereum.Value.fromUnsignedBigInt(
        BigInt.fromString(participationThreshold)
      ),
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(totalVotingPower)),
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(yes)),
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(no)),
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(abstain)),
      ethereum.Value.fromTupleArray(actions)
    ]);
}
