import {ethers} from 'hardhat';
import {expect} from 'chai';

export enum VoteOption {
  None,
  Abstain,
  Yes,
  No,
}

const toBn = ethers.BigNumber.from;
const bigExp = (x: number, y: number) => toBn(x).mul(toBn(10).pow(toBn(y)));
export const pct16 = (x: number) => bigExp(x, 16);

export async function getTime(): Promise<number> {
  return (await ethers.provider.getBlock('latest')).timestamp;
}

export async function advanceTime(time: number) {
  await ethers.provider.send('evm_increaseTime', [time]);
  await ethers.provider.send('evm_mine', []);
}

export async function advanceTimeTo(timestamp: number) {
  const delta = timestamp - (await getTime());
  await advanceTime(delta);
}

export async function advanceIntoVoteTime(startDate: number, endDate: number) {
  await advanceTimeTo(startDate);
  expect(await getTime()).to.be.greaterThanOrEqual(startDate);
  expect(await getTime()).to.be.lessThan(endDate);
}

export async function advanceAfterVoteEnd(endDate: number) {
  await advanceTimeTo(endDate);
  expect(await getTime()).to.be.greaterThanOrEqual(endDate);
}
