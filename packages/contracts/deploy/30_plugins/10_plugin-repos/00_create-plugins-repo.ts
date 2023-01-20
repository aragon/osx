import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import addresslistMetadata from '../../../contracts/voting/addresslist/metadata.json';
import adminMetadata from '../../../contracts/voting/admin/metadata.json';
import multisigMetadata from '../../../contracts/voting/multisig/metadata.json';
import tokenMetadata from '../../../contracts/voting/token/metadata.json';
import {createPluginRepo, uploadToIPFS} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nCreating plugin repos.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  // AddresslistVotingSetup
  const addresslistCID = await uploadToIPFS(addresslistMetadata);
  await createPluginRepo(
    hre,
    'AddresslistVoting',
    'AddresslistVotingSetup',
    [1, 0, 0],
    addresslistCID
  );

  // TokenVotingSetup
  const tokenCID = await uploadToIPFS(tokenMetadata);
  await createPluginRepo(
    hre,
    'TokenVoting',
    'TokenVotingSetup',
    [1, 0, 0],
    tokenCID
  );

  // AdminSetup
  const adminCID = await uploadToIPFS(adminMetadata);
  await createPluginRepo(hre, 'Admin', 'AdminSetup', [1, 0, 0], adminCID);

  // MultisigSetup
  const multisigCID = await uploadToIPFS(multisigMetadata);
  await createPluginRepo(
    hre,
    'Multisig',
    'MultisigSetup',
    [1, 0, 0],
    multisigCID
  );
};
export default func;
func.tags = ['Create_Register_Plugins'];
