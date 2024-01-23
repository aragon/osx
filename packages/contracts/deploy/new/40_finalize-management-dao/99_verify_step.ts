import {DAO__factory} from '../../../typechain';
import {checkPermission, getContractAddress} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying management DAO deployment.');

  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get `ManagementDAOProxy` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );
  // Get `DAO` contract.

  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    (await ethers.getSigners())[0]
  );
  // Get `DAORegistryProxy` address.
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);
  // Get `PluginSetupProcessor` address.
  const pspAddress = await getContractAddress('PluginSetupProcessor', hre);

  // Check revoked permission.
  await checkPermission(managementDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'DAORegistryProxy', address: daoRegistryAddress},
    who: {name: 'Deployer', address: deployer.address},
    permission: 'REGISTER_DAO_PERMISSION',
  });

  await checkPermission(managementDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'PluginSetupProcessor', address: pspAddress},
    who: {name: 'Deployer', address: deployer.address},
    permission: 'APPLY_INSTALLATION_PERMISSION',
  });

  await checkPermission(managementDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
    who: {name: 'PluginSetupProcessor', address: pspAddress},
    permission: 'ROOT_PERMISSION',
  });

  await checkPermission(managementDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
    who: {name: 'Deployer', address: deployer.address},
    permission: 'ROOT_PERMISSION',
  });

  await checkPermission(managementDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
    who: {name: 'Deployer', address: deployer.address},
    permission: 'EXECUTE_PERMISSION',
  });

  console.log('Finalizing Management DAO verified');
};
export default func;
func.tags = ['New', 'RegisterManagementDAO', 'InstallMultisigOnManagementDAO'];
