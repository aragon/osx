import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getContractAddress, setupENS} from './helpers';

const ensAddresses: {[key: string]: string} = {
  mainnet: '0x314159265dD8dbb310642f98f50C066173C1259b',
  ropsten: '0x112234455C3a32FD11230C42E7Bccd4A84e02010',
  rinkeby: '0xe7410170f87102DF0055eB195163A03B7F2Bff4A',
  goerli: '0x112234455C3a32FD11230C42E7Bccd4A84e02010',
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers, getChainId, network} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const managingDAOAddress = await getContractAddress('DAO', hre);
  const node = ethers.utils.namehash('dao.eth');

  let ensRegistryAddress = ensAddresses[network.name];
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
