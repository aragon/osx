import {ethers} from 'hardhat';

// @ts-ignore
export function setBit(index: number, num: ethers.BigNumber) {
  const mask = ethers.BigNumber.from(1).shl(index & 0xff);
  return num.or(mask);
}

// @ts-ignore
export function unsetBit(index: number, num: ethers.BigNumber) {
  if (!getBit(index, num)) {
    return num;
  }
  const mask = ethers.BigNumber.from(1).shl(index & 0xff);
  return num.xor(mask);
}

// @ts-ignore
export function getBit(index: number, num: ethers.BigNumber) {
  const mask = ethers.BigNumber.from(1).shl(index & 0xff);
  return !num.and(mask).eq(0);
}
