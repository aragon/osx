import alwaysTrueConditionArtifact from '../../../artifacts/@aragon/osx-commons-contracts/src/permission/condition/extensions/AlwaysTrueCondition.sol/AlwaysTrueCondition.json';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  await deploy('AlwaysTrueCondition', {
    contract: alwaysTrueConditionArtifact,
    from: deployer.address,
    args: [],
    log: true,
  });

  hre.aragonToVerifyContracts.push({
    ...(await deployments.get('AlwaysTrueCondition')),
  });
};
export default func;
func.tags = ['New', 'AlwaysTrueCondition'];
