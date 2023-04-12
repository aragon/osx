import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {Operation} from '../../../utils/types';
import {getContractAddress, managePermissions} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nSetting framework permission.`);

  const {ethers} = hre;

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAO` contract.
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );

  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);

  // Get `PluginRepoRegistry` address.
  const pluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistry',
    hre
  );

  // Get DAO's `ENSSubdomainRegistrar` address.
  const daoEnsSubdomainRegistrarAddress = await getContractAddress(
    'DAO_ENSSubdomainRegistrar',
    hre
  );

  // Get Plugin's `ENSSubdomainRegistrar` address.
  const pluginEnsSubdomainRegistrarAddress = await getContractAddress(
    'Plugin_ENSSubdomainRegistrar',
    hre
  );

  // Grant `REGISTER_ENS_SUBDOMAIN_PERMISSION` of `DAO_ENSSubdomainRegistrar` to `DAORegistry`.
  // Grant `REGISTER_ENS_SUBDOMAIN_PERMISSION` of `Plugin_ENSSubdomainRegistrar` to `PluginRepoRegistry`.
  // Grant `UPGRADE_REGISTRAR_PERMISSION` of `DAO_ENSSubdomainRegistrar` to `ManagingDAO`.
  // Grant `UPGRADE_REGISTRAR_PERMISSION` of `Plugin_ENSSubdomainRegistrar` to `ManagingDAO`.
  const grantPermissions = [
    {
      operation: Operation.Grant,
      where: {
        name: 'DAO_ENSSubdomainRegistrar',
        address: daoEnsSubdomainRegistrarAddress,
      },
      who: {name: 'DAORegistry', address: daoRegistryAddress},
      permission: 'REGISTER_ENS_SUBDOMAIN_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'Plugin_ENSSubdomainRegistrar',
        address: pluginEnsSubdomainRegistrarAddress,
      },
      who: {name: 'PluginRepoRegistry', address: pluginRepoRegistryAddress},
      permission: 'REGISTER_ENS_SUBDOMAIN_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'DAO_ENSSubdomainRegistrar',
        address: daoEnsSubdomainRegistrarAddress,
      },
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'UPGRADE_REGISTRAR_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'Plugin_ENSSubdomainRegistrar',
        address: pluginEnsSubdomainRegistrarAddress,
      },
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'UPGRADE_REGISTRAR_PERMISSION',
    },
  ];
  await managePermissions(managingDaoContract, grantPermissions);
};
export default func;
func.tags = ['ENS_Permissions'];
