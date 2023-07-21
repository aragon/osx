import {ethers} from 'hardhat';
import {defaultAbiCoder} from 'ethers/lib/utils';

// See https://eips.ethereum.org/EIPS/eip-1967
export const IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'; // bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)

export function readImplementationValuesFromSlot(
  contractAddresses: string[]
): Promise<string[]> {
  return Promise.all(
    contractAddresses.map(contractAddress =>
      readImplementationValueFromSlot(contractAddress)
    )
  );
}

export function readImplementationValueFromSlot(
  contractAddress: string
): Promise<string> {
  return ethers.provider
    .getStorageAt(contractAddress, IMPLEMENTATION_SLOT)
    .then(encoded => defaultAbiCoder.decode(['address'], encoded)[0]);
}
