import {ethers as ethersDirect} from 'ethers';
import {ethers} from 'hardhat';

export function getInterfaceID(
  contractInterface: ethersDirect.utils.Interface
) {
  let interfaceID = ethers.constants.Zero;
  const functions: string[] = Object.keys(contractInterface.functions);
  for (let i = 0; i < functions.length; i++) {
    interfaceID = interfaceID.xor(contractInterface.getSighash(functions[i]));
  }
  return interfaceID.toHexString();
}

export const ADMIN_INTERFACE = new ethers.utils.Interface([
  'function initialize(address)',
  'function executeProposal(bytes,tuple(address,uint256,bytes)[],uint256)',
]);

export const TOKEN_VOTING_INTERFACE = new ethers.utils.Interface([
  'function initialize(address,tuple(uint8,uint32,uint32,uint64,uint256),address)',
  'function getVotingToken()',
]);

export const ADDRESSLIST_VOTING_INTERFACE = new ethers.utils.Interface([
  'function initialize(address,tuple(uint8,uint32,uint32,uint64,uint256),address[])',
  'function addAddresses(address[])',
  'function removeAddresses(address[])',
]);

export const MULTISIG_INTERFACE = new ethers.utils.Interface([
  'function initialize(address,address[],tuple(bool,uint16))',
  'function updateMultisigSettings(tuple(bool,uint16))',
  'function createProposal(bytes,tuple(address,uint256,bytes)[],uint256,bool,bool,uint64,uint64) ',
  'function getProposal(uint256)',
]);
