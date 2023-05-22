import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nConcluding AddresslistVoting Plugin Update');

  hre.aragonToVerifyContracts.push(
    await hre.deployments.get('AddresslistVotingSetup')
  );
};
export default func;
func.tags = ['AddresslistVotingPlugin', 'Verify'];
