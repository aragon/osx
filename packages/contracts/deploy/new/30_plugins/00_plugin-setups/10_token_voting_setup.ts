import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  await deploy('TokenVotingSetup', {
    from: deployer.address,
    args: [],
    log: true,
  });
};
export default func;
func.tags = ['TokenVotingSetup'];
