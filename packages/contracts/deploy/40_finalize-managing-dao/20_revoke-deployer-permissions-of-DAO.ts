import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress} from '../helpers';

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

  const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION');

  // Revoke
  const revokeTx = await managingDaoContract.revoke(
    managingDAOAddress,
    deployer,
    ROOT_PERMISSION_ID
  );
  await revokeTx.wait();
  console.log(
    `Revoked the ROOT_PERMISSION_ID of (managingDAO: ${managingDAOAddress}) from Deployer (Deployer: ${deployer}) (tx: ${revokeTx.hash})`
  );

  console.log(
    `\nManagingDao is no longer owned by the (Deployer: ${deployer}),` +
      ` and all future actions of the (managingDAO: ${managingDAOAddress}) will be handled by the installed (Multisig plugin) at the previous step.`
  );
};
export default func;
func.tags = ['RevokeDeployerPermissions'];
