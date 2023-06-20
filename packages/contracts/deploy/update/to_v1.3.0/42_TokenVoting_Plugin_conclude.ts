import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nConcluding TokenVoting Plugin Update');

  hre.aragonToVerifyContracts.push(
    await hre.deployments.get('TokenVotingSetup')
  );
};
export default func;
func.tags = ['TokenVotingPlugin', 'Verify', 'v1.3.0'];
