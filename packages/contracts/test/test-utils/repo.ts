import {ethers} from 'hardhat';

import {
  PluginRepoRegistry,
  PluginRepoFactory,
  PluginSetupV1Mock,
  PluginRepo,
} from '../../typechain';
import {deployWithProxy} from './proxy';

export async function deployMockPluginSetup(): Promise<PluginSetupV1Mock> {
  const PluginSetupMock = await ethers.getContractFactory('PluginSetupV1Mock');
  const pluginSetupMockContract = await PluginSetupMock.deploy();

  return pluginSetupMockContract;
}

export async function deployNewPluginRepo(
  ownerAddress: any
): Promise<PluginRepo> {
  const PluginRepo = await ethers.getContractFactory('PluginRepo');
  const newPluginRepo = (await deployWithProxy(PluginRepo)) as PluginRepo;
  await newPluginRepo.initialize(ownerAddress);

  return newPluginRepo;
}

export async function deployPluginRepoFactory(
  signers: any,
  pluginRepoRegistry: PluginRepoRegistry
): Promise<PluginRepoFactory> {
  // @ts-ignore
  const PluginRepoRegistryArtifact = await hre.artifacts.readArtifact(
    'PluginRepoRegistry'
  );
  // @ts-ignore
  const PluginRepoFactoryArtifact = await hre.artifacts.readArtifact(
    'PluginRepoFactory'
  );

  const _merged = [
    ...PluginRepoFactoryArtifact.abi,
    ...PluginRepoRegistryArtifact.abi.filter((f: any) => f.type === 'event'),
  ];

  // remove duplicated events
  const mergedAbi = _merged.filter(
    (value, index, self) =>
      index === self.findIndex(event => event.name === value.name)
  );

  // PluginRepoFactory
  const PluginRepoFactory = new ethers.ContractFactory(
    mergedAbi,
    PluginRepoFactoryArtifact.bytecode,
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
  let pluginRepoRegistry: PluginRepoRegistry;

  const PluginRepoRegistry = await ethers.getContractFactory(
    'PluginRepoRegistry'
  );

  pluginRepoRegistry = (await deployWithProxy(
    PluginRepoRegistry
  )) as PluginRepoRegistry;

  await pluginRepoRegistry.initialize(
    managingDao.address,
    ensSubdomainRegistrar.address
  );

  return pluginRepoRegistry;
}
