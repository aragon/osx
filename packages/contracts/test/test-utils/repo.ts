import {ethers} from 'hardhat';

import {
  AragonPluginRegistry,
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
  aragonPluginRegistry: AragonPluginRegistry
): Promise<any> {
  // @ts-ignore
  const AragonPluginRegistryArtifact = await hre.artifacts.readArtifact(
    'AragonPluginRegistry'
  );
  // @ts-ignore
  const PluginRepoFactoryArtifact = await hre.artifacts.readArtifact(
    'PluginRepoFactory'
  );

  const _merged = [
    ...PluginRepoFactoryArtifact.abi,
    ...AragonPluginRegistryArtifact.abi.filter((f: any) => f.type === 'event'),
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
    aragonPluginRegistry.address
  );

  // Grant `PLUGIN_REGISTER_PERMISSION` to `PluginRepoFactory`.
  await managingDao.grant(
    aragonPluginRegistry.address,
    pluginRepoFactory.address,
    ethers.utils.id('PLUGIN_REGISTER_PERMISSION')
  );

  return pluginRepoFactory;
}
