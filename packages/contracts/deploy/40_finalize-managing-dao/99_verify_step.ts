import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

import {checkPermission, getContractAddress, PermissionOp} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying managing DAO deployment.');

  const {getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);
  // Get `DAO` contract.
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );
  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);
  // Get `PluginSetupProcessor` address.
  const pspAddress = await getContractAddress('PluginSetupProcessor', hre);

  // Check revoked permission.
  await checkPermission({
    permissionOp: PermissionOp.Revoke,
    permissionManager: managingDaoContract,
    where: daoRegistryAddress,
    who: deployer,
    permission: 'REGISTER_DAO_PERMISSION',
  });

  await checkPermission({
    permissionOp: PermissionOp.Revoke,
    permissionManager: managingDaoContract,
    where: pspAddress,
    who: deployer,
    permission: 'APPLY_INSTALLATION_PERMISSION',
  });

  await checkPermission({
    permissionOp: PermissionOp.Revoke,
    permissionManager: managingDaoContract,
    where: managingDAOAddress,
    who: pspAddress,
    permission: 'ROOT_PERMISSION',
  });

  await checkPermission({
    permissionOp: PermissionOp.Revoke,
    permissionManager: managingDaoContract,
    where: managingDAOAddress,
    who: deployer,
    permission: 'ROOT_PERMISSION',
  });

  console.log('Finalizing Managing DAO verified');
};
export default func;
func.tags = [
  'RegisterManagingDAO',
  'InstallMultisigOnManagingDAO',
  'RevokeDeployerPermissions',
];
