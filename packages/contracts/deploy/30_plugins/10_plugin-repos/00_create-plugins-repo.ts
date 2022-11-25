import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {createPluginRepo} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nCreating plugin repos.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  // AddresslistVoting
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
};
export default func;
func.tags = ['Create_Register_Plugins'];
