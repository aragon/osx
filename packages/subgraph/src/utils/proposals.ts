import {bigIntToBytes32} from './bytes';
import {Address, BigInt} from '@graphprotocol/graph-ts';

export function getProposalId(
  plugin: Address,
  pluginProposalId: BigInt
): string {
  return plugin
    .toHexString()
    .concat('_')
    .concat(bigIntToBytes32(pluginProposalId));
}
