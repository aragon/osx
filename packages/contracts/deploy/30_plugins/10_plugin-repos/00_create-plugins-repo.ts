import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import addresslistMetadata from '../../../contracts/voting/addresslist/metadata.json';
import adminMetadata from '../../../contracts/voting/admin/metadata.json';
import multisigMetadata from '../../../contracts/voting/multisig/metadata.json';
import tokenMetadata from '../../../contracts/voting/token/metadata.json';
import {createPluginRepo, uploadToIPFS} from '../../helpers';
import {ethers} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nCreating plugin repos.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  const {network} = hre;

  // AddresslistVotingSetup
  const addresslistCIDPath = await uploadToIPFS(
    JSON.stringify(addresslistMetadata),
    network.name
  );
  await createPluginRepo(
    hre,
    'AddresslistVoting',
    'AddresslistVotingSetup',
    ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(`ipfs://${addresslistCIDPath}`)
    )
  );

  // TokenVotingSetup
  const tokenCIDPath = await uploadToIPFS(
    JSON.stringify(tokenMetadata),
    network.name
  );
  await createPluginRepo(
    hre,
    'TokenVoting',
    'TokenVotingSetup',
    ethers.utils.hexlify(ethers.utils.toUtf8Bytes(`ipfs://${tokenCIDPath}`))
  );

  // AdminSetup
  const adminCIDPath = await uploadToIPFS(
    JSON.stringify(adminMetadata),
    network.name
  );
  await createPluginRepo(
    hre,
    'Admin',
    'AdminSetup',
    ethers.utils.hexlify(ethers.utils.toUtf8Bytes(`ipfs://${adminCIDPath}`))
  );

  // MultisigSetup
  const multisigCIDPath = await uploadToIPFS(
    JSON.stringify(multisigMetadata),
    network.name
  );
  await createPluginRepo(
    hre,
    'Multisig',
    'MultisigSetup',
    ethers.utils.hexlify(ethers.utils.toUtf8Bytes(`ipfs://${multisigCIDPath}`))
  );
};
export default func;
func.tags = ['Create_Register_Plugins'];
