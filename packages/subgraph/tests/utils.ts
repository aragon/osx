import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {createMockedFunction} from 'matchstick-as/assembly/index';

export function createMockGetter(
  contractAddress: string,
  funcName: string,
  funcSignature: string,
  returns: ethereum.Value[]
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    funcName,
    funcSignature
  )
    .withArgs([])
    .returns(returns);
}

export function createTokenCalls(
  contractAddress: string,
  name: string,
  symbol: string,
  decimals: string | null,
  totalSupply: string | null
): void {
  createMockGetter(contractAddress, 'name', 'name():(string)', [
    ethereum.Value.fromString(name)
  ]);

  createMockGetter(contractAddress, 'symbol', 'symbol():(string)', [
    ethereum.Value.fromString(symbol)
  ]);

  if (decimals) {
    createMockGetter(contractAddress, 'decimals', 'decimals():(uint8)', [
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(decimals))
    ]);
  }

  if (totalSupply) {
    createMockGetter(
      contractAddress,
      'totalSupply',
      'totalSupply():(uint256)',
      [ethereum.Value.fromUnsignedBigInt(BigInt.fromString(totalSupply))]
    );
  }
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

  votingMode: string,
  supportThreshold: string,
  minVotingPower: string,
  startDate: string,
  endDate: string,
  snapshotBlock: string,

  abstain: string,
  yes: string,
  no: string,

  actions: ethereum.Tuple[],
  allowFailureMap: string
): void {
  let parameters = new ethereum.Tuple();

  parameters.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(votingMode))
  );
  parameters.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(supportThreshold))
  );
  parameters.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(startDate))
  );
  parameters.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(endDate))
  );
  parameters.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(snapshotBlock))
  );
  parameters.push(
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(minVotingPower))
  );

  let tally = new ethereum.Tuple();

  tally.push(ethereum.Value.fromUnsignedBigInt(BigInt.fromString(abstain)));
  tally.push(ethereum.Value.fromUnsignedBigInt(BigInt.fromString(yes)));
  tally.push(ethereum.Value.fromUnsignedBigInt(BigInt.fromString(no)));

  createMockedFunction(
    Address.fromString(contractAddress),
    'getProposal',
    'getProposal(uint256):(bool,bool,(uint8,uint32,uint64,uint64,uint64,uint256),(uint256,uint256,uint256),(address,uint256,bytes)[],uint256)'
  )
    .withArgs([
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(proposalId))
    ])
    .returns([
      ethereum.Value.fromBoolean(open),
      ethereum.Value.fromBoolean(executed),

      // ProposalParameters
      ethereum.Value.fromTuple(parameters),

      // Tally
      ethereum.Value.fromTuple(tally),

      ethereum.Value.fromTupleArray(actions),

      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(allowFailureMap))
    ]);
}

export function createTotalVotingPowerCall(
  contractAddress: string,
  blockNumber: string,

  totalVotingPower: string
): void {
  createMockedFunction(
    Address.fromString(contractAddress),
    'totalVotingPower',
    'totalVotingPower(uint256):(uint256)'
  )
    .withArgs([
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(blockNumber))
    ])
    .returns([
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString(totalVotingPower))
    ]);
}
