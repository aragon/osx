import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding Plugin Repo Registry deployment.\n`);

  const {deployments} = hre;

  hre.aragonToVerifyContracts.push(
    await deployments.get('PluginRepoRegistry_Proxy')
  );

  let pi = await deployments.get('PluginRepoRegistry_Implementation');
  pi.contract = 'src/framework/plugin/repo/PluginRepoRegistry.sol:PluginRepoRegistry';
  hre.aragonToVerifyContracts.push(pi);
};

export default func;
func.tags = ['New', 'PluginRepoRegistry', 'Verify'];
