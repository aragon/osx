import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding Plugin Repo Registry deployment.\n`);

  const {deployments} = hre;

  hre.aragonToVerifyContracts.push(
    await deployments.get('PluginRepoRegistryProxy')
  );
  hre.aragonToVerifyContracts.push({
    contract:
      'src/framework/plugin/repo/PluginRepoRegistry.sol:PluginRepoRegistry',
    ...(await deployments.get('PluginRepoRegistryProxy_Implementation')),
  });
};

export default func;
func.tags = ['New', 'PluginRepoRegistry', 'Verify'];
