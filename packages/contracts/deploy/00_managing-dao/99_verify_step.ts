import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

import {getContractAddress} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying managing DAO deployment.');

  const {getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();

  // Get managing DAO address.
  const managingDAOAddress = await getContractAddress('DAO', hre);
  // Get `DAO` contract.
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );

  const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION');
  const isGranted = await managingDaoContract.callStatic.isGranted(
    managingDAOAddress,
    deployer,
    ROOT_PERMISSION_ID,
    '0x'
  );
  if (!isGranted) {
    throw new Error(
      `Managing DAO verification failed. ${deployer} is not ROOT`
    );
  }
  console.log('Managing DAO deployment verified');
};
export default func;
func.tags = ['ManagingDao'];
