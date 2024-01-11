import placeholderSetupArtifact from '../../../../artifacts/src/framework/plugin/repo/placeholder/PlaceholderSetup.sol/PlaceholderSetup.json';
import placeholderBuildMetadata from '../../../../src/framework/plugin/repo/placeholder/placeholder-build-metadata.json';
import {uploadToIPFS} from '../../../helpers';
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

  const {network} = hre;

  hre.placeholderBuildCIDPath = await uploadToIPFS(
    JSON.stringify(placeholderBuildMetadata),
    network.name
  );
};

export default func;
func.tags = ['New', 'PlaceholderSetup'];
