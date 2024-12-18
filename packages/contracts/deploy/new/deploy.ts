import daoArtifactJson from '../../artifacts/src/core/dao/DAO.sol/DAO.json';
import pluginRepoFactoryArtifactJson from '../../artifacts/src/framework/plugin/repo/PluginRepoFactory.sol/PluginRepoFactory.json';
import daoFactoryArtifactJson from '../../artifacts/src/framework/plugin/repo/PluginRepoFactory.sol/PluginRepoFactory.json';
import pspArtifactsJson from '../../artifacts/src/framework/plugin/setup/PluginSetupProcessor.sol/PluginSetupProcessor.json';
import {DeployFrameworkFactory__factory} from '../../typechain';
import {setupENS} from '../../utils/ens';
import {daoDomainEnv, pluginDomainEnv} from '../../utils/environment';
import {
  DAO_PERMISSIONS,
  ENS_ADDRESSES,
  getENSAddress,
  getPublicResolverAddress,
} from '../helpers';
import {ArtifactData, DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

/** NOTE:
 * Create a (Management DAO) with no Plugin, to be the owner DAO for the framework, temporarily.
 */

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nDeploying Framework .`);

  const {deployments, ethers, network} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const daoDomain = daoDomainEnv(network);
  const pluginDomain = pluginDomainEnv(network);

  const officialEnsRegistryAddress = ENS_ADDRESSES[network.name];

  // If ens registry address not found:
  //    1. It deploys ENSRegistry and ENSResolver contracts
  //    2. makes the deployer the owner of all subdomains except the most parent one:
  //        e.x: if the daoDomain is `test1.test2.eth`, deployer will be the owner of `.eth` and `test2.eth`.
  //             same applies for `pluginDomain`.
  if (!officialEnsRegistryAddress) {
    await setupENS([daoDomain, pluginDomain], hre);
  }

  const result = await deploy('DeployFrameworkFactory', {
    from: deployer.address,
    args: [await getENSAddress(hre), await getPublicResolverAddress(hre)],
    log: true,
  });

  const factory = DeployFrameworkFactory__factory.connect(
    result.address,
    deployer
  );

  const initializeParams = {
    metadata: '0x',
    trustedForwarder: ethers.constants.AddressZero,
    daoURI: '0x',
  };

  const bytecodes = {
    daoFactory: daoFactoryArtifactJson.bytecode,
    pluginRepoFactory: pluginRepoFactoryArtifactJson.bytecode,
    psp: pspArtifactsJson.bytecode,
  };

  console.log(bytecodes);

  await factory.deployFramework(
    initializeParams,
    ethers.utils.namehash(daoDomain),
    ethers.utils.namehash(pluginDomain),
    DAO_PERMISSIONS.map(ss => ethers.utils.id(ss)),
    // @ts-ignore
    bytecodes
  );

  // TODO: check that deployer owns daoDomain and pluginDomain, if not abort.
};
export default func;
func.tags = ['DeployFramework'];
// func.dependencies = ['Env'];
