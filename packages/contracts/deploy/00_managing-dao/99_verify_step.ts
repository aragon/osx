import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

import {
  checkPermission,
  DAO_PERMISSION,
  getContractAddress,
  PermissionOp,
} from '../helpers';

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

  // Check that deployer has root permission.
  await checkPermission({
    permissionOp: PermissionOp.Grant,
    permissionManager: managingDaoContract,
    where: managingDAOAddress,
    who: deployer,
    permission: 'ROOT_PERMISSION',
  });

  // check that the DAO have all permissions set correctly
  for (let index = 0; index < DAO_PERMISSION.length; index++) {
    const permission = DAO_PERMISSION[index];

    await checkPermission({
      permissionOp: PermissionOp.Grant,
      permissionManager: managingDaoContract,
      where: managingDAOAddress,
      who: managingDAOAddress,
      permission: permission,
    });
  }

  console.log('Managing DAO deployment verified');
};
export default func;
func.tags = ['ManagingDao'];
