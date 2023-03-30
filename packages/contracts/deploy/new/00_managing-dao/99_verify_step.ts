import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

import {Operation} from '../../../utils/types';
import {
  checkPermission,
  DAO_PERMISSIONS,
  getContractAddress,
} from '../../helpers';

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
  await checkPermission(managingDaoContract, {
    operation: Operation.Grant,
    where: {name: 'ManagingDAO', address: managingDAOAddress},
    who: {name: 'Deployer', address: deployer},
    permission: 'ROOT_PERMISSION',
  });

  // check that the DAO have all permissions set correctly
  for (let index = 0; index < DAO_PERMISSIONS.length; index++) {
    const permission = DAO_PERMISSIONS[index];

    await checkPermission(managingDaoContract, {
      operation: Operation.Grant,
      where: {name: 'ManagingDAO', address: managingDAOAddress},
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: permission,
    });
  }

  console.log('Managing DAO deployment verified');
};
export default func;
func.tags = ['ManagingDao', 'SetDAOPermissions'];
