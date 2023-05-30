import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress} from '../../helpers';

import daoRegistryArtifact from '../../../artifacts/src/framework/dao/DAORegistry.sol/DAORegistry.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Get DAO's `ENSSubdomainRegistrar` contract.
  const ensSubdomainRegistrarAddress = await getContractAddress(
    'DAO_ENSSubdomainRegistrar',
    hre
  );

  await deploy('DAORegistry', {
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
          args: [managingDAOAddress, ensSubdomainRegistrarAddress],
        },
      },
    },
  });
};
export default func;
func.tags = ['New', 'DAORegistry'];
