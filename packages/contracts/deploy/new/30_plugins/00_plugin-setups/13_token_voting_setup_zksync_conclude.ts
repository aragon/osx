import {TokenVotingSetup__factory} from '../../../../typechain';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {setTimeout} from 'timers/promises';
import {skipIfNotZkSync} from '../../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding token voting setup deployment.\n`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments, network} = hre;

  const TokenVotingSetupDeployment = await deployments.get('TokenVotingSetup');
  const tokenVotingSetup = TokenVotingSetup__factory.connect(
    TokenVotingSetupDeployment.address,
    deployer
  );

  hre.aragonToVerifyContracts.push({
    contract: 'src/zksync/TokenVotingSetupZkSync.sol:TokenVotingSetupZkSync',
    ...TokenVotingSetupDeployment,
  });
  hre.aragonToVerifyContracts.push({
    contract:
      'src/plugins/governance/majority-voting/token/TokenVoting.sol:TokenVoting',
    address: await tokenVotingSetup.implementation(),
    args: [],
  });
};

export default func;
func.tags = ['New', 'TokenVotingSetupZkSync', 'Verify'];
func.skip = async hre =>
  await skipIfNotZkSync(hre, 'TokenVotingSetupZkSync-Verify');
