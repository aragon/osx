import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress, managePermissions, Permission} from '../../helpers';
import {Operation} from '../../../utils/types';
import {PluginRepo__factory} from '../../../typechain';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get info from .env
  const daoSubdomain = process.env.MANAGINGDAO_SUBDOMAIN || '';

  if (!daoSubdomain)
    throw new Error('ManagingDAO subdomain has not been set in .env');

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

  // Revoke `REGISTER_DAO_PERMISSION` from `Deployer`.
  // Revoke `ROOT_PERMISSION` from `PluginSetupProcessor`.
  // Revoke `APPLY_INSTALLATION_PERMISSION` from `Deployer`.
  // Revoke `ROOT_PERMISSION` from `Deployer`.
  const revokePermissions = [
    {
      operation: Operation.Revoke,
      where: {name: 'DAORegistry', address: daoRegistryAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'REGISTER_DAO_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'DAO', address: managingDAOAddress},
      who: {name: 'PluginSetupProcessor', address: pspAddress},
      permission: 'ROOT_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'PluginSetupProcessor', address: pspAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'APPLY_INSTALLATION_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'managingDAO', address: managingDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'ROOT_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'DAO', address: managingDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'SET_METADATA_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'DAO', address: managingDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'EXECUTE_PERMISSION',
    },
  ];
  await managePermissions(managingDaoContract, revokePermissions);

  // Revoke `ROOT_PERMISSION`, `MAINTAINER_PERMISSION` and `UPGRADE_REPO_PERMISSION` from `Deployer` on the permission manager of each PluginRepo.
  for (const repoName in hre.aragonPluginRepos) {
    const repoAddress = hre.aragonPluginRepos[repoName];
    const revokePluginRepoPermissions: Permission[] = [];
    revokePluginRepoPermissions.push({
      operation: Operation.Revoke,
      where: {
        name: repoName + ' PluginRepo',
        address: repoAddress,
      },
      who: {name: 'Deployer', address: deployer.address},
      permission: 'ROOT_PERMISSION',
    });

    revokePluginRepoPermissions.push({
      operation: Operation.Revoke,
      where: {
        name: repoName + ' PluginRepo',
        address: repoAddress,
      },
      who: {name: 'Deployer', address: deployer.address},
      permission: 'MAINTAINER_PERMISSION',
    });

    revokePluginRepoPermissions.push({
      operation: Operation.Revoke,
      where: {
        name: repoName + ' PluginRepo',
        address: repoAddress,
      },
      who: {name: 'Deployer', address: deployer.address},
      permission: 'UPGRADE_REPO_PERMISSION',
    });

    await managePermissions(
      PluginRepo__factory.connect(repoAddress, deployer),
      revokePluginRepoPermissions
    );
  }

  console.log(
    `\nManagingDao is no longer owned by the (Deployer: ${deployer.address}),` +
      ` and all future actions of the (managingDAO: ${managingDAOAddress}) will be handled by the newly installed (Multisig plugin).`
  );
};
export default func;
func.tags = ['RevokeManagingPermissionsDAO'];
