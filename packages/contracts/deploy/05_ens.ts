import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ENS_ADDRESSES, getContractAddress, setupENS} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers, network} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const managingDAOAddress = await getContractAddress('DAO', hre);
  const node = ethers.utils.namehash('dao.eth');

  let ensRegistryAddress = ENS_ADDRESSES[network.name];
  if (!ensRegistryAddress) {
    ensRegistryAddress = await setupENS(hre);
  }

  await deploy('ENSSubdomainRegistrar', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      owner: deployer,
      proxyContract: 'UUPSProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [managingDAOAddress, ensRegistryAddress, node],
        },
      },
    },
  });
};
export default func;
func.tags = ['ManagingDao'];
