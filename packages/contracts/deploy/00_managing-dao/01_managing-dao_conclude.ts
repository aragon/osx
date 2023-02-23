import {DeployFunction} from 'hardhat-deploy/types';
import {EHRE} from '../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`\nConcluding ManagingDao deployment.`);

  const {deployments} = hre;

  hre.aragonToVerfiyContracts.push(await deployments.get('DAO_Implementation'));
  hre.aragonToVerfiyContracts.push(await deployments.get('DAO_Proxy'));
};

export default func;
func.tags = ['ManagingDao'];
