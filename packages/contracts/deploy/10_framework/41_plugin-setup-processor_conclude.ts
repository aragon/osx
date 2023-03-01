import {DeployFunction} from 'hardhat-deploy/types';
import {EHRE} from '../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`Concluding Plugin Setup Processor deployment.\n`);

  const {deployments} = hre;
  hre.aragonToVerifyContracts.push(
    await deployments.get('PluginSetupProcessor')
  );
};

export default func;
func.tags = ['PluginSetupProcessor', 'Verify'];
