import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress, managePermissions} from '../helpers';
import {Operation} from '../../utils/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();

  // Get info from .env
  const daoSubdomain = process.env.MANAGINGDAO_SUBDOMAIN || '';

  if (!daoSubdomain)
    throw new Error('ManagingDAO subdomain has not been set in .env');

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

  // Revoke `REGISTER_DAO_PERMISSION` from deployer.
  // Revoke `ROOT_PERMISSION` from `PluginSetupProcessor`.
  // Revoke `APPLY_INSTALLATION_PERMISSION` from `Deployer`.
  // Revoke `ROOT_PERMISSION` from `Deployer`.
  const revokePermissions = [
    {
      operation: Operation.Revoke,
      where: {name: 'DAORegistry', address: daoRegistryAddress},
      who: {name: 'Deployer', address: deployer},
      permission: 'REGISTER_DAO_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'DAO', address: managingDAOAddress},
      who: {name: 'PluginSetupProcessor', address: pspAddress},
      permission: 'ROOT_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'PluginSetupProcessor', address: pspAddress},
      who: {name: 'Deployer', address: deployer},
      permission: 'APPLY_INSTALLATION_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'managingDAO', address: managingDAOAddress},
      who: {name: 'Deployer', address: deployer},
      permission: 'ROOT_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'DAO', address: managingDAOAddress},
      who: {name: 'Deployer', address: deployer},
      permission: 'SET_METADATA_PERMISSION',
    },
  ];
  await managePermissions(managingDaoContract, revokePermissions);

  console.log(
    `\nManagingDao is no longer owned by the (Deployer: ${deployer}),` +
      ` and all future actions of the (managingDAO: ${managingDAOAddress}) will be handled by the newly installed (Multisig plugin).`
  );
};
export default func;
func.tags = ['RegisterManagingDAO'];
