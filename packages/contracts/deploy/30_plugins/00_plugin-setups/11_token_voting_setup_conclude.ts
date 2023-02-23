import { ethers } from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import { TokenVotingSetup__factory } from '../../../typechain';
import {EHRE} from '../../../utils/types';

const func: DeployFunction = async function (hre: EHRE) {
  console.log(`\nConcluding token voting setup deployment.`);
  const [deployer] = await hre.ethers.getSigners();

  const {deployments} = hre;

  const TokenVotingSetupDeployment = await deployments.get('TokenVotingSetup');
  const tokenVotingSetup = await TokenVotingSetup__factory.connect(
    TokenVotingSetupDeployment.address,
    deployer
  );

  hre.aragonToVerfiyContracts.push(TokenVotingSetupDeployment);
  hre.aragonToVerfiyContracts.push({
    address: await tokenVotingSetup.implementation(),
    args: []
  });
  hre.aragonToVerfiyContracts.push({
    address: await tokenVotingSetup.governanceERC20Base(),
    args: [ethers.constants.AddressZero, "", "", [ethers.constants.AddressZero, ethers.constants.AddressZero]]
  });
  hre.aragonToVerfiyContracts.push({
    address: await tokenVotingSetup.governanceWrappedERC20Base(),
    args: [ethers.constants.AddressZero, "", ""]
  });
};

export default func;
func.tags = ['TokenVotingSetup'];
