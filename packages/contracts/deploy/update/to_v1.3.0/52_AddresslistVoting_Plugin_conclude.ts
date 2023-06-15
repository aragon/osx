import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {UPDATE_INFOS} from '../../../utils/updates';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nConcluding AddresslistVoting Plugin Update');

  hre.aragonToVerifyContracts.push(
    await hre.deployments.get('AddresslistVotingSetup')
  );
};
export default func;
func.tags = ['AddresslistVotingPlugin', 'Verify'].concat(
  UPDATE_INFOS['v1_3_0'].tags
);
