import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let registryAddr: string = '';
  while (!registryAddr) {
    try {
      registryAddr = await getContractAddress('Registry', hre);
    } catch (e) {
      console.log('no Registry address found...');
      throw e;
    }
  }
  const tokenFactory = await getContractAddress('TokenFactory', hre);

  await deploy('GlobalDAOFactory', {
    from: deployer,
    args: [registryAddr, tokenFactory],
    log: true,
  });
};
export default func;
func.runAtTheEnd = true;
func.tags = ['DAOFactory'];
