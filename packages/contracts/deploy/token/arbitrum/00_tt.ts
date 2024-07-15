import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import tokenVotingSetupArtifact from '../../../artifacts/src/plugins/governance/majority-voting/token/TokenVotingSetup.sol/TokenVotingSetup.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const governanceERC20Base = '0xddCc39a2a0047Eb47EdF94180452cbaB14d426EF';
  const governanceWrappedERC20Base = '0x5B3B36BdC9470963A2734D6a0d2F6a64C21C159f'
  const tokenVotingBase = '0x4f40F01b2944359A0E507b509a868C8DbFAd215B'

  // build metadata: "0x697066733a2f2f516d5a70314373446a5a544162775541576a69564c4d4c31597755737045537a6b42437374354d31484b626a646d"

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
