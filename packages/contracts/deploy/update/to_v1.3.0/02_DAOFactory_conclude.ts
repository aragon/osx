import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DAOFactory__factory} from '../../../typechain';
import {getContractAddress} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nConcluding DAOFactory update');
  const {deployments, ethers} = hre;
  const [deployer] = await ethers.getSigners();
  const daoFactoryAddress = await getContractAddress('DAOFactory', hre);
  const daoFactory = DAOFactory__factory.connect(daoFactoryAddress, deployer);
  const daoBase = await daoFactory.callStatic.daoBase();
  hre.aragonToVerifyContracts.push(await deployments.get('DAOFactory'));
  hre.aragonToVerifyContracts.push({
    address: daoBase,
    args: [],
  });
};
export default func;
func.tags = ['DAOFactory', 'Verify'];
