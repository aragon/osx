import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import addresslistVotingSetupArtifact from '../../../../artifacts/src/plugins/governance/majority-voting/addresslist/AddresslistVotingSetup.sol/AddresslistVotingSetup.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nDeploying plugins.`);

  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  await deploy('AddresslistVotingSetup', {
    contract: addresslistVotingSetupArtifact,
    from: deployer.address,
    args: [],
    log: true,
  });
};
export default func;
func.tags = ['AddresslistVotingSetup'];
