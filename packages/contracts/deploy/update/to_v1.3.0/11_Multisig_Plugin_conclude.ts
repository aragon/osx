import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nConcluding Multisig Plugin Update');

  hre.aragonToVerifyContracts.push(await hre.deployments.get('MultisigSetup'));
};
export default func;
func.tags = ['MultisigPlugin', 'Verify'];
