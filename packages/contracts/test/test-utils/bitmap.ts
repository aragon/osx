import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';

// @ts-ignore
export function flipBit(index: number, num: BigNumber) {
  const mask = ethers.BigNumber.from(1).shl(index & 0xff);
  return num.xor(mask);
}

// @ts-ignore
export function getBit(index: number, num: BigNumber) {
  const mask = ethers.BigNumber.from(1).shl(index & 0xff);
  return !num.and(mask).eq(0);
}
