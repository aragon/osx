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

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nCreating multisig repo.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  const {network} = hre;

  const multisigReleaseCIDPath = await uploadToIPFS(
    JSON.stringify(multisigReleaseMetadata),
    network.name
  );
  const multisigBuildCIDPath = await uploadToIPFS(
    JSON.stringify(multisigBuildMetadata),
    network.name
  );

  const multisigSetupContract = await getContractAddress('MultisigSetup', hre);

  await createPluginRepo(hre, 'multisig');
  await populatePluginRepo(hre, 'multisig', [
    {
      versionTag: [1, 2],
      pluginSetupContract: multisigSetupContract,
      releaseMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`ipfs://${multisigReleaseCIDPath}`)
      ),
      buildMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`ipfs://${multisigBuildCIDPath}`)
      ),
    },
  ]);
};

export default func;
func.tags = ['CreateMultisigRepo'];
