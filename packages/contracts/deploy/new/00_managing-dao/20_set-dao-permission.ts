import {DAO__factory} from '../../../typechain';
import {
  DAO_PERMISSIONS,
  getContractAddress,
  managePermissions,
} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk/src/from_osx/permission';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nSetting ManagingDao permissions.');
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAO` contract.
  const managingDaoContract = DAO__factory.connect(
    managingDAOAddress,
    deployer
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

  await managePermissions(managingDaoContract, permissions);
};
export default func;
func.tags = ['New', 'SetManagingDaoPermissions'];
