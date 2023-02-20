import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {
  DAO_PERMISSIONS,
  getContractAddress,
  managePermission,
  PermissionOp,
} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAO` contract.
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );

  // Set all the permission needed for a DAO to operate normally as if it was created via DAOFactory.
  for (let index = 0; index < DAO_PERMISSIONS.length; index++) {
    const permission = DAO_PERMISSIONS[index];

    await managePermission({
      permissionOp: PermissionOp.Grant,
      permissionManagerContract: managingDaoContract,
      where: {name: 'managingDAO', address: managingDAOAddress},
      who: {name: 'managingDAO', address: managingDAOAddress},
      permission: permission,
    });
  }
};
export default func;
func.tags = ['SetDAOPermissions'];
