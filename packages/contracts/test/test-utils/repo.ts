import hre, {ethers} from 'hardhat';

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
import {deployWithProxy} from './proxy';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import { ARTIFACT_SOURCES } from './wrapper/Wrapper';

export async function deployMockPluginSetup(
  signer: SignerWithAddress
): Promise<PluginUUPSUpgradeableSetupV1Mock> {
  // TODO:GIORGI test commented
  // const PluginSetupMock = new PluginUUPSUpgradeableSetupV1Mock__factory(signer);
  // const pluginSetupMockContract = await PluginSetupMock.deploy();

  return await hre.wrapper.deploy('PluginUUPSUpgradeableSetupV1Mock')
}

export async function deployNewPluginRepo(
  maintainer: SignerWithAddress
): Promise<PluginRepo> {
  // TODO:GIORGI test commented
  // const PluginRepo = new PluginRepo__factory(maintainer);
  // const newPluginRepo = await deployWithProxy<PluginRepo>(PluginRepo);
  // TODO:GIORGI previously, maintainer was deploying it. maybe deploy function needs to receive that as well ?
  const newPluginRepo = await hre.wrapper.deploy(ARTIFACT_SOURCES.PLUGIN_REPO, {withProxy: true})

  await newPluginRepo.initialize(maintainer.address);

  return newPluginRepo;
}

export async function deployPluginRepoFactory(
  signers: any,
  pluginRepoRegistry: PluginRepoRegistry
): Promise<PluginRepoFactory> {
  // PluginRepoFactory
  // TODO:GIORGI test commented
  // const PluginRepoFactory = new PluginRepoFactory__factory(signers[0]);

  // const pluginRepoFactory = await PluginRepoFactory.deploy(
  //   pluginRepoRegistry.address
  // );

  const pluginRepoFactory = await hre.wrapper.deploy('PluginRepoFactory', {args: [pluginRepoRegistry.address]})

  return pluginRepoFactory;
}

export async function deployPluginRepoRegistry(
  managingDao: any,
  ensSubdomainRegistrar: any,
  signer: SignerWithAddress
): Promise<PluginRepoRegistry> {
  // TODO:GIORGI test commented
  // const PluginRepoRegistry = new PluginRepoRegistry__factory(signer);

  // let pluginRepoRegistry = await deployWithProxy<PluginRepoRegistry>(
  //   PluginRepoRegistry
  // );

  let pluginRepoRegistry = await hre.wrapper.deploy(ARTIFACT_SOURCES.PLUGIN_REPO_REGISTRY, {withProxy: true})

  await pluginRepoRegistry.initialize(
    managingDao.address,
    ensSubdomainRegistrar.address
  );

  return pluginRepoRegistry;
}
