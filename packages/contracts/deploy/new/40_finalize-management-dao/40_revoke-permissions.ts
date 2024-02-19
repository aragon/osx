import {DAO__factory, PluginRepo__factory} from '../../../typechain';
import {managementDaoSubdomainEnv} from '../../../utils/environment';
import {getContractAddress, managePermissions, Permission} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get info from .env
  const daoSubdomain = managementDaoSubdomainEnv(hre.network);

  if (!daoSubdomain)
    throw new Error('ManagementDAO subdomain has not been set in .env');

  // Get `DAORegistryProxy` address.
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);

  // Get `PluginSetupProcessor` address.
  const pspAddress = await getContractAddress('PluginSetupProcessor', hre);

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

  // Revoke `REGISTER_DAO_PERMISSION` from `Deployer`.
  // Revoke `ROOT_PERMISSION` from `PluginSetupProcessor`.
  // Revoke `APPLY_INSTALLATION_PERMISSION` from `Deployer`.
  // Revoke `ROOT_PERMISSION` from `Deployer`.
  const revokePermissions = [
    {
      operation: Operation.Revoke,
      where: {name: 'DAORegistryProxy', address: daoRegistryAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'REGISTER_DAO_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
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
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'ROOT_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'SET_METADATA_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'EXECUTE_PERMISSION',
    },
  ];
  await managePermissions(managementDaoContract, revokePermissions);

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
    `\nManagementDao is no longer owned by the (Deployer: ${deployer.address}),` +
      ` and all future actions of the (managementDAO: ${managementDAOAddress}) will be handled by the newly installed (Multisig plugin).`
  );
};
export default func;
func.tags = ['New', 'RevokeManagementPermissionsDAO'];
