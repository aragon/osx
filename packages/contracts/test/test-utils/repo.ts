import {
  PluginRepoRegistry,
  PluginRepoFactory,
  PluginRepo,
  PluginUUPSUpgradeableSetupV1Mock,
  PluginRepo__factory,
  PluginUUPSUpgradeableSetupV1Mock__factory,
  PluginRepoRegistry__factory,
  PluginRepoFactory__factory,
} from '../../typechain';
import {ARTIFACT_SOURCES} from './wrapper';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import hre from 'hardhat';

export async function deployMockPluginSetup(
  signer: SignerWithAddress
): Promise<PluginUUPSUpgradeableSetupV1Mock> {
  const implV1 = await hre.wrapper.deploy('PluginUUPSUpgradeableV1Mock');

  const pluginSetupMockContract = await hre.wrapper.deploy(
    'PluginUUPSUpgradeableSetupV1Mock',
    {args: [implV1.address]}
  );

  return pluginSetupMockContract;
}

export async function deployNewPluginRepo(
  maintainer: SignerWithAddress
): Promise<PluginRepo> {
  const newPluginRepo = await hre.wrapper.deploy(ARTIFACT_SOURCES.PLUGIN_REPO, {
    withProxy: true,
  });
  await newPluginRepo.initialize(maintainer.address);

  return newPluginRepo;
}

export async function deployPluginRepoFactory(
  signers: any,
  pluginRepoRegistry: PluginRepoRegistry
): Promise<PluginRepoFactory> {
  // PluginRepoFactory
  const pluginRepoFactory = await hre.wrapper.deploy('PluginRepoFactory', {
    args: [pluginRepoRegistry.address],
  });

  return pluginRepoFactory;
}

export async function deployPluginRepoRegistry(
  managingDao: any,
  ensSubdomainRegistrar: any,
  signer: SignerWithAddress
): Promise<PluginRepoRegistry> {
  let pluginRepoRegistry = await hre.wrapper.deploy(
    ARTIFACT_SOURCES.PLUGIN_REPO_REGISTRY,
    {withProxy: true}
  );

  await pluginRepoRegistry.initialize(
    managingDao.address,
    ensSubdomainRegistrar.address
  );

  return pluginRepoRegistry;
}
