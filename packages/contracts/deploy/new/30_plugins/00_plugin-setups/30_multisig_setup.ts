import multisigSetupArtifact from '../../../../artifacts/src/plugins/governance/multisig/MultisigSetup.sol/MultisigSetup.json';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  await deploy('MultisigSetup', {
    contract: multisigSetupArtifact,
    from: deployer.address,
    args: [],
    log: true,
  });
};
export default func;
func.tags = ['New', 'MultisigSetup'];
