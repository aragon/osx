import placeholderSetupArtifact from '../../../../artifacts/@aragon/osx-commons/src/plugin/setup/placeholder/PlaceholderSetup.sol/PlaceholderSetup.json';
import {uploadToIPFS} from '../../../helpers';
import placeholderBuildMetadata from '@aragon/osx-commons/src/plugin/setup/placeholder/placeholder-build-metadata.json';
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
