import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {ensDomainHash, ensLabelHash, setupENS} from '../../utils/ens';

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
    process.env[`${network.name.toUpperCase()}_DAO_ENS_DOMAIN`] || '';

  if (!daoDomain) throw new Error('DAO domain has not been set in .env');

  const daoNode = ethers.utils.namehash(daoDomain);

  const officialEnsRegistryAddress = ENS_ADDRESSES[network.name];
  let ensRegistryAddress;

  if (!officialEnsRegistryAddress) {
    const ens = await setupENS(deployer, daoDomain);
    ensRegistryAddress = ens.address;
  } else {
    ensRegistryAddress = officialEnsRegistryAddress;
  }

  const ensRegistryContract = await ethers.getContractAt(
    'ENSRegistry',
    ensRegistryAddress
  );

  // Check if domain is owned by the deployer
  const daoDomainOwnerAddress = await ensRegistryContract.owner(daoNode);
  if (daoDomainOwnerAddress != deployer) {
    throw new Error(`${daoDomain} is not owned by deployer: ${deployer}.`);
  }

  console.log(
    `Using domain of "${daoDomain}", that it is owned by the deployer ${deployer}.`
  );

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
  const pluginDomain =
    process.env[`${network.name.toUpperCase()}_PLUGIN_ENS_DOMAIN`] || '';

  if (!officialEnsRegistryAddress) {
    // Deploy the Resolver
    const PublicResolver = await ethers.getContractFactory('PublicResolver');
    const resolver = await PublicResolver.deploy(
      ensRegistryContract.address,
      ethers.constants.AddressZero
    );
    await resolver.deployed();

    // Register subdomains in the reverse order
    let domainNamesReversed = pluginDomain.split('.');
    domainNamesReversed = domainNamesReversed.reverse();

    for (let i = 0; i < domainNamesReversed.length - 1; i++) {
      await ensRegistryContract.setSubnodeRecord(
        ensDomainHash(domainNamesReversed[i]),
        ensLabelHash(domainNamesReversed[i + 1]),
        deployer,
        resolver.address,
        0
      );
    }
  }

  const pluginNode = ethers.utils.namehash(pluginDomain);

  // Check if domain is owned by the deployer
  const pluginDomainOwnerAddress = await ensRegistryContract.owner(pluginNode);
  if (pluginDomainOwnerAddress != deployer) {
    throw new Error(`${pluginDomain} is not owned by deployer: ${deployer}.`);
  }

  console.log(
    `Using domain of "${pluginDomain}", that it is owned by the deployer ${deployer}.`
  );

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
