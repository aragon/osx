import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import addresslistReleaseMetadata from '../../../src/plugins/governance/majority-voting/addresslist/release-metadata.json';
import addresslistBuildMetadata from '../../../src/plugins/governance/majority-voting/addresslist/build-metadata.json';
import adminReleaseMetadata from '../../../src/plugins/governance/admin/release-metadata.json';
import adminBuildMetadata from '../../../src/plugins/governance/admin/build-metadata.json';
import multisigReleaseMetadata from '../../../src/plugins/governance/multisig/release-metadata.json';
import multisigBuildMetadata from '../../../src/plugins/governance/multisig/build-metadata.json';
import tokenReleaseMetadata from '../../../src/plugins/governance/majority-voting/token/release-metadata.json';
import tokenBuildMetadata from '../../../src/plugins/governance/majority-voting/token/build-metadata.json';
import {createPluginRepo, uploadToIPFS} from '../../helpers';
import {ethers} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nCreating plugin repos.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  const {network} = hre;

  // AddresslistVotingSetup
  const addresslistReleaseCIDPath = await uploadToIPFS(
    JSON.stringify(addresslistReleaseMetadata),
    network.name
  );
  const addresslistBuildCIDPath = await uploadToIPFS(
    JSON.stringify(addresslistBuildMetadata),
    network.name
  );
  await createPluginRepo(
    hre,
    'address-list-voting',
    'AddresslistVotingSetup',
    ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(`ipfs://${addresslistReleaseCIDPath}`)
    ),
    ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(`ipfs://${addresslistBuildCIDPath}`)
    )
  );

  // TokenVotingSetup
  const tokenReleaseCIDPath = await uploadToIPFS(
    JSON.stringify(tokenReleaseMetadata),
    network.name
  );
  const tokenBuildCIDPath = await uploadToIPFS(
    JSON.stringify(tokenBuildMetadata),
    network.name
  );
  await createPluginRepo(
    hre,
    'token-voting',
    'TokenVotingSetup',
    ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(`ipfs://${tokenReleaseCIDPath}`)
    ),
    ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(`ipfs://${tokenBuildCIDPath}`)
    )
  );

  // AdminSetup
  const adminReleaseCIDPath = await uploadToIPFS(
    JSON.stringify(adminReleaseMetadata),
    network.name
  );
  const adminBuildCIDPath = await uploadToIPFS(
    JSON.stringify(adminBuildMetadata),
    network.name
  );
  await createPluginRepo(
    hre,
    'admin',
    'AdminSetup',
    ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(`ipfs://${adminReleaseCIDPath}`)
    ),
    ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(`ipfs://${adminBuildCIDPath}`)
    )
  );

  // MultisigSetup
  const multisigReleaseCIDPath = await uploadToIPFS(
    JSON.stringify(multisigReleaseMetadata),
    network.name
  );
  const multisigBuildCIDPath = await uploadToIPFS(
    JSON.stringify(multisigBuildMetadata),
    network.name
  );
  await createPluginRepo(
    hre,
    'multisig',
    'MultisigSetup',
    ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(`ipfs://${multisigReleaseCIDPath}`)
    ),
    ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(`ipfs://${multisigBuildCIDPath}`)
    )
  );
};
export default func;
func.tags = ['Create_Register_Plugins'];
