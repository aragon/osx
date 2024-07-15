import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import tokenVotingSetupArtifact from '../../../artifacts/src/plugins/governance/majority-voting/token/TokenVotingSetup.sol/TokenVotingSetup.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const governanceERC20Base = '0xA03C2182af8eC460D498108C92E8638a580b94d4';
  const governanceWrappedERC20Base =
    '0x6E924eA5864044D8642385683fFA5AD42FB687f2';
  const tokenVotingBase = '0x0749047B49B472a7f80C1c8f0a4dbBcecBc54339';

  // build metadata: "0x697066733a2f2f"

  // Deploy the TokenVotingSetup and provide the bases in the constructor
  await deploy('TokenVotingSetup', {
    contract: tokenVotingSetupArtifact,
    from: deployer.address,
    args: [tokenVotingBase, governanceERC20Base, governanceWrappedERC20Base],
    log: true,
  });

  const TokenVotingSetupDeployment = await deployments.get('TokenVotingSetup');

  hre.aragonToVerifyContracts.push({
    contract:
      'src/plugins/governance/majority-voting/token/TokenVotingSetup.sol:TokenVotingSetup',
    ...TokenVotingSetupDeployment,
  });
};
export default func;
func.tags = ['New', 'TokenVotingSetup'];
