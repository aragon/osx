import {DeployFunction} from 'hardhat-deploy/types';
import {EHRE} from '../../utils/types';
import {PluginRepoFactory__factory} from '../../typechain';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`\nConcluding Plugin Repo Registry deployment.`);

  const [deployer] = await hre.ethers.getSigners();
  const {deployments} = hre;

  const pluginRepoFactoryDeployment = await deployments.get(
    'PluginRepoFactory'
  );
  const pluginRepoFactory = await PluginRepoFactory__factory.connect(
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
func.tags = ['PluginRepoFactory'];