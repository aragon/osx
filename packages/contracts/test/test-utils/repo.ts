import {ethers} from 'hardhat';

import {PluginFactoryMock} from '../../typechain';

export async function deployMockPluginFactory(): Promise<PluginFactoryMock> {
  const PluginFactoryMock = await ethers.getContractFactory(
    'PluginFactoryMock'
  );
  const pluginFactoryMockContract = await PluginFactoryMock.deploy();

  return pluginFactoryMockContract;
}
