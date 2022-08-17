import {ethers} from 'hardhat';

import {PluginManagerMock} from '../../typechain';

export async function deployMockPluginManager(): Promise<PluginManagerMock> {
  const PluginManagerMock = await ethers.getContractFactory(
    'PluginManagerMock'
  );
  const pluginManagerMockContract = await PluginManagerMock.deploy();

  return pluginManagerMockContract;
}

export async function deployNewPluginRepo(ownerAddress: any): Promise<any> {
  const PluginRepo = await ethers.getContractFactory('PluginRepo');
  const newPluginRepo = await PluginRepo.deploy();
  await newPluginRepo.initialize(ownerAddress);

  return newPluginRepo;
}
