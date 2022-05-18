import {ethers} from 'hardhat';

export enum VoterState {
  None,
  Abstain,
  Yea,
  Nay,
}

export const toBn = ethers.BigNumber.from;
const bigExp = (x: number, y: number) => toBn(x).mul(toBn(10).pow(toBn(y)));
export const pct16 = (x: number) => bigExp(x, 16);

export const EVENTS = {
  UPDATE_CONFIG: 'UpdateConfig',
  START_VOTE: 'StartVote',
  CAST_VOTE: 'CastVote',
  EXECUTED: 'Executed',
};
