import {DAO__factory} from '../../../typechain';
import {checkPermission, delay, getContractAddress} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying permissions');

  const {ethers} = hre;

  const [deployer] = await ethers.getSigners();

  // Get `ManagementDAOProxy` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get `ManagementDAOProxy` contract.
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    deployer
  );

  // On some chains - such as holesky - wait so
  // previous permission txs are fully applied and verified.
  await delay(5000);

  // Get `DAORegistryProxy` address.
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);

  // Get `PluginRepoRegistryProxy` address.
  const pluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistryProxy',
    hre
  );

  // Get DAO's `DAOENSSubdomainRegistrarProxy` address.
  const daoEnsSubdomainRegistrarAddress = await getContractAddress(
    'DAOENSSubdomainRegistrarProxy',
    hre
  );

  // Get Plugin's `PluginENSSubdomainRegistrarProxy` address.
  const pluginEnsSubdomainRegistrarAddress = await getContractAddress(
    'PluginENSSubdomainRegistrarProxy',
    hre
  );

  // Get `DAOFactory` address.
  const daoFactoryAddress = await getContractAddress('DAOFactory', hre);

  // Get `PluginRepoFactory` address.
  const pluginRepoFactoryAddress = await getContractAddress(
    'PluginRepoFactory',
    hre
  );

  // ENS PERMISSIONS
  await checkPermission(managementDaoContract, {
    operation: Operation.Grant,
    where: {
      name: 'DAOENSSubdomainRegistrarProxy',
      address: daoEnsSubdomainRegistrarAddress,
    },
    who: {name: 'DAORegistryProxy', address: daoRegistryAddress},
    permission: 'REGISTER_ENS_SUBDOMAIN_PERMISSION',
  });

  await checkPermission(managementDaoContract, {
    operation: Operation.Grant,
    where: {
      name: 'PluginENSSubdomainRegistrarProxy',
      address: pluginEnsSubdomainRegistrarAddress,
    },
    who: {name: 'PluginRepoRegistryProxy', address: pluginRepoRegistryAddress},
    permission: 'REGISTER_ENS_SUBDOMAIN_PERMISSION',
  });

  // DAO REGISTRY PERMISSIONS
  await checkPermission(managementDaoContract, {
    operation: Operation.Grant,
    where: {name: 'DAORegistryProxy', address: daoRegistryAddress},
    who: {name: 'DAOFactory', address: daoFactoryAddress},
    permission: 'REGISTER_DAO_PERMISSION',
  });

  // PLUGIN REPO REGISTRY PERMISSIONS
  await checkPermission(managementDaoContract, {
    operation: Operation.Grant,
    where: {
      name: 'PluginRepoRegistryProxy',
      address: pluginRepoRegistryAddress,
    },
    who: {name: 'PluginRepoFactory', address: pluginRepoFactoryAddress},
    permission: 'REGISTER_PLUGIN_REPO_PERMISSION',
  });

  console.log('Permissions verified');
};
export default func;
func.tags = [
  'New',
  'ENS_Permissions',
  'DAO_Registry_Permissions',
  'Plugin_Registry_Permissions',
  'Batch-15',
];
