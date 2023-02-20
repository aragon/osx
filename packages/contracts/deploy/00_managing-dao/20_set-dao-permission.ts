import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {
  DAO_PERMISSIONS,
  getContractAddress,
  managePermission,
  Operation,
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
  const permissions = DAO_PERMISSIONS.map(permission => {
    return {
      operation: Operation.Grant,
      where: {name: 'managingDAO', address: managingDAOAddress},
      who: {name: 'managingDAO', address: managingDAOAddress},
      permission: permission,
    };
  });

  await managePermission(managingDaoContract, permissions);
};
export default func;
func.tags = ['SetDAOPermissions'];
