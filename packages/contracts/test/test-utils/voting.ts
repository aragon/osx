import {ethers} from 'hardhat';

export enum VoterState {
  None,
  Abstain,
  Yea,
  Nay,
}

const toBn = ethers.BigNumber.from;
const bigExp = (x: number, y: number) => toBn(x).mul(toBn(10).pow(toBn(y)));
export const pct16 = (x: number) => bigExp(x, 16);

export const VOTING_EVENTS = {
  CONFIG_UPDATED: 'ConfigUpdated',
  VOTE_STARTED: 'VoteStarted',
  VOTE_CAST: 'VoteCast',
  VOTE_EXECUTED: 'VoteExecuted',
};
