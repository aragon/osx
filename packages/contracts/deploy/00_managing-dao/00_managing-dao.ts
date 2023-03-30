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

  console.log(
    `ManagingDAO will be owned by the (Deployer: ${deployer}) temporarily, while the entire framework is getting deployed.` +
      ` At the final step when Multisig is available, it will be installed on managingDAO and all roles for the Deployer will be revoked.`
  );

  const initializeParams = {
    metadata: '0x',
    initialOwner: deployer,
    trustedForwarder: ethers.constants.AddressZero,
    daoURI: '0x',
  };

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
          args: [
            initializeParams.metadata,
            initializeParams.initialOwner,
            initializeParams.trustedForwarder,
            initializeParams.daoURI,
          ],
        },
      },
    },
  });
};
export default func;
func.tags = ['ManagingDao'];
