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

  earlyExecution: boolean,
  voteReplacement: boolean,
  supportThreshold: string,
  minParticipation: string,
  startDate: string,
  endDate: string,
  snapshotBlock: string,

  abstain: string,
  yes: string,
  no: string,
  totalVotingPower: string,

  actions: ethereum.Tuple[]
): void {
  let configuration = new ethereum.Tuple();

  configuration.push(ethereum.Value.fromBoolean(earlyExecution));
  configuration.push(ethereum.Value.fromBoolean(voteReplacement));
  configuration.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(supportThreshold))
  );
  configuration.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(minParticipation))
  );
  configuration.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(startDate))
  );
  configuration.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(endDate))
  );
  configuration.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(snapshotBlock))
  );

  let tally = new ethereum.Tuple();

  tally.push(ethereum.Value.fromUnsignedBigInt(BigInt.fromString(abstain)));
  tally.push(ethereum.Value.fromUnsignedBigInt(BigInt.fromString(yes)));
  tally.push(ethereum.Value.fromUnsignedBigInt(BigInt.fromString(no)));
  tally.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(totalVotingPower))
  );

  createMockedFunction(
    Address.fromString(contractAddress),
    'getProposal',
    'getProposal(uint256):(bool,bool,(bool,bool,uint64,uint64,uint64,uint64,uint64),(uint256,uint256,uint256,uint256),(address,uint256,bytes)[])'
  )
    .withArgs([
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(proposalId))
    ])
    .returns([
      ethereum.Value.fromBoolean(open),
      ethereum.Value.fromBoolean(executed),

      // Configuration
      ethereum.Value.fromTuple(configuration),

      // Tally
      ethereum.Value.fromTuple(tally),

      ethereum.Value.fromTupleArray(actions)
    ]);
}
