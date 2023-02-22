import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  let grantTx;

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

  const REGISTER_PLUGIN_REPO_PERMISSION_ID = ethers.utils.id(
    'REGISTER_PLUGIN_REPO_PERMISSION'
  );

  // Gransting Permissions
  grantTx = await managingDaoContract.grant(
    pluginRepoRegistryAddress,
    pluginRepoFactoryAddress,
    REGISTER_PLUGIN_REPO_PERMISSION_ID
  );
  await grantTx.wait();

  console.log(
    `Granted the REGISTER_PLUGIN_REPO_PERMISSION of 'pluginRepoRegistry' (${pluginRepoRegistryAddress}) to 'pluginRepoFactory' (${pluginRepoFactoryAddress}) (tx: ${grantTx.hash})`
  );
};
export default func;
func.tags = ['Plugin_Registry_Permissions'];
