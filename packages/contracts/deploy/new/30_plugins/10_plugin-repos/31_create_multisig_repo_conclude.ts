import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {
  PluginRepoFactory__factory,
  PluginRepo__factory,
} from '../../../../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding AddresslistVotingSetup deployment.\n`);
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
    address: hre.aragonPluginRepos['multisig'],
    args: [pluginRepoBase, initializeData],
  });
};

export default func;
func.tags = ['CreateMultisigRepo', 'Verify'];
