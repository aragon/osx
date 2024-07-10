import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import tokenVotingSetupArtifact from '../../../artifacts/src/plugins/governance/majority-voting/token/TokenVotingSetup.sol/TokenVotingSetup.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const governanceERC20Base = '0x868581Ee5991C6C08D2467132698fa4AB6C9c272';
  const governanceWrappedERC20Base = '0xCC925a32fA4fa41c42a7d5585D69C980b6Fa9342'
  const tokenVotingBase = '0xd4bfb6C688b2982A3b432F2Fc6C35117532A2C27'

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
