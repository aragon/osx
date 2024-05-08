import {
  PluginRepoFactory__factory,
  PluginRepo__factory,
} from '../../../../typechain';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding TokenVotingSetup deployment.\n`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments} = hre;

  const PluginRepoFactoryDeployment = await deployments.get(
    'PluginRepoFactory'
  );
  const pluginRepoFactory = PluginRepoFactory__factory.connect(
    PluginRepoFactoryDeployment.address,
    deployer
  );

  const initializeData =
    PluginRepo__factory.createInterface().encodeFunctionData('initialize', [
      deployer.address,
    ]);

  const pluginRepoBase = await pluginRepoFactory.pluginRepoBase();

  hre.aragonToVerifyContracts.push({
    address: hre.aragonPluginRepos['admin'],
    args: [pluginRepoBase, initializeData],
  });
};

export default func;
func.tags = ['New', 'CreateAdminRepo', 'Verify'];
// skip if network is zksync
func.skip = (hre: HardhatRuntimeEnvironment) =>
  Promise.resolve(
      hre.network.name === 'zkTestnet' ||
      hre.network.name === 'zkLocalTestnet' ||
      hre.network.name === 'zkMainnet'
  );