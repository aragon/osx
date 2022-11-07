import {ethers} from 'hardhat';

import {
  PluginRepoRegistry,
  PluginUUPSUpgradeableSetupV1Mock,
} from '../../typechain';
import {getMergedABI} from '../../utils/abi';

export async function deployMockPluginSetup(): Promise<PluginUUPSUpgradeableSetupV1Mock> {
  const PluginSetupMock = await ethers.getContractFactory(
    'PluginUUPSUpgradeableSetupV1Mock'
  );
  const pluginSetupMockContract = await PluginSetupMock.deploy();

  return pluginSetupMockContract;
}

export async function deployNewPluginRepo(ownerAddress: any): Promise<any> {
  const PluginRepo = await ethers.getContractFactory('PluginRepo');
  const newPluginRepo = await PluginRepo.deploy();
  await newPluginRepo.initialize(ownerAddress);

  return newPluginRepo;
}

export async function deployPluginRepoFactory(
  signers: any,
  pluginRepoRegistry: PluginRepoRegistry
): Promise<any> {
  const {abi, bytecode} = await getMergedABI(
    // @ts-ignore
    hre,
    'PluginRepoFactory',
    ['PluginRepoRegistry']
  );

  // PluginRepoFactory
  const PluginRepoFactory = new ethers.ContractFactory(
    abi,
    bytecode,
    signers[0]
  );

  const pluginRepoFactory = await PluginRepoFactory.deploy(
    pluginRepoRegistry.address
  );

  return pluginRepoFactory;
}

export async function deployPluginRepoRegistry(
  managingDao: any,
  ensSubdomainRegistrar: any
): Promise<PluginRepoRegistry> {
  let pluginRepoRegistry: PluginRepoRegistry;

  const PluginRepoRegistry = await ethers.getContractFactory(
    'PluginRepoRegistry'
  );
  pluginRepoRegistry = await PluginRepoRegistry.deploy();
  await pluginRepoRegistry.initialize(
    managingDao.address,
    ensSubdomainRegistrar.address
  );

  return pluginRepoRegistry;
}
