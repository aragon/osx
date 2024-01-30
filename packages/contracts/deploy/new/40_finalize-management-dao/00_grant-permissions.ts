import {DAO__factory, PluginRepo__factory} from '../../../typechain';
import {getContractAddress, managePermissions, Permission} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nFinalizing ManagementDao.`);

  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get `DAORegistryProxy` address.
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);

  // Get `PluginSetupProcessor` address.
  const pspAddress = await getContractAddress('PluginSetupProcessor', hre);

  // Get `ManagementDAOProxy` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get `DAO` contract.
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    deployer
  );

  // Grant `REGISTER_DAO_PERMISSION` to `Deployer`.
  // Grant `ROOT_PERMISSION` to `PluginSetupProcessor`.
  // Grant `APPLY_INSTALLATION_PERMISSION` to `Deployer`.

  const grantPermissions = [
    {
      operation: Operation.Grant,
      where: {name: 'DAORegistryProxy', address: daoRegistryAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'REGISTER_DAO_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'PluginSetupProcessor', address: pspAddress},
      permission: 'ROOT_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'PluginSetupProcessor', address: pspAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'APPLY_INSTALLATION_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'SET_METADATA_PERMISSION',
    },
  ];

  await managePermissions(managementDaoContract, grantPermissions);

  // Grant `ROOT_PERMISSION`, `MAINTAINER_PERMISSION` and `UPGRADE_REPO_PERMISSION` to `managementDao` on the permission manager of each PluginRepo.
  for (const repoName in hre.aragonPluginRepos) {
    const repoAddress = hre.aragonPluginRepos[repoName];
    const grantPluginRepoPermissions: Permission[] = [];
    grantPluginRepoPermissions.push({
      operation: Operation.Grant,
      where: {
        name: repoName,
        address: repoAddress,
      },
      who: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      permission: 'ROOT_PERMISSION',
    });

    grantPluginRepoPermissions.push({
      operation: Operation.Grant,
      where: {
        name: repoName,
        address: repoAddress,
      },
      who: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      permission: 'MAINTAINER_PERMISSION',
    });

    grantPluginRepoPermissions.push({
      operation: Operation.Grant,
      where: {
        name: repoName,
        address: repoAddress,
      },
      who: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      permission: 'UPGRADE_REPO_PERMISSION',
    });
    await managePermissions(
      PluginRepo__factory.connect(repoAddress, deployer),
      grantPluginRepoPermissions
    );
  }
};
export default func;
func.tags = ['New', 'RegisterManagementDAO'];
