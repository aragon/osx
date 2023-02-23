import {DeployFunction} from 'hardhat-deploy/types';
import {DAOFactory__factory} from '../../typechain';
import {EHRE} from '../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`\nConcluding DAOFactory deployment.`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments} = hre;

  const DAOFactoryDeployment = await deployments.get('DAOFactory');
  const pluginRepoFactory = await DAOFactory__factory.connect(
    DAOFactoryDeployment.address,
    deployer
  );

  hre.aragonToVerifyContracts.push(DAOFactoryDeployment);
  hre.aragonToVerifyContracts.push({
    address: await pluginRepoFactory.daoBase(),
    args: [],
  });
};

export default func;
func.tags = ['DAOFactory'];
