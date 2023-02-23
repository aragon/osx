import {DeployFunction} from 'hardhat-deploy/types';
import {EHRE} from '../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`\nConcluding Plugin Setup Processor deployment.`);

  const {deployments} = hre;
  hre.aragonToVerifyContracts.push(
    await deployments.get('PluginSetupProcessor')
  );
};

export default func;
func.tags = ['PluginSetupProcessor'];
