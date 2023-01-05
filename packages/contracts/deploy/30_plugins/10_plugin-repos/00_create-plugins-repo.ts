import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {createPluginRepo} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nCreating plugin repos.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  // AddresslistVotingSetup
  await createPluginRepo(
    hre,
    'AddresslistVoting',
    'AddresslistVotingSetup',
    [1, 0, 0],
    '0x'
  );

  // TokenVotingSetup
  await createPluginRepo(
    hre,
    'TokenVoting',
    'TokenVotingSetup',
    [1, 0, 0],
    '0x'
  );

  // AdminSetup
  await createPluginRepo(hre, 'Admin', 'AdminSetup', [1, 0, 0], '0x');

  // MultisigSetup
  await createPluginRepo(hre, 'Multisig', 'MultisigSetup', [1, 0, 0], '0x');
};
export default func;
func.tags = ['Create_Register_Plugins'];
