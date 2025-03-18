import { uploadToPinata } from '@aragon/osx-commons-sdk';
import addresslistBuildMetadata from '../../../../src/plugins/governance/majority-voting/addresslist/build-metadata.json';
import addresslistReleaseMetadata from '../../../../src/plugins/governance/majority-voting/addresslist/release-metadata.json';
import {
  createPluginRepo,
  populatePluginRepo,
  getContractAddress,
  uploadToIPFS,
} from '../../../helpers';
import {ethers} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nCreating address-list-voting repo.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  if (!process.env.PUB_PINATA_JWT) {
    throw new Error('PUB_PINATA_JWT is not set');
  }

  const addresslistReleaseCIDPath = await uploadToPinata(
    JSON.stringify(addresslistReleaseMetadata),
    `addresslistReleaseMetadata`,
    process.env.PUB_PINATA_JWT
  );

  
  const addresslistBuildCIDPath = await uploadToPinata(
    JSON.stringify(addresslistBuildMetadata),
    `addresslistBuildMetadata`,
    process.env.PUB_PINATA_JWT
  );


  const addresslistVotingSetupContract = await getContractAddress(
    'AddresslistVotingSetup',
    hre
  );

  await createPluginRepo(hre, 'address-list-voting');
  await populatePluginRepo(hre, 'address-list-voting', [
    {
      versionTag: [1, 2],
      pluginSetupContract: addresslistVotingSetupContract,
      releaseMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`${addresslistReleaseCIDPath}`)
      ),
      buildMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`${addresslistBuildCIDPath}`)
      ),
    },
  ]);
};

export default func;
func.tags = ['New', 'CreateAddresslistVotingRepo'];
