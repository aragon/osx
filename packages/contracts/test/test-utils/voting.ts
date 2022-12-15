import {ethers} from 'hardhat';
import {expect} from 'chai';
import {BigNumber} from 'ethers';

export enum VoteOption {
  None,
  Abstain,
  Yes,
  No,
}

export enum VoteMode {
  Standard,
  EarlyExecution,
  VoteReplacement,
}

export type MajorityVotingSettings = {
  voteMode: number;
  supportThreshold: BigNumber;
  minParticipation: BigNumber;
  minDuration: number;
  minProposerVotingPower: number;
};

const toBn = ethers.BigNumber.from;
const bigExp = (x: number, y: number) => toBn(x).mul(toBn(10).pow(toBn(y)));
export const pct16 = (x: number) => bigExp(x, 16);

export const ONE_HOUR = 60 * 60;
export const ONE_DAY = 24 * ONE_HOUR;
export const ONE_YEAR = 365 * ONE_DAY;

export const MAX_UINT64 = toBn(2).pow(toBn(64)).sub(1);

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
