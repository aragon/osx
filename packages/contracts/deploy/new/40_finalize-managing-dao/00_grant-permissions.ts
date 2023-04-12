import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {Operation} from '../../../utils/types';
import {getContractAddress, managePermissions, Permission} from '../../helpers';
import {PluginRepo__factory} from '../../../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nFinalizing ManagingDao.`);

  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

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

  // Grant `REGISTER_DAO_PERMISSION` to `Deployer`.
  // Grant `ROOT_PERMISSION` to `PluginSetupProcessor`.
  // Grant `APPLY_INSTALLATION_PERMISSION` to `Deployer`.

  const grantPermissions = [
    {
      operation: Operation.Grant,
      where: {name: 'DAORegistry', address: daoRegistryAddress},
      who: {name: 'Deployer', address: deployer.address},
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
      who: {name: 'Deployer', address: deployer.address},
      permission: 'APPLY_INSTALLATION_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'DAO', address: managingDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'SET_METADATA_PERMISSION',
    },
  ];

  await managePermissions(managingDaoContract, grantPermissions);

  // Grant `ROOT_PERMISSION`, `MAINTAINER_PERMISSION` and `UPGRADE_REPO_PERMISSION` to `managingDao` on the permission manager of each PluginRepo.
  for (const repoName in hre.aragonPluginRepos) {
    const repoAddress = hre.aragonPluginRepos[repoName];
    const grantPluginRepoPermissions: Permission[] = [];
    grantPluginRepoPermissions.push({
      operation: Operation.Grant,
      where: {
        name: repoName + ' PluginRepo',
        address: repoAddress,
      },
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'ROOT_PERMISSION',
    });

    grantPluginRepoPermissions.push({
      operation: Operation.Grant,
      where: {
        name: repoName + ' PluginRepo',
        address: repoAddress,
      },
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'MAINTAINER_PERMISSION',
    });

    grantPluginRepoPermissions.push({
      operation: Operation.Grant,
      where: {
        name: repoName + ' PluginRepo',
        address: repoAddress,
      },
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'UPGRADE_REPO_PERMISSION',
    });
    await managePermissions(
      PluginRepo__factory.connect(repoAddress, deployer),
      grantPluginRepoPermissions
    );
  }
};
export default func;
func.tags = ['RegisterManagingDAO'];
