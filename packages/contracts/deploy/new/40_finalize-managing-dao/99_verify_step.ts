import {DAO__factory} from '../../../typechain';
import {Operation} from '../../../utils/types';
import {checkPermission, getContractAddress, getPSPAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying managing DAO deployment.');

  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);
  // Get `DAO` contract.

  const managingDaoContract = DAO__factory.connect(
    managingDAOAddress,
    (await ethers.getSigners())[0]
  );
  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);
  // Get `PluginSetupProcessor` address.
  const pspAddress = await getPSPAddress(hre)

  // On some chains - such as holesky - wait so previous permission txs
  // are fully applied and verified.
  await delay(5000);
  
  // Check revoked permission.
  await checkPermission(managingDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'DAORegistry', address: daoRegistryAddress},
    who: {name: 'Deployer', address: deployer.address},
    permission: 'REGISTER_DAO_PERMISSION',
  });

  await checkPermission(managingDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'PluginSetupProcessor', address: pspAddress},
    who: {name: 'Deployer', address: deployer.address},
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
    who: {name: 'Deployer', address: deployer.address},
    permission: 'ROOT_PERMISSION',
  });

  await checkPermission(managingDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'ManagingDAO', address: managingDAOAddress},
    who: {name: 'Deployer', address: deployer.address},
    permission: 'EXECUTE_PERMISSION',
  });

  console.log('Finalizing Managing DAO verified');
};
export default func;
func.tags = ['New', 'RegisterManagingDAO', 'InstallMultisigOnManagingDAO'];
