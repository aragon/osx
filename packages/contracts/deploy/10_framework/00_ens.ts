import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {setupENS} from '../../utils/ens';

import {
  detemineDeployerNextAddress,
  ENS_ADDRESSES,
  getContractAddress,
} from '../helpers';

// Make sure you own the ENS set in the {{NETWORK}}_ENS_DOMAIN variable in .env
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nDeploying framework.`);

  const {deployments, getNamedAccounts, ethers, network} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  // Get managing DAO address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Prepare ENS.
  const daoDomain =
    process.env[`${network.name.toUpperCase()}_ENS_DOMAIN`] || '';

  if (!daoDomain) throw new Error('DAO domain has not been set in .env');

  console.log(
    `Using domain of "${daoDomain}", that it is owned by the deployer ${deployer}.`
  );

  const node = ethers.utils.namehash(daoDomain);

  let ensRegistryAddress = ENS_ADDRESSES[network.name];

  if (!ensRegistryAddress) {
    const ens = await setupENS(deployer, daoDomain);
    ensRegistryAddress = ens.address;
  }

  const ensRegistryContract = await ethers.getContractAt(
    'ENSRegistry',
    ensRegistryAddress
  );

  // Approving future `ENSSubdomainRegistrar` address
  // by using index 2, because the next deploy will be the logic address.
  const futureAddress = await detemineDeployerNextAddress(2, deployer);
  const approveTx = await ensRegistryContract.setApprovalForAll(
    futureAddress,
    true
  );
  await approveTx.wait();

  await deploy('DAO_ENSSubdomainRegistrar', {
    contract: 'ENSSubdomainRegistrar',
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
          args: [managingDAOAddress, ensRegistryAddress, node],
        },
      },
    },
  });
};
export default func;
func.tags = ['ENSSubdomainRegistrar'];
