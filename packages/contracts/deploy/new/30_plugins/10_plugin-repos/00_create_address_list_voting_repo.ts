import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import addresslistReleaseMetadata from '../../../../src/plugins/governance/majority-voting/addresslist/release-metadata.json';
import addresslistBuildMetadata from '../../../../src/plugins/governance/majority-voting/addresslist/build-metadata.json';

import {
  createPluginRepo,
  populatePluginRepo,
  getContractAddress,
  uploadToIPFS,
} from '../../../helpers';
import {ethers} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nCreating address-list-voting repo.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  const {network} = hre;

  const addresslistReleaseCIDPath = await uploadToIPFS(
    JSON.stringify(addresslistReleaseMetadata),
    network.name
  );
  const addresslistBuildCIDPath = await uploadToIPFS(
    JSON.stringify(addresslistBuildMetadata),
    network.name
  );

  const addresslistVotingSetupContract = await getContractAddress(
    'AddresslistVotingSetup',
    hre
  );

  await createPluginRepo(hre, 'address-list-voting');
  await populatePluginRepo(hre, 'address-list-voting', [
    {
      versionTag: [1, 1],
      pluginSetupContract: addresslistVotingSetupContract,
      releaseMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`ipfs://${addresslistReleaseCIDPath}`)
      ),
      buildMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`ipfs://${addresslistBuildCIDPath}`)
      ),
    },
  ]);
};

export default func;
func.tags = ['CreateAddresslistVotingRepo'];
