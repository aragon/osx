import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {Operation} from '../../utils/types';
import {getContractAddress, managePermissions} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nFinalizing ManagingDao.`);

  const {getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();

  // Get `DAORegistry` address.
  const daoRegistryAddress = await getContractAddress('DAORegistry', hre);

  // Get `PluginSetupProcessor` address.
  const pspAddress = await getContractAddress('PluginSetupProcessor', hre);

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAO` contract.
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );

  // Grant `REGISTER_DAO_PERMISSION` to deployer.
  // Grant `ROOT_PERMISSION` to `PluginSetupProcessor`.
  // Grant `APPLY_INSTALLATION_PERMISSION` to `Deployer`.
  const grantPermissions = [
    {
      operation: Operation.Grant,
      where: {name: 'DAORegistry', address: daoRegistryAddress},
      who: {name: 'Deployer', address: deployer},
      permission: 'REGISTER_DAO_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'DAO', address: managingDAOAddress},
      who: {name: 'PluginSetupProcessor', address: pspAddress},
      permission: 'ROOT_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'PluginSetupProcessor', address: pspAddress},
      who: {name: 'Deployer', address: deployer},
      permission: 'APPLY_INSTALLATION_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'DAO', address: managingDAOAddress},
      who: {name: 'Deployer', address: deployer},
      permission: 'SET_METADATA_PERMISSION',
    },
  ];
  await managePermissions(managingDaoContract, grantPermissions);
};
export default func;
func.tags = ['RegisterManagingDAO'];
