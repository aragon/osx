import daoRegistryArtifact from '../../../artifacts/src/framework/dao/DAORegistry.sol/DAORegistry.json';
import {getContractAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  // Get `managementDAO` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get DAO's `ENSSubdomainRegistrar` contract.
  const ensSubdomainRegistrarAddress = await getContractAddress(
    'DAOENSSubdomainRegistrarProxy',
    hre
  );

  await deploy('DAORegistryProxy', {
    contract: daoRegistryArtifact,
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
          args: [managementDAOAddress, ensSubdomainRegistrarAddress],
        },
      },
    },
  });
};
export default func;
func.tags = ['New', 'DAORegistry', 'Batch-5'];
