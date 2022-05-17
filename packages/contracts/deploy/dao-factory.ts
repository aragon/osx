import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let registryAddr: string = '';
  let adminDaoAddress: string = '';
  while (!registryAddr && !adminDaoAddress) {
    try {
      registryAddr = await getContractAddress('Registry', hre);
      adminDaoAddress = await getContractAddress('DAO', hre);
    } catch (e) {
      console.log('no Registry address found...');
      throw e;
    }
  }
  const tokenFactory = await getContractAddress('TokenFactory', hre);

  await deploy('GlobalDAOFactory', {
    from: deployer,
    args: [registryAddr, tokenFactory /*pass adminDaoAddress*/],
    log: true,
  });
};
export default func;
func.runAtTheEnd = true;
func.tags = ['DAOFactory'];
