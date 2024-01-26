import {
  generateEntityIdFromAddress,
  generateEntityIdFromBytes,
} from '@aragon/osx-commons-subgraph';
import {Address, BigInt, Bytes} from '@graphprotocol/graph-ts';

export function generateTokenEntityId(tokenAddress: Address): string {
  return generateEntityIdFromAddress(tokenAddress);
}

export function generateERC1155TransferEntityId(
  txHash: Bytes,
  logIndex: BigInt,
  actionIndex: number,
  batchIndex: number
): string {
  return [
    generateEntityIdFromBytes(txHash),
    logIndex.toString(),
    actionIndex.toString(),
    batchIndex.toString(),
  ].join('_');
}

export function generateVoterEntityId(
  memberEntityId: string,
  proposalId: string
): string {
  return [memberEntityId, proposalId].join('_');
}

export function generateMemberEntityId(
  pluginAddress: Address,
  memberAddress: Address
): string {
  return [
    generateEntityIdFromAddress(pluginAddress),
    generateEntityIdFromAddress(memberAddress),
  ].join('_');
}

export function generateVoteEntityId(
  memberAddress: Address,
  proposalId: string
): string {
  return [generateEntityIdFromAddress(memberAddress), proposalId].join('_');
}

export function generateAdministratorAdminPluginEntityId(
  pluginAddress: Address,
  administratorAddress: Address
): string {
  return [
    generateEntityIdFromAddress(pluginAddress),
    generateEntityIdFromAddress(administratorAddress),
  ].join('_');
}
