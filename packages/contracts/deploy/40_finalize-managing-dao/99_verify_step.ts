import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

import {getContractAddress} from '../helpers';

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
  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);
  // Get `PluginSetupProcessor` address.
  const pspAddress = await getContractAddress('PluginSetupProcessor', hre);

  // Check permission.
  const REGISTER_DAO_PERMISSION_ID = ethers.utils.id('REGISTER_DAO_PERMISSION');
  const isRegisterGranted = await managingDaoContract.callStatic.isGranted(
    daoRegistryAddress,
    deployer,
    REGISTER_DAO_PERMISSION_ID,
    '0x'
  );
  if (isRegisterGranted) {
    throw new Error(
      `Managing DAO verification failed. ${deployer} still have REGISTER_DAO_PERMISSION`
    );
  }

  const APPLY_INSTALLATION_PERMISSION_ID = ethers.utils.id(
    'APPLY_INSTALLATION_PERMISSION'
  );
  const isApplyGranted = await managingDaoContract.callStatic.isGranted(
    managingDAOAddress,
    pspAddress,
    APPLY_INSTALLATION_PERMISSION_ID,
    '0x'
  );
  if (isApplyGranted) {
    throw new Error(
      `Managing DAO verification failed. ${deployer} still have APPLY_INSTALLATION_PERMISSION`
    );
  }

  const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION');
  const isRootGrantedToPSP = await managingDaoContract.callStatic.isGranted(
    managingDAOAddress,
    pspAddress,
    ROOT_PERMISSION_ID,
    '0x'
  );
  if (isRootGrantedToPSP) {
    throw new Error(
      `Managing DAO verification failed. (PluginSetupProcessor: ${pspAddress}) is still ROOT`
    );
  }

  const isRootGranted = await managingDaoContract.callStatic.isGranted(
    managingDAOAddress,
    deployer,
    ROOT_PERMISSION_ID,
    '0x'
  );
  if (isRootGranted) {
    throw new Error(
      `Managing DAO verification failed. ${deployer} is still ROOT`
    );
  }

  console.log('Finalizing Managing DAO verified');
};
export default func;
func.tags = [
  'RegisterManagingDAO',
  'InstallMultisigOnManagingDAO',
  'RevokeDeployerPermissions',
];
