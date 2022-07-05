import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const ret = await deploy('WhitelistVotingFactory', {
    from: deployer,
    log: true,
  });

  // Create Repo and register on APM
  const factoryAddress: string = ret.receipt?.contractAddress || '';

  if (factoryAddress !== '') {
    const getPluginRepoFactoryAddress = await getContractAddress(
      'PluginRepoFactory',
      hre
    );
    const pluginRepoFactory = await ethers.getContractAt(
      'PluginRepoFactory',
      getPluginRepoFactoryAddress
    );

    await pluginRepoFactory.newPluginRepoWithVersion(
      'WhiteListVoting',
      [1, 0, 0],
      factoryAddress,
      '0x00',
      deployer
    );
  }
};
export default func;
func.tags = ['WhiteListVotingFactory'];
