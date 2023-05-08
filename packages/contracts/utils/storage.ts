import {ethers} from 'hardhat';
import {defaultAbiCoder} from 'ethers/lib/utils';

import {IMPLEMENTATION_SLOT} from '../test/test-utils/uups-upgradeable';

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
  return ethers.provider.getStorageAt(
    contractAddress,
    IMPLEMENTATION_SLOT
  ).then((encoded) => 
    defaultAbiCoder.decode(['address'], encoded)[0]
  );
}
