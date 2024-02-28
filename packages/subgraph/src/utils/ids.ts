import {Address} from '@graphprotocol/graph-ts';
import {generateEntityIdFromAddress} from '@aragon/osx-commons-subgraph';

export function generateMemberEntityId(
  pluginAddress: Address,
  memberAddress: Address
): string {
  return [
    generateEntityIdFromAddress(pluginAddress),
    generateEntityIdFromAddress(memberAddress)
  ].join('_');
}
