import { uploadToPinata } from '@aragon/osx-commons-sdk';
import tokenVotingBuildMetadata from '../../../../src/plugins/governance/majority-voting/token/build-metadata.json';
import tokenVotingReleaseMetadata from '../../../../src/plugins/governance/majority-voting/token/release-metadata.json';
import {
  createPluginRepo,
  populatePluginRepo,
  getContractAddress,
  uploadToIPFS,
  getTokenVotingSetupAddress,
} from '../../../helpers';
import {ethers} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nCreating token-voting repo.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  if (!process.env.PUB_PINATA_JWT) {
    throw new Error('PUB_PINATA_JWT is not set');
  }

  const tokenVotingReleaseCIDPath = await uploadToPinata(
    JSON.stringify(tokenVotingReleaseMetadata),
    `tokenVotingReleaseMetadata`,
    process.env.PUB_PINATA_JWT
  );

  const tokenVotingBuildCIDPath = await uploadToPinata(
    JSON.stringify(tokenVotingBuildMetadata),
    `tokenVotingBuildMetadata`,
    process.env.PUB_PINATA_JWT
  );

  const tokenVotingSetupContract = await getTokenVotingSetupAddress(hre);

  await createPluginRepo(hre, 'token-voting');
  await populatePluginRepo(hre, 'token-voting', [
    {
      versionTag: [1, 2],
      pluginSetupContract: tokenVotingSetupContract,
      releaseMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`${tokenVotingReleaseCIDPath}`)
      ),
      buildMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`${tokenVotingBuildCIDPath}`)
      ),
    },
  ]);
};

export default func;
func.tags = ['New', 'CreateTokenVotingRepo'];
