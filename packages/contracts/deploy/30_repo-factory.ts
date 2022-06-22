import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const adminDaoAddress = await getContractAddress('DAO', hre);
  const aragonPluginRegistryAddress = await getContractAddress(
    'AragonPluginRegistry',
    hre
  );

  const ret = await deploy('PluginRepoFactory', {
    from: deployer,
    args: [aragonPluginRegistryAddress],
    log: true,
  });

  const pluginRepoFactoryAddress: string = ret.receipt?.contractAddress || '';
  const registerRole = ethers.utils.id('REGISTER_ROLE');

  // Grant REGISTER_ROLE to pluginRepo factory
  const adminDaoContract = await ethers.getContractAt('DAO', adminDaoAddress);
  await adminDaoContract.grant(
    aragonPluginRegistryAddress,
    pluginRepoFactoryAddress,
    registerRole
  );
};
export default func;
func.runAtTheEnd = true;
func.tags = ['AragonPluginRegistry'];
