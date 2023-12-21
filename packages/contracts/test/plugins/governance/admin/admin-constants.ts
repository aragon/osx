import {ethers} from 'hardhat';

export const ADMIN_INTERFACE = new ethers.utils.Interface([
  'function initialize(address)',
  'function executeProposal(bytes,tuple(address,uint256,bytes)[],uint256)',
]);

// Permissions
export const EXECUTE_PROPOSAL_PERMISSION_ID = ethers.utils.id(
  'EXECUTE_PROPOSAL_PERMISSION'
);
