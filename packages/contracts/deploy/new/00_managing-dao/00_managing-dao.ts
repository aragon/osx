import daoArtifactJson from '../../../artifacts/src/core/dao/DAO.sol/DAO.json';
import {ArtifactData, DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

/** NOTE:
 * Create a (Managing DAO) with no Plugin, to be the owner DAO for the framework, temporarily.
 */

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nDeploying ManagingDao.`);

  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  console.log(
    `ManagingDAO will be owned by the (Deployer: ${deployer.address}) temporarily, while the entire framework is getting deployed.` +
      ` At the final step when Multisig is available, it will be installed on managingDAO and all roles for the Deployer will be revoked.`
  );

  const initializeParams = {
    metadata: '0x',
    initialOwner: deployer.address,
    trustedForwarder: ethers.constants.AddressZero,
    daoURI: '0x',
  };

  const daoArtifactData = daoArtifactJson as ArtifactData;

  await deploy('DAO', {
    contract: daoArtifactData,
    from: deployer.address,
    args: [],
    log: true,
    proxy: {
      owner: deployer.address,
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
func.tags = ['New', 'ManagingDao'];
