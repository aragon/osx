import {ethers} from 'hardhat';

import {
  PluginRepoRegistry,
  PluginRepoFactory,
  PluginRepo,
  PluginUUPSUpgradeableSetupV1Mock,
} from '../../../typechain';
import {deployWithProxy} from './proxy';
import {getMergedABI} from '../../utils/abi';

export async function deployMockPluginSetup(): Promise<PluginUUPSUpgradeableSetupV1Mock> {
  const PluginSetupMock = await ethers.getContractFactory(
    'PluginUUPSUpgradeableSetupV1Mock'
  );
  const pluginSetupMockContract = await PluginSetupMock.deploy();

  return pluginSetupMockContract;
}

export async function deployNewPluginRepo(
  ownerAddress: any
): Promise<PluginRepo> {
  const PluginRepo = await ethers.getContractFactory('PluginRepo');
  const newPluginRepo = await deployWithProxy<PluginRepo>(PluginRepo);
  await newPluginRepo.initialize(ownerAddress);

  return newPluginRepo;
}

export async function deployPluginRepoFactory(
  signers: any,
  pluginRepoRegistry: PluginRepoRegistry
): Promise<PluginRepoFactory> {
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

  const pluginRepoFactory = (await PluginRepoFactory.deploy(
    pluginRepoRegistry.address
  )) as PluginRepoFactory;

  return pluginRepoFactory;
}

export async function deployPluginRepoRegistry(
  managingDao: any,
  ensSubdomainRegistrar: any
): Promise<PluginRepoRegistry> {
  const PluginRepoRegistry = await ethers.getContractFactory(
    'PluginRepoRegistry'
  );

  let pluginRepoRegistry = await deployWithProxy<PluginRepoRegistry>(
    PluginRepoRegistry
  );

  await pluginRepoRegistry.initialize(
    managingDao.address,
    ensSubdomainRegistrar.address
  );

  return pluginRepoRegistry;
}
