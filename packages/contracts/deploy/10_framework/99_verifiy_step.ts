import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

import {checkSetManagingDao, getContractAddress} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying framework deployment.');

  const {getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // VERIFYING DAO ENS SUBDOMAIN REGISTRAR
  const DAOENSSubdomainRegistrarAddress = await getContractAddress(
    'DAO_ENSSubdomainRegistrar',
    hre
  );
  const DAOENSSubdomainRegistrar = await ethers.getContractAt(
    'ENSSubdomainRegistrar',
    DAOENSSubdomainRegistrarAddress
  );
  await checkSetManagingDao(DAOENSSubdomainRegistrar, managingDAOAddress);
  // scope to reuse same const again
  {
    const ensAddr = await DAOENSSubdomainRegistrar.ens();
    const ensRegistryContract = await ethers.getContractAt(
      'ENSRegistry',
      ensAddr
    );
    const isApprovedForAll =
      await ensRegistryContract.callStatic.isApprovedForAll(
        deployer,
        DAOENSSubdomainRegistrarAddress
      );
    if (!isApprovedForAll) {
      throw new Error(
        `DAOENSSubdomainRegistrar isn't approved for all. Expected ${deployer} to have ${DAOENSSubdomainRegistrarAddress} approved for all`
      );
    }
  }

  // VERIFYING PLUGIN ENS SUBDOMAIN REGISTRAR
  const PluginENSSubdomainRegistrarAddress = await getContractAddress(
    'Plugin_ENSSubdomainRegistrar',
    hre
  );
  const PluginENSSubdomainRegistrar = await ethers.getContractAt(
    'ENSSubdomainRegistrar',
    PluginENSSubdomainRegistrarAddress
  );
  await checkSetManagingDao(PluginENSSubdomainRegistrar, managingDAOAddress);
  // scope to reuse same const again
  {
    const ensAddr = await PluginENSSubdomainRegistrar.ens();
    const ensRegistryContract = await ethers.getContractAt(
      'ENSRegistry',
      ensAddr
    );
    const isApprovedForAll =
      await ensRegistryContract.callStatic.isApprovedForAll(
        deployer,
        PluginENSSubdomainRegistrarAddress
      );
    if (!isApprovedForAll) {
      throw new Error(
        `PluginENSSubdomainRegistrar isn't approved for all. Expected ${deployer} to have ${PluginENSSubdomainRegistrarAddress} approved for all`
      );
    }
  }

  // VERIFYING DAO REGISTRY
  const DAORegistryAddress = await getContractAddress('DAORegistry', hre);
  const DAORegistry = await ethers.getContractAt(
    'DAORegistry',
    DAORegistryAddress
  );
  await checkSetManagingDao(DAORegistry, managingDAOAddress);
  // scope to reuse same const again
  {
    const SubdomainRegistrarAddress =
      await DAORegistry.callStatic.subdomainRegistrar();
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
  const PluginRepoRegistry = await ethers.getContractAt(
    'PluginRepoRegistry',
    PluginRepoRegistryAddress
  );
  await checkSetManagingDao(PluginRepoRegistry, managingDAOAddress);
  // scope to reuse same const again
  {
    const SubdomainRegistrarAddress =
      await PluginRepoRegistry.callStatic.subdomainRegistrar();
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
  const PluginRepoFactory = await ethers.getContractAt(
    'PluginRepoFactory',
    PluginRepoFactoryAddress
  );
  // scope to reuse same const again
  {
    const SetPluginRepoRegistryAddress =
      await PluginRepoFactory.callStatic.pluginRepoRegistry();
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
  const PluginSetupProcessor = await ethers.getContractAt(
    'PluginSetupProcessor',
    PluginSetupProcessorAddress
  );
  await checkSetManagingDao(PluginSetupProcessor, managingDAOAddress);
  // scope to reuse same const again
  {
    const SetPluginRepoRegistryAddress =
      await PluginSetupProcessor.callStatic.repoRegistry();
    if (SetPluginRepoRegistryAddress !== PluginRepoRegistryAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong PluginRepoRegistry set. Expected ${SetPluginRepoRegistryAddress} to be ${PluginRepoRegistryAddress}`
      );
    }
  }

  // VERIFYING DAO FACTORY
  const DAOFactoryAddress = await getContractAddress('DAOFactory', hre);
  const DAOFactory = await ethers.getContractAt(
    'DAOFactory',
    DAOFactoryAddress
  );
  // scope to reuse same const again
  {
    const SetDAORegistryAddress = await DAOFactory.callStatic.daoRegistry();
    if (SetDAORegistryAddress !== DAORegistryAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong DAORegistry set. Expected ${SetDAORegistryAddress} to be ${DAORegistryAddress}`
      );
    }
  }
  // scope to reuse same const again
  {
    const SetPSP = await DAOFactory.callStatic.pluginSetupProcessor();
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
  'ENSSubdomainRegistrar',
  'DAORegistry',
  'PluginRepoRegistry',
  'PluginRepoFactory',
  'PluginSetupProcessor',
  'DAOFactory',
];
