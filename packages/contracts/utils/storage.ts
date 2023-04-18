import {ethers} from 'hardhat';
import {IMPLEMENTATION_SLOT} from '../test/test-utils/oz-constants';

import {defaultAbiCoder} from 'ethers/lib/utils';

export async function readImplementationValuesFromSlot(
  contractAddresses: string[]
): Promise<string[]> {
  const implementationValues: string[] = await Promise.all(
    contractAddresses.map(async contractAddress => {
      return readImplementationValueFromSlot(contractAddress);
    })
  );

  return implementationValues;
}

export async function readImplementationValueFromSlot(
  contractAddress: string
): Promise<string> {
  const encoded = await ethers.provider.getStorageAt(
    contractAddress,
    IMPLEMENTATION_SLOT
  );
  return defaultAbiCoder.decode(['address'], encoded)[0];
}
