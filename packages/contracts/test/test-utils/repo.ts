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
import {deployWithProxy} from '../test-utils/proxy';
import {PluginUUPSUpgradeableV1Mock__factory} from '@aragon/osx-ethers-v1.2.0';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

export async function deployMockPluginSetup(
  signer: SignerWithAddress
): Promise<PluginUUPSUpgradeableSetupV1Mock> {
  const implV1 = await new PluginUUPSUpgradeableV1Mock__factory(
    signer
  ).deploy();
  const pluginSetupMockContract =
    await new PluginUUPSUpgradeableSetupV1Mock__factory(signer).deploy(
      implV1.address
    );

  return pluginSetupMockContract;
}

export async function deployNewPluginRepo(
  maintainer: SignerWithAddress
): Promise<PluginRepo> {
  const PluginRepo = new PluginRepo__factory(maintainer);
  const newPluginRepo = await deployWithProxy<PluginRepo>(PluginRepo);
  await newPluginRepo.initialize(maintainer.address);

  return newPluginRepo;
}

export async function deployPluginRepoFactory(
  signers: any,
  pluginRepoRegistry: PluginRepoRegistry
): Promise<PluginRepoFactory> {
  // PluginRepoFactory
  const PluginRepoFactory = new PluginRepoFactory__factory(signers[0]);

  const pluginRepoFactory = await PluginRepoFactory.deploy(
    pluginRepoRegistry.address
  );

  return pluginRepoFactory;
}

export async function deployPluginRepoRegistry(
  managingDao: any,
  ensSubdomainRegistrar: any,
  signer: SignerWithAddress
): Promise<PluginRepoRegistry> {
  const PluginRepoRegistry = new PluginRepoRegistry__factory(signer);

  let pluginRepoRegistry = await deployWithProxy<PluginRepoRegistry>(
    PluginRepoRegistry
  );

  await pluginRepoRegistry.initialize(
    managingDao.address,
    ensSubdomainRegistrar.address
  );

  return pluginRepoRegistry;
}
