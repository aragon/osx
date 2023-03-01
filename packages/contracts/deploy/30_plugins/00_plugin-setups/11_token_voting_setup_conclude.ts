import {ethers} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {TokenVotingSetup__factory} from '../../../typechain';
import {EHRE} from '../../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`Concluding token voting setup deployment.\n`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments} = hre;

  const TokenVotingSetupDeployment = await deployments.get('TokenVotingSetup');
  const tokenVotingSetup = TokenVotingSetup__factory.connect(
    TokenVotingSetupDeployment.address,
    deployer
  );

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
