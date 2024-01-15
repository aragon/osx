import {ethers} from 'hardhat';

export const MAJORITY_VOTING_BASE_INTERFACE = new ethers.utils.Interface([
  'function minDuration()',
  'function minProposerVotingPower()',
  'function votingMode()',
  'function totalVotingPower(uint256)',
  'function getProposal(uint256)',
  'function updateVotingSettings(tuple(uint8,uint32,uint32,uint64,uint256))',
  'function createProposal(bytes,tuple(address,uint256,bytes)[],uint256,uint64,uint64,uint8,bool)',
]);

export const VOTING_EVENTS = {
  VOTING_SETTINGS_UPDATED: 'VotingSettingsUpdated',
  VOTE_CAST: 'VoteCast',
};
