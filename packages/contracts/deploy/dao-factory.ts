import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const registry = await deployments.get('Registry');

  const token = await deployments.get('TokenFactory');

  await deploy('DAOFactory', {
    from: deployer,
    args: [registry.address, token.address],
    log: true,
  });
};
export default func;
func.tags = ['DAOFactory'];
func.dependencies = ['Registry', 'TokenFactory'];
