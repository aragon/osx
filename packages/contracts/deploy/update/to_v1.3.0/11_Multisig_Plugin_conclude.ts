import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {UPDATE_INFOS} from '../../../utils/updates';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nConcluding Multisig Plugin Update');

  hre.aragonToVerifyContracts.push(await hre.deployments.get('MultisigSetup'));
};
export default func;
func.tags = ['MultisigPlugin', 'Verify'].concat(UPDATE_INFOS['v1_3_0'].tags);
