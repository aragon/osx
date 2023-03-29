import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding Plugin Repo Registry deployment.\n`);

  const {deployments} = hre;

  hre.aragonToVerifyContracts.push(
    await deployments.get('PluginRepoRegistry_Proxy')
  );
  hre.aragonToVerifyContracts.push(
    await deployments.get('PluginRepoRegistry_Implementation')
  );
};

export default func;
func.tags = ['PluginRepoRegistry', 'Verify'];
