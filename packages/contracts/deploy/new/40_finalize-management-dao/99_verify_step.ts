import {DAO__factory} from '../../../typechain';
import {checkPermission, delay, getContractAddress} from '../../helpers';
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

  // On some chains - such as holesky - wait so
  // previous permission txs are fully applied and verified.
  await delay(20000);

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
    operation: Operation.Grant,
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
func.tags = ['New', 'RegisterManagementDAO', 'Batch-19'];
