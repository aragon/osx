import {ethers} from 'ethers';
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

  hre.aragonToVerifyContracts.push(TokenVotingSetupDeployment);
  hre.aragonToVerifyContracts.push({
    address: await tokenVotingSetup.implementation(),
    args: [],
  });
  hre.aragonToVerifyContracts.push({
    address: await tokenVotingSetup.governanceERC20Base(),
    args: [ethers.constants.AddressZero, '', '', [[], []]],
  });
  hre.aragonToVerifyContracts.push({
    address: await tokenVotingSetup.governanceWrappedERC20Base(),
    args: [ethers.constants.AddressZero, '', ''],
  });
};

export default func;
func.tags = ['TokenVotingSetup', 'Verify'];
