import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {Operation} from '../../../utils/types';
import {getContractAddress, managePermissions} from '../../helpers';
import {DAO__factory} from '../../../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `DAO` contract.
  const managingDaoContract = DAO__factory.connect(
    managingDAOAddress,
    deployer
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
func.tags = ['New', 'Plugin_Registry_Permissions'];
