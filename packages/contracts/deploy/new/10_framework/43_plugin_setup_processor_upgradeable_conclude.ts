import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipIfNotZkSync} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding Plugin Setup Processor deployment.\n`);

  const {deployments} = hre;
  hre.aragonToVerifyContracts.push(
    await deployments.get('PluginSetupProcessor')
  );
};

export default func;
func.tags = ['New', 'PluginSetupProcessorUpgradeable', 'Verify'];
func.skip = async hre =>
  await skipIfNotZkSync(hre, 'PluginSetupProcessorUpgradeable-Verify');
