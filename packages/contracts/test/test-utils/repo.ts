import {ethers} from 'hardhat';

import {
  PluginRepoRegistry,
  PluginRepoFactory,
  PluginSetupV1Mock,
} from '../../typechain';

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

export async function deployPluginRepoFactory(
  signers: any,
  managingDao: any,
  pluginRepoRegistry: PluginRepoRegistry
): Promise<any> {
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
