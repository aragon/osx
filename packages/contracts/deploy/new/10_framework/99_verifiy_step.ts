import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

import {checkSetManagingDao, getContractAddress} from '../../helpers';
import {
  DAOFactory__factory,
  DAORegistry__factory,
  ENSRegistry__factory,
  ENSSubdomainRegistrar__factory,
  PluginRepoFactory__factory,
  PluginRepoRegistry__factory,
  PluginSetupProcessor__factory,
} from '../../../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying framework deployment.');

  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // VERIFYING DAO ENS SUBDOMAIN REGISTRAR
  const DAOENSSubdomainRegistrarAddress = await getContractAddress(
    'DAO_ENSSubdomainRegistrar',
    hre
  );
  const DAOENSSubdomainRegistrar = ENSSubdomainRegistrar__factory.connect(
    DAOENSSubdomainRegistrarAddress,
    deployer
  );
  await checkSetManagingDao(DAOENSSubdomainRegistrar, managingDAOAddress);
  // scope to reuse same const again
  {
    const ensAddr = await DAOENSSubdomainRegistrar.ens();
    const ensRegistryContract = ENSRegistry__factory.connect(ensAddr, deployer);
    const isApprovedForAll = await ensRegistryContract.isApprovedForAll(
      managingDAOAddress,
      DAOENSSubdomainRegistrarAddress
    );
    if (!isApprovedForAll) {
      throw new Error(
        `DAOENSSubdomainRegistrar isn't approved for all. Expected ${managingDAOAddress} to have ${DAOENSSubdomainRegistrarAddress} approved for all`
      );
    }

    const node = await DAOENSSubdomainRegistrar.node();
    const expectedNode = ethers.utils.namehash(
      process.env[`${hre.network.name.toUpperCase()}_DAO_ENS_DOMAIN`] || ''
    );
    if (node !== expectedNode) {
      throw new Error(
        `DAOENSSubdomainRegistrar node (${node}) doesn't match expected node (${expectedNode})`
      );
    }
  }

  // VERIFYING PLUGIN ENS SUBDOMAIN REGISTRAR
  const PluginENSSubdomainRegistrarAddress = await getContractAddress(
    'Plugin_ENSSubdomainRegistrar',
    hre
  );
  const PluginENSSubdomainRegistrar = ENSSubdomainRegistrar__factory.connect(
    PluginENSSubdomainRegistrarAddress,
    deployer
  );
  await checkSetManagingDao(PluginENSSubdomainRegistrar, managingDAOAddress);
  // scope to reuse same const again
  {
    const ensAddr = await PluginENSSubdomainRegistrar.ens();
    const ensRegistryContract = ENSRegistry__factory.connect(ensAddr, deployer);
    const isApprovedForAll = await ensRegistryContract.isApprovedForAll(
      managingDAOAddress,
      PluginENSSubdomainRegistrarAddress
    );
    if (!isApprovedForAll) {
      throw new Error(
        `PluginENSSubdomainRegistrar isn't approved for all. Expected ${managingDAOAddress} to have ${PluginENSSubdomainRegistrarAddress} approved for all`
      );
    }

    const node = await PluginENSSubdomainRegistrar.node();
    const expectedNode = ethers.utils.namehash(
      process.env[`${hre.network.name.toUpperCase()}_PLUGIN_ENS_DOMAIN`] || ''
    );
    if (node !== expectedNode) {
      throw new Error(
        `PluginENSSubdomainRegistrar node (${node}) doesn't match expected node (${expectedNode})`
      );
    }
  }

  // VERIFYING DAO REGISTRY
  const DAORegistryAddress = await getContractAddress('DAORegistry', hre);
  const DAORegistry = DAORegistry__factory.connect(
    DAORegistryAddress,
    deployer
  );
  await checkSetManagingDao(DAORegistry, managingDAOAddress);
  // scope to reuse same const again
  {
    const SubdomainRegistrarAddress = await DAORegistry.subdomainRegistrar();
    if (SubdomainRegistrarAddress !== DAOENSSubdomainRegistrarAddress) {
      throw new Error(
        `${DAORegistry} has wrong SubdomainRegistrarAddress set. Expected ${DAOENSSubdomainRegistrarAddress} to be ${SubdomainRegistrarAddress}`
      );
    }
  }

  // VERIFYING PLUGIN REPO REGISTRY
  const PluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistry',
    hre
  );
  const PluginRepoRegistry = PluginRepoRegistry__factory.connect(
    PluginRepoRegistryAddress,
    deployer
  );
  await checkSetManagingDao(PluginRepoRegistry, managingDAOAddress);
  // scope to reuse same const again
  {
    const SubdomainRegistrarAddress =
      await PluginRepoRegistry.subdomainRegistrar();
    if (SubdomainRegistrarAddress !== PluginENSSubdomainRegistrarAddress) {
      throw new Error(
        `${PluginRepoRegistry} has wrong SubdomainRegistrarAddress set. Expected ${PluginENSSubdomainRegistrarAddress} to be ${SubdomainRegistrarAddress}`
      );
    }
  }

  // VERIFYING PLUGIN REPO FACTORY
  const PluginRepoFactoryAddress = await getContractAddress(
    'PluginRepoFactory',
    hre
  );
  const PluginRepoFactory = PluginRepoFactory__factory.connect(
    PluginRepoFactoryAddress,
    deployer
  );
  // scope to reuse same const again
  {
    const SetPluginRepoRegistryAddress =
      await PluginRepoFactory.pluginRepoRegistry();
    if (SetPluginRepoRegistryAddress !== PluginRepoRegistryAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong PluginRepoRegistry set. Expected ${SetPluginRepoRegistryAddress} to be ${PluginRepoRegistryAddress}`
      );
    }
  }

  // VERIFYING PSP
  const PluginSetupProcessorAddress = await getContractAddress(
    'PluginSetupProcessor',
    hre
  );
  const PluginSetupProcessor = PluginSetupProcessor__factory.connect(
    PluginSetupProcessorAddress,
    deployer
  );
  // scope to reuse same const again
  {
    const SetPluginRepoRegistryAddress =
      await PluginSetupProcessor.repoRegistry();
    if (SetPluginRepoRegistryAddress !== PluginRepoRegistryAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong PluginRepoRegistry set. Expected ${SetPluginRepoRegistryAddress} to be ${PluginRepoRegistryAddress}`
      );
    }
  }

  // VERIFYING DAO FACTORY
  const DAOFactoryAddress = await getContractAddress('DAOFactory', hre);
  const DAOFactory = DAOFactory__factory.connect(DAOFactoryAddress, deployer);
  // scope to reuse same const again
  {
    const SetDAORegistryAddress = await DAOFactory.daoRegistry();
    if (SetDAORegistryAddress !== DAORegistryAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong DAORegistry set. Expected ${SetDAORegistryAddress} to be ${DAORegistryAddress}`
      );
    }
  }
  // scope to reuse same const again
  {
    const SetPSP = await DAOFactory.pluginSetupProcessor();
    if (SetPSP !== PluginSetupProcessorAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong PluginSetupProcessor set. Expected ${SetPSP} to be ${PluginSetupProcessorAddress}`
      );
    }
  }

  console.log('Framework deployment verified');
};
export default func;
func.tags = [
  'New',
  'ENSSubdomainRegistrar',
  'DAORegistry',
  'PluginRepoRegistry',
  'PluginRepoFactory',
  'PluginSetupProcessor',
  'DAOFactory',
];
