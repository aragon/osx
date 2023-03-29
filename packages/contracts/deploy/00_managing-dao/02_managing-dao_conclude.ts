import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding ManagingDao deployment.\n`);

  const {deployments} = hre;

  hre.aragonToVerifyContracts.push(await deployments.get('DAO_Implementation'));
  hre.aragonToVerifyContracts.push(await deployments.get('DAO_Proxy'));
};

export default func;
func.tags = ['ManagingDao', 'ManagingDaoPermissions', 'Verify'];
