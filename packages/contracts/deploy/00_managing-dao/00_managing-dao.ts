import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

/** NOTE:
 * Create a (Managing DAO) with no Plugin, to be the owner DAO for the framework, temporarily.
 */

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nDeploying ManagingDao.`);

  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy('DAO', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      owner: deployer,
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
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
