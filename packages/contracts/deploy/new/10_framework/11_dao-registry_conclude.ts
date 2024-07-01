import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding DAO Registry deployment.\n`);

  const {deployments} = hre;

  hre.aragonToVerifyContracts.push(await deployments.get('DAORegistry_Proxy'));

  let di = await deployments.get('DAORegistry_Implementation');
  di.contract = 'src/framework/dao/DAORegistry.sol:DAORegistry';
  hre.aragonToVerifyContracts.push(di);
};

export default func;
func.tags = ['New', 'DAORegistry', 'Verify'];
