import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding DAO Registry deployment.\n`);

  const {deployments} = hre;

  hre.aragonToVerifyContracts.push(await deployments.get('DAORegistryProxy'));
  hre.aragonToVerifyContracts.push({
    contract: 'src/framework/dao/DAORegistry.sol:DAORegistry',
    ...(await deployments.get('DAORegistryProxy_Implementation')),
  });
};

export default func;
func.tags = ['New', 'DAORegistry', 'Verify'];
