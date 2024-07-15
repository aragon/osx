import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import tokenVotingSetupArtifact from '../../../artifacts/src/plugins/governance/majority-voting/token/TokenVotingSetup.sol/TokenVotingSetup.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const governanceERC20Base = '0xd8C229F3644576b200319cB3919B0E87716f47d8';
  const governanceWrappedERC20Base =
    '0x7870837ffe670E62d4e601393D454f1b8649F7f9';
  const tokenVotingBase = '0x908BB81ABeb86FfEa97f1b95b59c4AA8E71d84aA';

  // build metadata: "0x697066733a2f2f"

  // Deploy the TokenVotingSetup and provide the bases in the constructor
  await deploy('TokenVotingSetup', {
    contract: tokenVotingSetupArtifact,
    from: deployer.address,
    args: [tokenVotingBase, governanceERC20Base, governanceWrappedERC20Base],
    log: true,
  });
};
export default func;
func.tags = ['New', 'TokenVotingSetup'];
