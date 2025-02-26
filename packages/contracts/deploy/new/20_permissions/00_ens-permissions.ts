import {DAO__factory} from '../../../typechain';
import {getContractAddress, managePermissions} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nSetting framework permission.`);

  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get `managementDAO` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get `DAO` contract.
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    deployer
  );

  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);

  // Get `PluginRepoRegistry` address.
  const pluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistryProxy',
    hre
  );

  // Get DAO's `ENSSubdomainRegistrar` address.
  const daoEnsSubdomainRegistrarAddress = await getContractAddress(
    'DAOENSSubdomainRegistrarProxy',
    hre
  );

  // Get Plugin's `ENSSubdomainRegistrar` address.
  const pluginEnsSubdomainRegistrarAddress = await getContractAddress(
    'PluginENSSubdomainRegistrarProxy',
    hre
  );

  // Grant `REGISTER_ENS_SUBDOMAIN_PERMISSION` of `DAOENSSubdomainRegistrarProxy` to `DAORegistry`.
  // Grant `REGISTER_ENS_SUBDOMAIN_PERMISSION` of `PluginENSSubdomainRegistrarProxy` to `PluginRepoRegistry`.
  // Grant `UPGRADE_REGISTRAR_PERMISSION` of `DAOENSSubdomainRegistrarProxy` to `ManagementDAO`.
  // Grant `UPGRADE_REGISTRAR_PERMISSION` of `PluginENSSubdomainRegistrarProxy` to `ManagementDAO`.
  const grantPermissions = [
    {
      operation: Operation.Grant,
      where: {
        name: 'DAOENSSubdomainRegistrarProxy',
        address: daoEnsSubdomainRegistrarAddress,
      },
      who: {name: 'DAORegistry', address: daoRegistryAddress},
      permission: 'REGISTER_ENS_SUBDOMAIN_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'PluginENSSubdomainRegistrarProxy',
        address: pluginEnsSubdomainRegistrarAddress,
      },
      who: {name: 'PluginRepoRegistry', address: pluginRepoRegistryAddress},
      permission: 'REGISTER_ENS_SUBDOMAIN_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'DAOENSSubdomainRegistrarProxy',
        address: daoEnsSubdomainRegistrarAddress,
      },
      who: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      permission: 'UPGRADE_REGISTRAR_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'PluginENSSubdomainRegistrarProxy',
        address: pluginEnsSubdomainRegistrarAddress,
      },
      who: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      permission: 'UPGRADE_REGISTRAR_PERMISSION',
    },
  ];
  await managePermissions(managementDaoContract, grantPermissions);
};
export default func;
func.tags = ['New', 'ENS_Permissions'];
