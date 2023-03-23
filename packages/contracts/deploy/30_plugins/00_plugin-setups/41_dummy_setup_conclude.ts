import {DeployFunction} from 'hardhat-deploy/types';
import {EHRE} from '../../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`Concluding dummy setup deployment.\n`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments} = hre;

  const DummySetupDeployment = await deployments.get('PluginSetupDummy');
  hre.aragonToVerifyContracts.push(DummySetupDeployment);
};

export default func;
func.tags = ['PluginSetupDummy', 'Verify'];
