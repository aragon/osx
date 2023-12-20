import {TokenVotingSetup__factory} from '../../../typechain';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nConcluding TokenVoting Plugin Update');
  const [deployer] = await hre.ethers.getSigners();

  const TokenVotingSetupDeployment = await hre.deployments.get(
    'TokenVotingSetup'
  );
  const tokenVotingSetup = TokenVotingSetup__factory.connect(
    TokenVotingSetupDeployment.address,
    deployer
  );

  hre.aragonToVerifyContracts.push(
    await hre.deployments.get('GovernanceERC20')
  );

  hre.aragonToVerifyContracts.push(
    await hre.deployments.get('GovernanceWrappedERC20')
  );

  hre.aragonToVerifyContracts.push(TokenVotingSetupDeployment);
  hre.aragonToVerifyContracts.push({
    address: await tokenVotingSetup.implementation(),
    args: [],
  });

  hre.aragonToVerifyContracts.push();
};
export default func;
func.tags = ['TokenVotingPlugin', 'Verify', 'v1.3.0'];
