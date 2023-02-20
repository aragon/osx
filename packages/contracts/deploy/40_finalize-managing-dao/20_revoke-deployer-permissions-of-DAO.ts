import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress, managePermission, PermissionOp} from '../helpers';

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

  // Revoke `ROOT_PERMISSION` from `Deployer`.
  await managePermission({
    permissionOp: PermissionOp.Revoke,
    permissionManagerContract: managingDaoContract,
    where: {name: 'managingDAO', address: managingDAOAddress},
    who: {name: 'Deployer', address: deployer},
    permission: 'ROOT_PERMISSION',
  });

  console.log(
    `\nManagingDao is no longer owned by the (Deployer: ${deployer}),` +
      ` and all future actions of the (managingDAO: ${managingDAOAddress}) will be handled by the installed (Multisig plugin) at the previous step.`
  );
};
export default func;
func.tags = ['RevokeDeployerPermissions'];
