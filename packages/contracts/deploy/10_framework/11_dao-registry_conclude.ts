import {DeployFunction} from 'hardhat-deploy/types';
import {EHRE} from '../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`\nConcluding DAO Registry deployment.`);

  const {deployments} = hre;

  hre.aragonToVerfiyContracts.push(
    await deployments.get('DAORegistry_Proxy')
  );
  hre.aragonToVerfiyContracts.push(
    await deployments.get('DAORegistry_Implementation')
  );
};

export default func;
func.tags = ['DAORegistry'];
