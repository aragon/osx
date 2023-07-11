import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {UPDATE_INFOS} from '../../../utils/updates';
import {MultisigSetup__factory} from '../../../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nConcluding Multisig Plugin Update');
  const [deployer] = await hre.ethers.getSigners();

  const MultisigSetupDeployment = await hre.deployments.get('MultisigSetup');
  const multisigSetup = MultisigSetup__factory.connect(
    MultisigSetupDeployment.address,
    deployer
  );

  hre.aragonToVerifyContracts.push(MultisigSetupDeployment);
  hre.aragonToVerifyContracts.push({
    address: await multisigSetup.implementation(),
    args: [],
  });
};
export default func;
func.tags = ['MultisigPlugin', 'Verify'].concat(UPDATE_INFOS['v1_3_0'].tags);
