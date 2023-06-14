import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {UPDATE_INFOS} from '../../../utils/updates';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nConcluding TokenVoting Plugin Update');

  hre.aragonToVerifyContracts.push(
    await hre.deployments.get('TokenVotingSetup')
  );
};
export default func;
func.tags = ['TokenVotingPlugin', 'Verify'].concat(UPDATE_INFOS['v1_3_0'].tags);
