import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import tokenVotingSetupArtifact from '../../../artifacts/src/plugins/governance/majority-voting/token/TokenVotingSetup.sol/TokenVotingSetup.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const governanceERC20Base = '0xC24188a73dc09aA7C721f96Ad8857B469C01dC9f';
  const governanceWrappedERC20Base = '0x7a62da7B56fB3bfCdF70E900787010Bc4c9Ca42e'
  const tokenVotingBase = '0xb261e8B006f5220D1cADEBCE5e6B63BD6dff5c6f'

  // build metadata: "0x697066733a2f2f516d6562646b4343363150724b3256775951486e3650317154666443444a3274555261504c704a50596964326f71"
  
  // Deploy the TokenVotingSetup and provide the bases in the constructor
  await deploy('TokenVotingSetup', {
    contract: tokenVotingSetupArtifact,
    from: deployer.address,
    args: [
        tokenVotingBase,
        governanceERC20Base,
        governanceWrappedERC20Base
    ],
    log: true,
  });
};
export default func;
func.tags = ['New', 'TokenVotingSetup'];
