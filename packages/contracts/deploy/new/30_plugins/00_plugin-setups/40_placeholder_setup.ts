import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {uploadToIPFS} from '../../../helpers';
import {uploadToPinata} from '@aragon/osx-commons-sdk';

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

  let metadataCIDPath = '0x';
  
  if (!process.env.PUB_PINATA_JWT) {
    throw new Error('PUB_PINATA_JWT is not set');
  }

  // Upload the metadata to IPFS
  metadataCIDPath = await uploadToPinata(
    JSON.stringify(placeholderBuildMetadata),
    `placeholderBuildMetadata`,
    process.env.PUB_PINATA_JWT
  );

  hre.placeholderBuildCIDPath = metadataCIDPath
};

export default func;
func.tags = ['New', 'PlaceholderSetup'];
