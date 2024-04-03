import {DAO__factory, PluginRepo__factory} from '../../../typechain';
import {Operation} from '../../../utils/types';
import {getContractAddress, managePermissions, Permission} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Revoke `ROOT_PERMISSION`, `MAINTAINER_PERMISSION` and `UPGRADE_REPO_PERMISSION` from `Deployer` on the permission manager of each PluginRepo.
  for (const repoName in hre.aragonPluginRepos) {
    const repoAddress = hre.aragonPluginRepos[repoName];

    // if repoAddress empty, the deployment must have been marked as skipped.
    if (repoAddress === '') continue;

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
    `\nPluginRepos are no longer owned by the (Deployer: ${deployer.address}),`
  );
};
export default func;
func.tags = ['New', 'RevokePermissionsPluginRepos'];
