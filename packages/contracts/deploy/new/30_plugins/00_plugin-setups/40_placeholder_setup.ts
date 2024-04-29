import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {uploadToIPFS} from '../../../helpers';

import placeholderSetupArtifact from '../../../../artifacts/src/plugins/placeholder-version/PlaceholderSetup.sol/PlaceholderSetup.json';
import placeholderBuildMetadata from '../../../../src/plugins/placeholder-version/build-metadata.json';

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
