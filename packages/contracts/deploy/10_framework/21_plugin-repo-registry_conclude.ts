import {DeployFunction} from 'hardhat-deploy/types';
import {EHRE} from '../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`\nConcluding Plugin Repo Registry deployment.`);

  const {deployments} = hre;

  console.log(await deployments.get('PluginRepoRegistry_Proxy'));
  console.log(await deployments.get('PluginRepoRegistry'));
  hre.aragonToVerfiyContracts.push(
    await deployments.get('PluginRepoRegistry_Proxy')
  );
  hre.aragonToVerfiyContracts.push(
    await deployments.get('PluginRepoRegistry_Implementation')
  );
};

export default func;
func.tags = ['PluginRepoRegistry'];
