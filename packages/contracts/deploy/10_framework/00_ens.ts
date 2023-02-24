import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {ensDomainHash, ensLabelHash, setupENS} from '../../utils/ens';

import {ENS_ADDRESSES, getContractAddress} from '../helpers';

// Make sure you own the ENS set in the {{NETWORK}}_ENS_DOMAIN variable in .env
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nDeploying framework.`);

  const {deployments, getNamedAccounts, ethers, network} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  // Get `managingDAO` address.
  const managingDAOAddress = await getContractAddress('DAO', hre);

  // Prepare ENS.
  const daoDomain =
    process.env[`${network.name.toUpperCase()}_DAO_ENS_DOMAIN`] || '';
  const pluginDomain =
    process.env[`${network.name.toUpperCase()}_PLUGIN_ENS_DOMAIN`] || '';

  if (!daoDomain || !pluginDomain) {
    throw new Error('DAO or Plugin ENS domains have not been set in .env');
  }

  const officialEnsRegistryAddress = ENS_ADDRESSES[network.name];
  let ensRegistryAddress;

  if (!officialEnsRegistryAddress) {
    const ens = await setupENS([daoDomain, pluginDomain], hre);
    ensRegistryAddress = ens.address;
  } else {
    ensRegistryAddress = officialEnsRegistryAddress;
  }

  const ensRegistryContract = await ethers.getContractAt(
    'ENSRegistry',
    ensRegistryAddress
  );

  // Check if domains are owned by the deployer
  const daoNode = ethers.utils.namehash(daoDomain);
  const pluginNode = ethers.utils.namehash(pluginDomain);

  const daoDomainOwnerAddress = await ensRegistryContract.owner(daoNode);
  if (daoDomainOwnerAddress != deployer) {
    throw new Error(`${daoDomain} is not owned by deployer: ${deployer}.`);
  }

  const pluginDomainOwnerAddress = await ensRegistryContract.owner(pluginNode);
  if (pluginDomainOwnerAddress != deployer) {
    throw new Error(`${pluginDomain} is not owned by deployer: ${deployer}.`);
  }

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
          args: [managingDAOAddress, ensRegistryAddress, daoNode],
        },
      },
    },
  });

  // Get DAO's `ENSSubdomainRegistrar` contract.
  const ensSubdomainRegistrarAddress = await getContractAddress(
    'DAO_ENSSubdomainRegistrar',
    hre
  );

  // Approving `DAO_ENSSubdomainRegistrar` address as operator of the subdoamin
  const approveTx = await ensRegistryContract.setApprovalForAll(
    ensSubdomainRegistrarAddress,
    true
  );
  await approveTx.wait();

  //////////////////////// Plugin ENS //////////////////////////
  await deploy('Plugin_ENSSubdomainRegistrar', {
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
          args: [managingDAOAddress, ensRegistryAddress, pluginNode],
        },
      },
    },
  });

  // Get PluginRepoRegistry's `ENSSubdomainRegistrar` contract.
  const pluginSubdomainRegistrarAddress = await getContractAddress(
    'Plugin_ENSSubdomainRegistrar',
    hre
  );

  // Approving `Plugin_ENSSubdomainRegistrar` address as operator of the subdoamin
  const pluginApproveTx = await ensRegistryContract.setApprovalForAll(
    pluginSubdomainRegistrarAddress,
    true
  );
  await pluginApproveTx.wait();
};
export default func;
func.tags = ['ENSSubdomainRegistrar'];
