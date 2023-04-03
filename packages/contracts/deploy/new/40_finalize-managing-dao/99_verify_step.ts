import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

import {Operation} from '../../../utils/types';
import {checkPermission, getContractAddress} from '../../helpers';

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

  // Check revoked permission.
  await checkPermission(managingDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'DAORegistry', address: daoRegistryAddress},
    who: {name: 'Deployer', address: deployer},
    permission: 'REGISTER_DAO_PERMISSION',
  });

  await checkPermission(managingDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'PluginSetupProcessor', address: pspAddress},
    who: {name: 'Deployer', address: deployer},
    permission: 'APPLY_INSTALLATION_PERMISSION',
  });

  await checkPermission(managingDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'ManagingDAO', address: managingDAOAddress},
    who: {name: 'PluginSetupProcessor', address: pspAddress},
    permission: 'ROOT_PERMISSION',
  });

  await checkPermission(managingDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'ManagingDAO', address: managingDAOAddress},
    who: {name: 'Deployer', address: deployer},
    permission: 'ROOT_PERMISSION',
  });

  await checkPermission(managingDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'ManagingDAO', address: managingDAOAddress},
    who: {name: 'Deployer', address: deployer},
    permission: 'EXECUTE_PERMISSION',
  });

  console.log('Finalizing Managing DAO verified');
};
export default func;
func.tags = ['RegisterManagingDAO', 'InstallMultisigOnManagingDAO'];
