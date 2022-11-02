import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {getContractAddress} from '../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  // Get managing DAO address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get `PluginRepoRegistry` address.
  const pluginRepoRegistryAddress = await getContractAddress(
    'PluginRepoRegistry',
    hre
  );

  await deploy('PluginSetupProcessor', {
    from: deployer,
    args: [managingDAOAddress, pluginRepoRegistryAddress],
    log: true,
  });
};
export default func;
func.tags = ['PluginSetupProcessor'];
