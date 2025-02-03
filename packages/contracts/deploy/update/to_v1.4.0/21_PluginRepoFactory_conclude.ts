import {PluginRepoFactory__factory} from '../../../typechain';
import {getContractAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nConcluding PluginRepoFactory update');
  const {deployments, ethers} = hre;
  const [deployer] = await ethers.getSigners();

  const pluginRepoFactoryAddress = await getContractAddress(
    'PluginRepoFactory',
    hre
  );
  const pluginRepoFactory = PluginRepoFactory__factory.connect(
    pluginRepoFactoryAddress,
    deployer
  );
  const pluginRepoBase = await pluginRepoFactory.callStatic.pluginRepoBase();

  hre.aragonToVerifyContracts.push(await deployments.get('PluginRepoFactory'));
  hre.aragonToVerifyContracts.push({
    address: pluginRepoBase,
    args: [],
  });
};
export default func;
func.tags = ['PluginRepoFactory', 'Verify', 'v1.4.0'];
