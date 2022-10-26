import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {createAndRegisterPluginRepo} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // AllowlistVoting
  await createAndRegisterPluginRepo(
    hre,
    'AllowlistVoting',
    'AllowlistVotingSetup',
    [1, 0, 0],
    '0x'
  );

  // ERC20VotingSetup
  await createAndRegisterPluginRepo(
    hre,
    'ERC20Voting',
    'ERC20VotingSetup',
    [1, 0, 0],
    '0x'
  );
};
export default func;
func.tags = ['Create_Register_Plugins'];
