import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  await deploy('AdminSetup', {
    from: deployer.address,
    args: [],
    log: true,
  });
};
export default func;
func.tags = ['New', 'AdminSetup'];
