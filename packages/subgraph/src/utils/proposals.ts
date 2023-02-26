import {Address, BigInt} from '@graphprotocol/graph-ts';
import {bigIntToBytes32} from './bytes';

export function getProposalId(
  plugin: Address,
  pluginProposalId: BigInt
): string {
  return plugin
    .toHexString()
    .concat('_')
    .concat(bigIntToBytes32(pluginProposalId));
}
