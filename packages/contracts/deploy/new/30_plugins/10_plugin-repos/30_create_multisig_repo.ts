import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import multisigReleaseMetadata from '../../../../src/plugins/governance/multisig/release-metadata.json';
import multisigBuildMetadata from '../../../../src/plugins/governance/multisig/build-metadata.json';

import {
  createPluginRepo,
  populatePluginRepo,
  getContractAddress,
  uploadToIPFS,
} from '../../../helpers';
import {ethers} from 'ethers';
import { uploadToPinata } from '@aragon/osx-commons-sdk';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nCreating multisig repo.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  if (!process.env.PUB_PINATA_JWT) {
    throw new Error('PUB_PINATA_JWT is not set');
  }

  const multisigReleaseCIDPath = await uploadToPinata(
    JSON.stringify(multisigReleaseMetadata),
    `multisigReleaseMetadata`,
    process.env.PUB_PINATA_JWT
  );

  const multisigBuildCIDPath = await uploadToPinata(
    JSON.stringify(multisigBuildMetadata),
    `multisigBuildMetadata`,
    process.env.PUB_PINATA_JWT
  );

  const multisigSetupContract = await getContractAddress('MultisigSetup', hre);

  await createPluginRepo(hre, 'multisig');
  await populatePluginRepo(hre, 'multisig', [
    {
      versionTag: [1, 2],
      pluginSetupContract: multisigSetupContract,
      releaseMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`${multisigReleaseCIDPath}`)
      ),
      buildMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`${multisigBuildCIDPath}`)
      ),
    },
  ]);
};

export default func;
func.tags = ['New', 'CreateMultisigRepo'];
