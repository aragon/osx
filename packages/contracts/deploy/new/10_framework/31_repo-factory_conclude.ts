import {PluginRepoFactory__factory} from '../../../typechain';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding Plugin Repo Factory deployment.\n`);

  const {deployments, ethers} = hre;
  const [deployer] = await ethers.getSigners();

  const pluginRepoFactoryDeployment = await deployments.get(
    'PluginRepoFactory'
  );
  const pluginRepoFactory = PluginRepoFactory__factory.connect(
    pluginRepoFactoryDeployment.address,
    deployer
  );

  hre.aragonToVerifyContracts.push({
    contract:
      'src/framework/plugin/repo/PluginRepoFactory.sol:PluginRepoFactory',
    ...pluginRepoFactoryDeployment,
  });
  hre.aragonToVerifyContracts.push({
    contract: 'src/framework/plugin/repo/PluginRepo.sol:PluginRepo',
    address: await pluginRepoFactory.pluginRepoBase(),
    args: [],
  });
};

export default func;
func.tags = ['New', 'PluginRepoFactory', 'Verify', 'Batch-7'];
