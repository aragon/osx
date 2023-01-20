import {ethers} from 'hardhat';
import {expect} from 'chai';
import {BigNumber, Contract} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

export enum VoteOption {
  None,
  Abstain,
  Yes,
  No,
}

export enum VotingMode {
  Standard,
  EarlyExecution,
  VoteReplacement,
}

export type VotingSettings = {
  votingMode: number;
  supportThreshold: BigNumber;
  minParticipation: BigNumber;
  minDuration: number;
  minProposerVotingPower: number;
};

export const RATIO_BASE = ethers.BigNumber.from(10).pow(6); // 100% => 10**6
export const pctToRatio = (x: number) => RATIO_BASE.mul(x).div(100);

export const ONE_HOUR = 60 * 60;
export const ONE_DAY = 24 * ONE_HOUR;
export const ONE_YEAR = 365 * ONE_DAY;

export const MAX_UINT64 = ethers.BigNumber.from(2).pow(64).sub(1);

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

export async function voteWithSigners(
  votingContract: Contract,
  proposalId: number,
  signers: SignerWithAddress[],
  signerIds: {
    yes: number[];
    no: number[];
    abstain: number[];
  }
) {
  let promises = signerIds.yes.map(i =>
    votingContract.connect(signers[i]).vote(proposalId, VoteOption.Yes, false)
  );

  promises = promises.concat(
    signerIds.no.map(i =>
      votingContract.connect(signers[i]).vote(proposalId, VoteOption.No, false)
    )
  );
  promises = promises.concat(
    signerIds.abstain.map(i =>
      votingContract
        .connect(signers[i])
        .vote(proposalId, VoteOption.Abstain, false)
    )
  );

  await Promise.all(promises);
}

export async function timestampIn(durationInSec: number): Promise<number> {
  return (await ethers.provider.getBlock('latest')).timestamp + durationInSec;
}

export async function setTimeForNextBlock(timestamp: number): Promise<void> {
  await ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
}

export function toBytes32(num: number): string {
  const hex = num.toString(16);
  return `0x${'0'.repeat(64 - hex.length)}${hex}`;
}
