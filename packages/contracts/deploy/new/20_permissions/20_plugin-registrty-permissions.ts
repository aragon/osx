import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {Operation} from '../../../utils/types';
import {getContractAddress, managePermissions} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAO` contract.
  const managingDaoContract = await ethers.getContractAt(
    'DAO',
    managingDAOAddress
  );

  // Get `PluginRepoRegistry` address.
  const pluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistry',
    hre
  );

  // Get `PluginRepoFactory` address.
  const pluginRepoFactoryAddress = await getContractAddress(
    'PluginRepoFactory',
    hre
  );

  // Grant `REGISTER_PLUGIN_REPO_PERMISSION` of `PluginRepoRegistry` to `DAOFactory`.
  // Grant `UPGRADE_REGISTRY_PERMISSION` of `PluginRepoRegistry` to `ManagingDAO`.
  const grantPermissions = [
    {
      operation: Operation.Grant,
      where: {name: 'PluginRepoRegistry', address: pluginRepoRegistryAddress},
      who: {name: 'PluginRepoFactory', address: pluginRepoFactoryAddress},
      permission: 'REGISTER_PLUGIN_REPO_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'PluginRepoRegistry', address: pluginRepoRegistryAddress},
      who: {name: 'ManagingDAO', address: managingDAOAddress},
      permission: 'UPGRADE_REGISTRY_PERMISSION',
    },
  ];
  await managePermissions(managingDaoContract, grantPermissions);
};
export default func;
func.tags = ['Plugin_Registry_Permissions'];
