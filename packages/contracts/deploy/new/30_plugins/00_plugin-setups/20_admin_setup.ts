import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import adminSetupArtifact from '../../../../artifacts/src/plugins/governance/admin/AdminSetup.sol/AdminSetup.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  await deploy('AdminSetup', {
    contract: adminSetupArtifact,
    from: deployer.address,
    args: [],
    log: true,
  });
};
export default func;
func.tags = ['New', 'AdminSetup'];
