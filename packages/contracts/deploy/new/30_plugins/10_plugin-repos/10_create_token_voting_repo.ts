import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import tokenVotingReleaseMetadata from '../../../../src/plugins/governance/majority-voting/token/release-metadata.json';
import tokenVotingBuildMetadata from '../../../../src/plugins/governance/majority-voting/token/build-metadata.json';

import {
  createPluginRepo,
  populatePluginRepo,
  getContractAddress,
  uploadToIPFS,
} from '../../../helpers';
import {ethers} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nCreating token-voting repo.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  const {network} = hre;

  const tokenVotingReleaseCIDPath = await uploadToIPFS(
    JSON.stringify(tokenVotingReleaseMetadata),
    network.name
  );
  const tokenVotingBuildCIDPath = await uploadToIPFS(
    JSON.stringify(tokenVotingBuildMetadata),
    network.name
  );

  const tokenVotingSetupContract = await getContractAddress(
    'TokenVotingSetup',
    hre
  );

  await createPluginRepo(hre, 'token-voting');
  await populatePluginRepo(hre, 'token-voting', [
    {
      versionTag: [1, 1],
      pluginSetupContract: tokenVotingSetupContract,
      releaseMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`ipfs://${tokenVotingReleaseCIDPath}`)
      ),
      buildMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`ipfs://${tokenVotingBuildCIDPath}`)
      ),
    },
  ]);
};

export default func;
func.tags = ['CreateTokenVotingRepo'];
