import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {
  detemineAccountNextAddress,
  ENS_ADDRESSES,
  getContractAddress,
  setupENS,
} from './helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers, network} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const managingDAOAddress = await getContractAddress('DAO', hre);

  const daoDomain =
    process.env[`${network.name.toUpperCase()}_ENS_DOMAIN`] || '';
  if (!daoDomain) throw new Error('DAO domain has not been set in .env');

  const node = ethers.utils.namehash(daoDomain);

  let ensRegistryAddress = ENS_ADDRESSES[network.name];

  if (!ensRegistryAddress) {
    ensRegistryAddress = await setupENS(hre);
  } else {
    const ensRegistryContract = await ethers.getContractAt(
      'ENSRegistry',
      ensRegistryAddress
    );

    // deterministic
    const futureAddress = await detemineAccountNextAddress(2, hre); // use 2 because next deploy will be the implementation

    const approveTx = await ensRegistryContract.setApprovalForAll(
      futureAddress,
      true
    );

    await approveTx.wait();
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
func.tags = ['ENSSubdomainRegistrar'];
