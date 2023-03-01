import {DeployFunction} from 'hardhat-deploy/types';
import {
  PluginRepoFactory__factory,
  PluginRepo__factory,
} from '../../../typechain';
import {EHRE} from '../../../utils/types';
import {getContractAddress} from '../../helpers';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`Concluding multisig setup deployment.\n`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments} = hre;

  const PluginRepoFactoryDeployment = await deployments.get(
    'PluginRepoFactory'
  );
  const pluginRepoFactory = PluginRepoFactory__factory.connect(
    PluginRepoFactoryDeployment.address,
    deployer
  );
  const managingDaoAddress = await getContractAddress('DAO', hre);

  const pluginRepoBase = await pluginRepoFactory.pluginRepoBase();
  const initializeData =
    PluginRepo__factory.createInterface().encodeFunctionData('initialize', [
      managingDaoAddress,
    ]);

  for (const i in hre.aragonPluginRepos) {
    hre.aragonToVerifyContracts.push({
      address: hre.aragonPluginRepos[i],
      args: [pluginRepoBase, initializeData],
    });
  }
};

export default func;
func.tags = ['Create_Register_Plugins', 'Verify'];
