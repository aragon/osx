import {ethers} from 'hardhat';

// @ts-ignore
export function flipBit(index: number, num: ethers.BigNumber) {
  const mask = ethers.BigNumber.from(1).shl(index & 0xff);
  return num.xor(mask);
}

// @ts-ignore
export function getBit(index: number, num: ethers.BigNumber) {
  const mask = ethers.BigNumber.from(1).shl(index & 0xff);
  return !num.and(mask).eq(0);
}
