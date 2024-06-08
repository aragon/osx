import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {ArtifactData, DeployFunction} from 'hardhat-deploy/types';

import targetJSON from '../../../artifacts/src/multibody/Target.sol/Target.json'

/** NOTE:
 * Create a (Managing DAO) with no Plugin, to be the owner DAO for the framework, temporarily.
 */

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nDeploying ManagingDao.`);

  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  console.log(
    `Deploying target`
  );

  await deploy('Target', {
    contract: targetJSON,
    from: deployer.address,
    args: [],
    log: true
  });
};
export default func;
func.tags = ['New', 'Target'];
