import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {setupENS} from '../../utils/ens';

import {
  ENS_ADDRESSES,
  getContractAddress,
  getENSAddress,
  getPublicResolverAddress,
  registerSubnodeRecord,
} from '../helpers';

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

  let daoDomainOwnerAddress = await ensRegistryContract.owner(daoNode);

  // node hasn't been registered yet
  if (daoDomainOwnerAddress === ethers.constants.AddressZero) {
    daoDomainOwnerAddress = await registerSubnodeRecord(
      daoDomain,
      deployer,
      await getENSAddress(hre),
      await getPublicResolverAddress(hre)
    );
  }
  if (daoDomainOwnerAddress != deployer) {
    throw new Error(`${daoDomain} is not owned by deployer: ${deployer}.`);
  }

  let pluginDomainOwnerAddress = await ensRegistryContract.owner(pluginNode);
  // node hasn't been registered yet
  if (pluginDomainOwnerAddress === ethers.constants.AddressZero) {
    pluginDomainOwnerAddress = await registerSubnodeRecord(
      pluginDomain,
      deployer,
      await getENSAddress(hre),
      await getPublicResolverAddress(hre)
    );
  }
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
  const daoSubdomainRegistrarAddress = await getContractAddress(
    'DAO_ENSSubdomainRegistrar',
    hre
  );

  if (
    !(await ensRegistryContract.isApprovedForAll(
      deployer,
      daoSubdomainRegistrarAddress
    ))
  ) {
    // Approving `DAO_ENSSubdomainRegistrar` address as operator of the subdoamin
    const approveTx = await ensRegistryContract.setApprovalForAll(
      daoSubdomainRegistrarAddress,
      true
    );
    await approveTx.wait();
  }

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

  if (
    !(await ensRegistryContract.isApprovedForAll(
      deployer,
      pluginSubdomainRegistrarAddress
    ))
  ) {
    // Approving `Plugin_ENSSubdomainRegistrar` address as operator of the subdoamin
    const pluginApproveTx = await ensRegistryContract.setApprovalForAll(
      pluginSubdomainRegistrarAddress,
      true
    );
    await pluginApproveTx.wait();
  }
};
export default func;
func.tags = ['ENSSubdomainRegistrar'];
