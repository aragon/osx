import {DAO__factory} from '../../../typechain';
import {
  DAO_PERMISSIONS,
  getContractAddress,
  managePermissions,
} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nSetting ManagementDao permissions.');
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get `managementDAO` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get `DAO` contract.
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    deployer
  );

  // Set all the permission needed for a DAO to operate normally as if it was created via DAOFactory.
  const permissions = DAO_PERMISSIONS.map(permission => {
    return {
      operation: Operation.Grant,
      where: {name: 'managementDAO', address: managementDAOAddress},
      who: {name: 'managementDAO', address: managementDAOAddress},
      permission: permission,
    };
  });

  await managePermissions(managementDaoContract, permissions);
};
export default func;
func.tags = ['New', 'SetManagementDaoPermissions'];
