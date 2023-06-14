import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {PluginRepoFactory__factory} from '../../../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding Plugin Repo Registry deployment.\n`);

  const {deployments, ethers} = hre;
  const [deployer] = await ethers.getSigners();

  const pluginRepoFactoryDeployment = await deployments.get(
    'PluginRepoFactory'
  );
  const pluginRepoFactory = PluginRepoFactory__factory.connect(
    pluginRepoFactoryDeployment.address,
    deployer
  );

  hre.aragonToVerifyContracts.push(pluginRepoFactoryDeployment);
  hre.aragonToVerifyContracts.push({
    address: await pluginRepoFactory.pluginRepoBase(),
    args: [],
  });
};

export default func;
func.tags = ['New', 'PluginRepoFactory', 'Verify'];
