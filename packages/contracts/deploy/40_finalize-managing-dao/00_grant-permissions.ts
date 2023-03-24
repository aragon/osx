import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {EHRE, Operation} from '../../utils/types';
import {getContractAddress, managePermissions} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nFinalizing ManagingDao.`);

  const {getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();

  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);

  // Get `PluginSetupProcessor` address.
  const pspAddress = await getContractAddress('PluginSetupProcessor', hre);

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAO` contract.
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );

  const ehre = hre as EHRE;

  // Grant `REGISTER_DAO_PERMISSION` to `Deployer`.
  // Grant `ROOT_PERMISSION` to `PluginSetupProcessor`.
  // Grant `APPLY_INSTALLATION_PERMISSION` to `Deployer`.
  // Grant `MAINTAINER_PERMISSION` and `UPGRADE_REPO_PERMISSION` to `mMnagingDao`.
  const grantPermissions = [
    {
      operation: Operation.Grant,
      where: {name: 'DAORegistry', address: daoRegistryAddress},
      who: {name: 'Deployer', address: deployer},
      permission: 'REGISTER_DAO_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'DAO', address: managingDAOAddress},
      who: {name: 'PluginSetupProcessor', address: pspAddress},
      permission: 'ROOT_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'PluginSetupProcessor', address: pspAddress},
      who: {name: 'Deployer', address: deployer},
      permission: 'APPLY_INSTALLATION_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'DAO', address: managingDAOAddress},
      who: {name: 'Deployer', address: deployer},
      permission: 'SET_METADATA_PERMISSION',
    },
    // Plugin Repos
    {
      operation: Operation.Grant,
      where: {
        name: 'address-list-voting PluginRepo',
        address: ehre.aragonPluginRepos['address-list-voting'],
      },
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'MAINTAINER_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'address-list-voting PluginRepo',
        address: ehre.aragonPluginRepos['address-list-voting'],
      },
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'UPGRADE_REPO_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'token-voting PluginRepo',
        address: ehre.aragonPluginRepos['token-voting'],
      },
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'MAINTAINER_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'token-voting PluginRepo',
        address: ehre.aragonPluginRepos['token-voting'],
      },
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'UPGRADE_REPO_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'admin PluginRepo',
        address: ehre.aragonPluginRepos['admin'],
      },
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'MAINTAINER_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'admin PluginRepo',
        address: ehre.aragonPluginRepos['admin'],
      },
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'UPGRADE_REPO_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'multisig PluginRepo',
        address: ehre.aragonPluginRepos['multisig'],
      },
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'MAINTAINER_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'multisig PluginRepo',
        address: ehre.aragonPluginRepos['multisig'],
      },
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'UPGRADE_REPO_PERMISSION',
    },
  ];
  await managePermissions(managingDaoContract, grantPermissions);
};
export default func;
func.tags = ['RegisterManagingDAO'];
