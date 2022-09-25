import {ethers} from 'hardhat';

import {PluginSetupV1Mock} from '../../typechain';

export async function deployMockPluginSetup(): Promise<PluginSetupV1Mock> {
  const PluginSetupMock = await ethers.getContractFactory('PluginSetupV1Mock');
  const pluginSetupMockContract = await PluginSetupMock.deploy();

  return pluginSetupMockContract;
}

export async function deployNewPluginRepo(ownerAddress: any): Promise<any> {
  const PluginRepo = await ethers.getContractFactory('PluginRepo');
  const newPluginRepo = await PluginRepo.deploy();
  await newPluginRepo.initialize(ownerAddress);

  return newPluginRepo;
}
