import placeholderSetupArtifact from '../../../artifacts/src/framework/plugin/repo/placeholder/PlaceholderSetup.sol/PlaceholderSetup.json';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  await deploy('PlaceholderSetup', {
    contract: placeholderSetupArtifact,
    from: deployer.address,
    args: [],
    log: true,
  });

  hre.aragonToVerifyContracts.push({
    ...(await deployments.get('PlaceholderSetup')),
  });
};
export default func;
func.tags = ['New', 'PlaceholderSetup'];
