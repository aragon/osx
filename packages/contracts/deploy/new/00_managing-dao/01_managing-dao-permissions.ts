import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

import {Operation} from '../../../utils/types';

import {getContractAddress, managePermissions} from '../../helpers';
import {DAO__factory} from '../../../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  console.log(`Granting ${deployer.address} temp execute permissions`);

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);
  // Get `DAO` contract.
  const managingDaoContract = DAO__factory.connect(
    managingDAOAddress,
    deployer
  );

  // grant the deployer execute permissions during deployment. This will be revoked in 40_finalize-managing-dao/40_revoke-permissions
  await managePermissions(managingDaoContract, [
    {
      operation: Operation.Grant,
      where: {name: 'DAO', address: managingDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'EXECUTE_PERMISSION',
    },
  ]);
};
export default func;
func.tags = ['New', 'ManagingDaoPermissions'];
