import adminBuildMetadata from '../../../../src/plugins/governance/admin/build-metadata.json';
import adminReleaseMetadata from '../../../../src/plugins/governance/admin/release-metadata.json';
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
  console.log(`\nCreating admin repo.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  const {network} = hre;

  const adminReleaseCIDPath = await uploadToIPFS(
    JSON.stringify(adminReleaseMetadata),
    network.name
  );
  const adminBuildCIDPath = await uploadToIPFS(
    JSON.stringify(adminBuildMetadata),
    network.name
  );

  const adminSetupContract = await getContractAddress('AdminSetup', hre);

  await createPluginRepo(hre, 'admin');
  await populatePluginRepo(hre, 'admin', [
    {
      versionTag: [1, 1],
      pluginSetupContract: adminSetupContract,
      releaseMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`ipfs://${adminReleaseCIDPath}`)
      ),
      buildMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(`ipfs://${adminBuildCIDPath}`)
      ),
    },
  ]);
};

export default func;
func.tags = ['New', 'CreateAdminRepo'];
// skip if network is zksync
func.skip = (hre: HardhatRuntimeEnvironment) =>
  Promise.resolve(
      hre.network.name === 'zkTestnet' ||
      hre.network.name === 'zkLocalTestnet' ||
      hre.network.name === 'zkMainnet'
  );