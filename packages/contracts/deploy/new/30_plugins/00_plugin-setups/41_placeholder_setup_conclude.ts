import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding PlaceholdeSetup deployment.\n`);

  const {deployments} = hre;

  const PlaceholderSetupDeployment = await deployments.get('PlaceholderSetup');
  hre.aragonToVerifyContracts.push(PlaceholderSetupDeployment);
};

export default func;
func.tags = ['PlaceholderSetup', 'Verify'];
