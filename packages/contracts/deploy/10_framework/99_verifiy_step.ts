import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

import {checkSetMangingDao, getContractAddress} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying framework deployment.');

  const {getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();

  // Get managing DAO address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // VERIFYING ENS SUBDOMAIN REGISTRARS
  const DAOENSSubdomainRegistrarAddress = await getContractAddress(
    'DAO_ENSSubdomainRegistrar',
    hre
  );
  const DAOENSSubdomainRegistrar = await ethers.getContractAt(
    'ENSSubdomainRegistrar',
    DAOENSSubdomainRegistrarAddress
  );
  await checkSetMangingDao(DAOENSSubdomainRegistrar, managingDAOAddress);

  const PluginENSSubdomainRegistrarAddress = await getContractAddress(
    'Plugin_ENSSubdomainRegistrar',
    hre
  );
  const PluginENSSubdomainRegistrar = await ethers.getContractAt(
    'ENSSubdomainRegistrar',
    PluginENSSubdomainRegistrarAddress
  );
  await checkSetMangingDao(PluginENSSubdomainRegistrar, managingDAOAddress);

  // VERIFYING DAO REGISTRY
  const DAORegistryAddress = await getContractAddress('DAORegistry', hre);
  const DAORegistry = await ethers.getContractAt(
    'DAORegistry',
    DAORegistryAddress
  );
  await checkSetMangingDao(DAORegistry, managingDAOAddress);

  // VERIFYING PLUGIN REPO REGISTRY
  const PluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistry',
    hre
  );
  const PluginRepoRegistry = await ethers.getContractAt(
    'PluginRepoRegistry',
    PluginRepoRegistryAddress
  );
  await checkSetMangingDao(PluginRepoRegistry, managingDAOAddress);

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
  await checkSetMangingDao(PluginSetupProcessor, managingDAOAddress);
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
