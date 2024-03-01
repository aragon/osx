import {Address} from '@graphprotocol/graph-ts';

export function generateEntityIdFromAddress(address: Address): string {
  return address.toHexString();
}

export function generatePluginEntityId(pluginAddress: Address): string {
  return generateEntityIdFromAddress(pluginAddress);
}

export function generateMemberEntityId(
  pluginAddress: Address,
  memberAddress: Address
): string {
  return [pluginAddress.toHexString(), memberAddress.toHexString()].join('_');
}
