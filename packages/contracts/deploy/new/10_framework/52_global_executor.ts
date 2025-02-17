import executorArtifact from '../../../artifacts/@aragon/osx-commons-contracts/src/executors/Executor.sol/Executor.json';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  await deploy('GlobalExecutor', {
    contract: executorArtifact,
    from: deployer.address,
    args: [],
    log: true,
  });

  hre.aragonToVerifyContracts.push({
    ...(await deployments.get('GlobalExecutor')),
  });
};
export default func;
func.tags = ['New', 'GlobalExecutor', 'Batch-10'];
