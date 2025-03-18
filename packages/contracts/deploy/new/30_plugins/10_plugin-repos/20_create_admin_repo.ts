import { uploadToPinata } from '@aragon/osx-commons-sdk';
import adminBuildMetadata from '../../../../src/plugins/governance/admin/build-metadata.json';
import adminReleaseMetadata from '../../../../src/plugins/governance/admin/release-metadata.json';
import {
  createPluginRepo,
  populatePluginRepo,
  getContractAddress,
  uploadToIPFS,
  skipIfZkSync,
} from '../../../helpers';
import {ethers} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nCreating admin repo.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  if (!process.env.PUB_PINATA_JWT) {
    throw new Error('PUB_PINATA_JWT is not set');
  }

  const adminReleaseCIDPath = await uploadToPinata(
    JSON.stringify(adminReleaseMetadata),
    `adminReleaseMetadata`,
    process.env.PUB_PINATA_JWT
  );

  const adminBuildCIDPath = await uploadToPinata(
    JSON.stringify(adminBuildMetadata),
    `adminBuildMetadata`,
    process.env.PUB_PINATA_JWT
  );

  const adminSetupContract = await getContractAddress('AdminSetup', hre);

  await createPluginRepo(hre, 'admin');
  await populatePluginRepo(hre, 'admin', [
    {
      versionTag: [1, 1],
      pluginSetupContract: adminSetupContract,
      releaseMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`${adminReleaseCIDPath}`)
      ),
      buildMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`${adminBuildCIDPath}`)
      ),
    },
  ]);
};

export default func;
func.tags = ['New', 'CreateAdminRepo'];
func.skip = async hre => await skipIfZkSync(hre, 'CreateAdminRepo');
