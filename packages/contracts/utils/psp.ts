import {defaultAbiCoder, keccak256} from 'ethers/lib/utils';

export function hashHelpers(helpers: string[]) {
  return keccak256(defaultAbiCoder.encode(['address[]'], [helpers]));
}
