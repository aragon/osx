import {ethers} from 'hardhat';

import {PluginSetupMock} from '../../typechain';

export async function deployMockPluginSetup(): Promise<PluginSetupMock> {
  const PluginSetupMock = await ethers.getContractFactory('PluginSetupMock');
  const pluginSetupMockContract = await PluginSetupMock.deploy();

  return pluginSetupMockContract;
}

export async function deployNewPluginRepo(ownerAddress: any): Promise<any> {
  const PluginRepo = await ethers.getContractFactory('PluginRepo');
  const newPluginRepo = await PluginRepo.deploy();
  await newPluginRepo.initialize(ownerAddress);

  return newPluginRepo;
}
