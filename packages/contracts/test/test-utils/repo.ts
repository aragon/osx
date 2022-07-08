import {ethers} from 'hardhat';

import {PluginFactoryMock} from '../../typechain';

export async function deployMockPluginFactory(): Promise<PluginFactoryMock> {
  const PluginFactoryMock = await ethers.getContractFactory(
    'PluginFactoryMock'
  );
  const pluginFactoryMockContract = await PluginFactoryMock.deploy();

  return pluginFactoryMockContract;
}

export async function deployNewPluginRepo(ownerAddress: any): Promise<any> {
  const PluginRepo = await ethers.getContractFactory('PluginRepo');
  const newPluginRepo = await PluginRepo.deploy();
  await newPluginRepo.initialize(ownerAddress);

  return newPluginRepo;
}
