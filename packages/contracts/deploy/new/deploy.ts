import daoArtifactJson from '../../artifacts/src/core/dao/DAO.sol/DAO.json';
import pluginRepoFactoryArtifactJson from '../../artifacts/src/framework/plugin/repo/PluginRepoFactory.sol/PluginRepoFactory.json';
import daoFactoryArtifactJson from '../../artifacts/src/framework/plugin/repo/PluginRepoFactory.sol/PluginRepoFactory.json';
import pspArtifactsJson from '../../artifacts/src/framework/plugin/setup/PluginSetupProcessor.sol/PluginSetupProcessor.json';
import {
  DeployFrameworkFactory__factory,
  ENSRegistry__factory,
} from '../../typechain';
import {setupENS} from '../../utils/ens';
import {
  daoDomainEnv,
  managementDaoSubdomainEnv,
  pluginDomainEnv,
} from '../../utils/environment';
import {
  DAO_PERMISSIONS,
  ENS_ADDRESSES,
  getENSAddress,
  getPublicResolverAddress,
  registerAndTransferDomain,
  registerSubnodeRecord,
} from '../helpers';
import MANAGEMENT_DAO_METADATA from '../management-dao-metadata.json';
import {uploadToPinata} from '@aragon/osx-commons-sdk';
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

  // String representations of domains. i.e `dao.eth`, `plugin.dao.eth` and `managementdao`
  const daoDomain = daoDomainEnv(network);
  const pluginDomain = pluginDomainEnv(network);
  const daoSubdomain = managementDaoSubdomainEnv(network);

  // Hash representations of domains.
  const daoNode = ethers.utils.namehash(daoDomain);
  const pluginNode = ethers.utils.namehash(pluginDomain);

  const officialEnsRegistryAddress = ENS_ADDRESSES[network.name];

  // If ens registry address not found:
  // 1. It deploys ENSRegistry and ENSResolver contracts
  // 2. makes the deployer the owner of all subdomains.
  //    e.x: if the daoDomain is `test1.test2.eth`, deployer will become the owner of:
  //    ```, `.eth`, `test2.eth` and `test1.eth`
  //    This is crucial as in order to become an owner of `test1.test2.eth`,
  //    you first need to become `test2.eth` owner and so on.
  //    same `applies for `pluginDomain`.
  if (!officialEnsRegistryAddress) {
    await setupENS([daoDomain, pluginDomain], hre);
  }

  const ensAddr = await getENSAddress(hre);
  const resolverAddr = await getPublicResolverAddress(hre);
  const ens = ENSRegistry__factory.connect(ensAddr, deployer);

  // In case official ens registry address was found, deployer must own both domains.
  if (
    (await ens.owner(daoNode)).toLowerCase() !=
      deployer.address.toLowerCase() ||
    (await ens.owner(pluginNode)).toLowerCase() !=
      deployer.address.toLowerCase()
  ) {
    throw new Error(
      `domains are not owned by deployer: ${deployer.address}  
            Maybe the domains are owned by ENS wrapper and if so, unwrap it from the ENS app.`
    );
  }

  const result = await deploy('DeployFrameworkFactory', {
    from: deployer.address,
    args: [ensAddr, resolverAddr, daoNode, pluginNode],
    log: true,
  });

  // Transfer the parent domains to the `DeployFrameworkFactory` so that it
  // can allow(`see setApprovalForAll`) `ensRegistrar` to set managing dao's subdomain
  // under the parent domain.
  await ens.setOwner(daoNode, result.address);
  await ens.setOwner(pluginNode, result.address);

  const factory = DeployFrameworkFactory__factory.connect(
    result.address,
    deployer
  );

  const bytecodes = {
    daoFactory: daoFactoryArtifactJson.bytecode,
    pluginRepoFactory: pluginRepoFactoryArtifactJson.bytecode,
    psp: pspArtifactsJson.bytecode,
  };

  const metadataCIDPath = await uploadToPinata(
    JSON.stringify('good', null, 2),
    'management-dao-metadata'
  );

  console.log('Uploaded metadata to pinata with cid:', metadataCIDPath);

  const initializeParams = {
    metadata: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(metadataCIDPath)),
    trustedForwarder: ethers.constants.AddressZero,
    daoURI: '0x',
  };

  // Note if this failed, you will need to call `transferDomainsBack` to get domains again
  // and then recall the deploy script again.
  await factory.deployFramework(
    initializeParams,
    daoSubdomain,
    DAO_PERMISSIONS.map(ss => ethers.utils.id(ss)),
    // @ts-ignore
    bytecodes
  );

  // TODO: check that deployer owns daoDomain and pluginDomain, if not abort.
};
export default func;
func.tags = ['DeployFramework'];
func.dependencies = ['Env'];
