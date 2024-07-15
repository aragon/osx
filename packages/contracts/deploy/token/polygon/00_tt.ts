import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import tokenVotingSetupArtifact from '../../../artifacts/src/plugins/governance/majority-voting/token/TokenVotingSetup.sol/TokenVotingSetup.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const governanceERC20Base = '0x644D3bA8A335F5b1a6afFe63e551306D0C933582';
  const governanceWrappedERC20Base = '0x8f2088E83F007B1567E8E1187380DFfdC83079d4'
  const tokenVotingBase = '0x8725b5f8247a0db0A5c6D86Db6Fb7A98F2Bd27f5'

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
