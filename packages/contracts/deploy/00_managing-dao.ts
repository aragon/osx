import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

/** NOTE:
 * Create an Admin Dao with no Plugin, to be the owner of Dao and Apm registry.
 */

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy, save} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('DAO', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      owner: deployer,
      proxyContract: 'UUPSProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: ['0x00', deployer, ethers.constants.AddressZero],
        },
      },
    },
  });
};
export default func;
func.tags = ['ManagingDao'];
