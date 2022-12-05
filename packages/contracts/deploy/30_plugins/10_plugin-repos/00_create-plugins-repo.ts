import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {createPluginRepo} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nCreating plugin repos.`);

  console.warn(
    'Please make sure pluginRepo is not created more than once with the same name.'
  );

  // AllowlistVoting
  await createPluginRepo(
    hre,
    'AllowlistVoting',
    'AllowlistVotingSetup',
    [1, 0, 0],
    '0x'
  );

  // ERC20VotingSetup
  await createPluginRepo(
    hre,
    'ERC20Voting',
    'ERC20VotingSetup',
    [1, 0, 0],
    '0x'
  );

  // AdminSetup
  await createPluginRepo(hre, 'Admin', 'AdminSetup', [1, 0, 0], '0x');
};
export default func;
func.tags = ['Create_Register_Plugins'];
