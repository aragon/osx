import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {Operation} from '../../../utils/types';
import {getContractAddress, managePermissions} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();

  console.log(`Granting ${deployer} temp execute permissions`);
  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAO` contract.
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );

  // grant the deployer execute permissions during deployment. This will be revoked in 40_finalize-managing-dao/40_revoke-permissions
  await managePermissions(managingDaoContract, [
    {
      operation: Operation.Grant,
      where: {name: 'DAO', address: managingDAOAddress},
      who: {name: 'Deployer', address: deployer},
      permission: 'EXECUTE_PERMISSION',
    },
  ]);
};
export default func;
func.tags = ['ManagingDaoPermissions'];
