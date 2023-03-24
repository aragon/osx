import {DeployFunction} from 'hardhat-deploy/types';
import {EHRE} from '../../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`Concluding PlaceholdeSetup deployment.\n`);

  const {deployments} = hre;

  const PlaceholderSetupDeployment = await deployments.get('PlaceholderSetup');
  hre.aragonToVerifyContracts.push(PlaceholderSetupDeployment);
};

export default func;
func.tags = ['PlaceholderSetup', 'Verify'];
