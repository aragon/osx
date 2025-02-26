import {DAO__factory} from '../../../typechain';
import {getContractAddress, managePermissions} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // Get `managementDAO` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get `DAO` contract.
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    deployer
  );

  // Get `PluginRepoRegistryProxy` address.
  const pluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistryProxy',
    hre
  );

  // Get `PluginRepoFactory` address.
  const pluginRepoFactoryAddress = await getContractAddress(
    'PluginRepoFactory',
    hre
  );

  // Grant `REGISTER_PLUGIN_REPO_PERMISSION` of `PluginRepoRegistryProxy` to `DAOFactory`.
  // Grant `UPGRADE_REGISTRY_PERMISSION` of `PluginRepoRegistryProxy` to `ManagementDAO`.
  const grantPermissions = [
    {
      operation: Operation.Grant,
      where: {
        name: 'PluginRepoRegistryProxy',
        address: pluginRepoRegistryAddress,
      },
      who: {name: 'PluginRepoFactory', address: pluginRepoFactoryAddress},
      permission: 'REGISTER_PLUGIN_REPO_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {
        name: 'PluginRepoRegistryProxy',
        address: pluginRepoRegistryAddress,
      },
      who: {name: 'ManagementDAO', address: managementDAOAddress},
      permission: 'UPGRADE_REGISTRY_PERMISSION',
    },
  ];
  await managePermissions(managementDaoContract, grantPermissions);
};
export default func;
func.tags = ['New', 'Plugin_Registry_Permissions'];
