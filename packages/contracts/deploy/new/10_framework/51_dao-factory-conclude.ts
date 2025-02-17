import {DAOFactory__factory} from '../../../typechain';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding DAOFactory deployment.\n`);
  const {deployments, ethers} = hre;

  const [deployer] = await ethers.getSigners();

  const DAOFactoryDeployment = await deployments.get('DAOFactory');
  const daoFactory = DAOFactory__factory.connect(
    DAOFactoryDeployment.address,
    deployer
  );

  hre.aragonToVerifyContracts.push({
    contract: 'src/framework/dao/DAOFactory.sol:DAOFactory',
    ...DAOFactoryDeployment,
  });
  hre.aragonToVerifyContracts.push({
    contract: 'src/core/dao/DAO.sol:DAO',
    address: await daoFactory.daoBase(),
    args: [],
  });
};

export default func;
func.tags = ['New', 'DAOFactory', 'Verify', 'Batch-9'];
