import {DAO__factory} from '../../../typechain';
import {Operation} from '../../../utils/types';
import {getContractAddress, managePermissions} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  console.log(`Granting ${deployer.address} temp execute permissions`);

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

  // grant the deployer execute permissions during deployment. This will be revoked in 40_finalize-management-dao/40_revoke-permissions
  await managePermissions(managementDaoContract, [
    {
      operation: Operation.Grant,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'EXECUTE_PERMISSION',
    },
  ]);
};
export default func;
func.tags = ['New', 'ManagementDaoPermissions'];
