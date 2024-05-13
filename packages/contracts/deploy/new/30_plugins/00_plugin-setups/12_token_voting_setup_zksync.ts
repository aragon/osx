import tokenVotingSetupArtifact from '../../../../artifacts/src/zksync/TokenVotingSetupZkSync.sol/TokenVotingSetupZkSync.json';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipIfNotZkSync} from '../../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  // Deploy the TokenVotingSetup and provide the bases in the constructor
  await deploy('TokenVotingSetup', {
    contract: tokenVotingSetupArtifact,
    from: deployer.address,
    args: [],
    log: true,
  });
};
export default func;
func.tags = ['New', 'TokenVotingSetupZkSync'];
func.skip = async hre => await skipIfNotZkSync(hre, 'TokenVotingSetupZkSync');
