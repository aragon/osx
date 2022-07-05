import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const tokenFactoryAddress = await getContractAddress('TokenFactory', hre);

  const ret = await deploy('ERC20VotingFactory', {
    from: deployer,
    args: [tokenFactoryAddress],
    log: true,
  });

  // Create Repo and register on Aragon Plugin Registry
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
      'ERC20Voting',
      [1, 0, 0],
      factoryAddress,
      '0x00',
      deployer
    );
  }
};
export default func;
func.tags = ['ERC20VotingFactory'];
