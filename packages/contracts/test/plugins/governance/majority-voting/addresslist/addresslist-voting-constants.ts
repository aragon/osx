import {ethers} from 'hardhat';

export const ADDRESSLIST_VOTING_INTERFACE = new ethers.utils.Interface([
  'function initialize(address,tuple(uint8,uint32,uint32,uint64,uint256),address[])',
  'function addAddresses(address[])',
  'function removeAddresses(address[])',
]);
