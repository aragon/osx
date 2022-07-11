import {ethers} from 'hardhat';

export function ensLabelHash(label: string): string {
  return ethers.utils.id(label);
}

export function ensDomainHash(name: string): string {
  return ethers.utils.namehash(name);
}
