import {ethers} from 'hardhat';

export const MULTISIG_EVENTS = {
  MULTISIG_SETTINGS_UPDATED: 'MultisigSettingsUpdated',
  APPROVED: 'Approved',
};

export const MULTISIG_INTERFACE = new ethers.utils.Interface([
  'function initialize(address,address[],tuple(bool,uint16))',
  'function updateMultisigSettings(tuple(bool,uint16))',
  'function createProposal(bytes,tuple(address,uint256,bytes)[],uint256,bool,bool,uint64,uint64) ',
  'function getProposal(uint256)',
]);

export const UPDATE_MULTISIG_SETTINGS_PERMISSION_ID = ethers.utils.id(
  'UPDATE_MULTISIG_SETTINGS_PERMISSION'
);

export type MultisigSettings = {
  minApprovals: number;
  onlyListed: boolean;
};
