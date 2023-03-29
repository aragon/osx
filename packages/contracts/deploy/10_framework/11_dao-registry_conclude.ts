import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding DAO Registry deployment.\n`);

  const {deployments} = hre;

  hre.aragonToVerifyContracts.push(await deployments.get('DAORegistry_Proxy'));
  hre.aragonToVerifyContracts.push(
    await deployments.get('DAORegistry_Implementation')
  );
};

export default func;
func.tags = ['DAORegistry', 'Verify'];
