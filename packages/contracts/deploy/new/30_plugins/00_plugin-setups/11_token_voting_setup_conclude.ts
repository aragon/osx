import {DeployFunction} from 'hardhat-deploy/types';
import {TokenVotingSetup__factory} from '../../../../typechain';
import {setTimeout} from 'timers/promises';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding token voting setup deployment.\n`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments, network} = hre;

  const TokenVotingSetupDeployment = await deployments.get('TokenVotingSetup');
  const tokenVotingSetup = TokenVotingSetup__factory.connect(
    TokenVotingSetupDeployment.address,
    deployer
  );

  // add a timeout for polygon because the call to `implementation()` can fail for newly deployed contracts in the first few seconds
  if (network.name === 'polygon') {
    console.log(`Waiting 30secs for ${network.name} to finish up...`);
    await setTimeout(30000);
  }

  hre.aragonToVerifyContracts.push(
    await hre.deployments.get('GovernanceERC20')
  );

  hre.aragonToVerifyContracts.push(
    await hre.deployments.get('GovernanceWrappedERC20')
  );

  hre.aragonToVerifyContracts.push(await hre.deployments.get('TokenVoting'));

  hre.aragonToVerifyContracts.push({
    contract:
      'src/plugins/governance/majority-voting/token/TokenVotingSetup.sol:TokenVotingSetup',
    ...TokenVotingSetupDeployment,
  });
};

export default func;
func.tags = ['New', 'TokenVotingSetup', 'Verify'];
