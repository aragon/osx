import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DAOFactory__factory} from '../../../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding DAOFactory deployment.\n`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments} = hre;

  const DAOFactoryDeployment = await deployments.get('DAOFactory');
  const daoFactory = DAOFactory__factory.connect(
    DAOFactoryDeployment.address,
    deployer
  );

  hre.aragonToVerifyContracts.push(DAOFactoryDeployment);
  hre.aragonToVerifyContracts.push({
    address: await daoFactory.daoBase(),
    args: [],
  });
};

export default func;
func.tags = ['DAOFactory', 'Verify'];
