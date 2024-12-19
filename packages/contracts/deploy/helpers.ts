import {VersionTag} from '../test/test-utils/psp/types';
import {
  ENSRegistry,
  ENSRegistry__factory,
  PluginRepoFactory__factory,
  PluginRepoRegistry__factory,
  PluginRepo__factory,
} from '../typechain';
import {VersionCreatedEvent} from '../typechain/PluginRepo';
import {PluginRepoRegisteredEvent} from '../typechain/PluginRepoRegistry';
import {isLocal, pluginDomainEnv} from '../utils/environment';
import {
  getNetworkNameByAlias,
  getLatestNetworkDeployment,
} from '@aragon/osx-commons-configs';
import {findEvent, findEventTopicLog, Operation} from '@aragon/osx-commons-sdk';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {Contract} from 'ethers';
import {ethers} from 'hardhat';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import IPFS from 'ipfs-http-client';

// TODO: Add support for L2 such as Arbitrum. (https://discuss.ens.domains/t/register-using-layer-2/688)
// Make sure you own the ENS set in the {{NETWORK}}_ENS_DOMAIN variable in .env
export const ENS_ADDRESSES: {[key: string]: string} = {
  mainnet: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  goerli: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  sepolia: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  holesky: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
};

export const ENS_PUBLIC_RESOLVERS: {[key: string]: string} = {
  goerli: '0x19c2d5d0f035563344dbb7be5fd09c8dad62b001',
  mainnet: '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41',
  sepolia: '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD',
  holesky: '0x9010A27463717360cAD99CEA8bD39b8705CCA238',
};

export const DAO_PERMISSIONS = [
  'ROOT_PERMISSION',
  'UPGRADE_DAO_PERMISSION',
  'SET_SIGNATURE_VALIDATOR_PERMISSION',
  'SET_TRUSTED_FORWARDER_PERMISSION',
  'SET_METADATA_PERMISSION',
  'REGISTER_STANDARD_CALLBACK_PERMISSION',
];

export async function uploadToIPFS(
  metadata: string,
  networkName: string
): Promise<string> {
  const client = IPFS.create({
    url: 'https://prod.ipfs.aragon.network/api/v0',
    headers: {
      'X-API-KEY': 'b477RhECf8s8sdM7XrkLBs2wHc4kCMwpbcFC55Kt',
    },
  });

  if (networkName === 'hardhat' || networkName === 'localhost') {
    // return a dummy path
    return 'QmNnobxuyCjtYgsStCPhXKEiQR5cjsc3GtG9ZMTKFTTEFJ';
  }

  const res = await client.add(metadata);
  await client.pin.add(res.cid);
  console.log(`Uploaded to IPFS with cid ${res.cid.toString()}`);
  return res.cid.toString();
}

export async function getContractAddress(
  contractName: string,
  hre: HardhatRuntimeEnvironment
): Promise<string> {
  const {deployments, network} = hre;

  let networkName = network.name;

  if (hre.testingFork.network) {
    networkName = hre.testingFork.network;
  }

  try {
    const contract = await deployments.get(contractName);
    if (contract) {
      return contract.address;
    }
  } catch (e) {}

  try {
    if (!hre.testingFork.osxVersion && !hre.testingFork.activeContracts) {
      console.log('==========================');
      console.log('Warning: osxVersion is not set');
      console.log('==========================');
    }

    const activeContracts = hre.testingFork.activeContracts;

    if (activeContracts && activeContracts[networkName][contractName]) {
      return activeContracts[networkName][contractName];
    }
  } catch (e) {}

  return getLatestContractAddress(contractName, hre);
}

export function getLatestContractAddress(
  contractName: string,
  hre: HardhatRuntimeEnvironment
): string {
  let networkName = hre.network.name;

  if (hre.testingFork.network) {
    networkName = hre.testingFork.network;
  }

  const osxNetworkName = getNetworkNameByAlias(networkName);
  if (!osxNetworkName) {
    if (isLocal(hre.network)) {
      return '';
    }
    throw new Error(`Failed to find network ${networkName}`);
  }

  const latestNetworkDeployment = getLatestNetworkDeployment(osxNetworkName);
  if (latestNetworkDeployment && contractName in latestNetworkDeployment) {
    // safe cast due to conditional above, but we return the fallback string anyhow
    const key = contractName as keyof typeof latestNetworkDeployment;
    return latestNetworkDeployment[key]?.address ?? '';
  }
  return '';
}

export async function detemineDeployerNextAddress(
  index: number,
  deployer: SignerWithAddress
): Promise<string> {
  const [owner] = await ethers.getSigners();
  const nonce = await owner.getTransactionCount();
  const futureAddress = ethers.utils.getContractAddress({
    from: deployer.address,
    nonce: nonce + index,
  });
  return futureAddress;
}

export async function checkSetManagementDao(
  contract: Contract,
  expectedDaoAddress: string
) {
  const setDAO = await contract.dao();
  if (setDAO !== expectedDaoAddress) {
    throw new Error(
      `${contract.address} has wrong DAO. Expected ${setDAO} to be ${expectedDaoAddress}`
    );
  }
}

export type Permission = {
  operation: Operation;
  where: {name: string; address: string};
  who: {name: string; address: string};
  permission: string;
  condition?: string;
  data?: string;
};

export async function checkPermission(
  permissionManagerContract: Contract,
  permission: Permission
) {
  const checkStatus = await isPermissionSetCorrectly(
    permissionManagerContract,
    permission
  );
  if (!checkStatus) {
    const {who, where, operation} = permission;
    if (operation === Operation.Grant) {
      throw new Error(
        `(${who.name}: ${who.address}) doesn't have ${permission.permission} on (${where.name}: ${where.address}) in ${permissionManagerContract.address}`
      );
    }
    throw new Error(
      `(${who.name}: ${who.address}) has ${permission.permission} on (${where.name}: ${where.address}) in ${permissionManagerContract.address}`
    );
  }
}

export async function isPermissionSetCorrectly(
  permissionManagerContract: Contract,
  {operation, where, who, permission, data = '0x'}: Permission
): Promise<boolean> {
  const permissionId = ethers.utils.id(permission);
  const isGranted = await permissionManagerContract.isGranted(
    where.address,
    who.address,
    permissionId,
    data
  );
  if (!isGranted && operation === Operation.Grant) {
    return false;
  }

  if (isGranted && operation === Operation.Revoke) {
    return false;
  }
  return true;
}

export async function registerAndTransferDomain(
  ensRegistryContract: ENSRegistry,
  managementDAOAddress: string,
  domain: string,
  node: string,
  deployer: SignerWithAddress,
  hre: HardhatRuntimeEnvironment,
  ethers: any
) {
  let owner = await ensRegistryContract.owner(node);

  // node hasn't been registered yet
  if (owner === ethers.constants.AddressZero) {
    owner = await registerSubnodeRecord(
      domain,
      deployer,
      await getENSAddress(hre),
      await getPublicResolverAddress(hre)
    );
  }

  // if (owner !== managementDAOAddress && owner !== deployer.address) {
  //   throw new Error(
  //     `${domain} is not owned either by deployer: ${deployer.address} or management dao: ${managementDAOAddress}.
  //     Check if the domain is owned by ENS wrapper and if so, unwrap it from the ENS app.`
  //   );
  // }

  // // It could be the case that domain is already owned by the management DAO which could happen
  // // if the script succeeded and is re-run again. So avoid transfer which would fail otherwise.
  // if (owner === deployer.address) {
  //   await transferSubnodeChain(
  //     domain,
  //     managementDAOAddress,
  //     deployer.address,
  //     await getENSAddress(hre)
  //   );
  // }
}

export async function managePermissions(
  permissionManagerContract: Contract,
  permissions: Permission[]
): Promise<void> {
  // filtering permission to only apply those that are needed
  const items: Permission[] = [];
  for (const permission of permissions) {
    if (await isPermissionSetCorrectly(permissionManagerContract, permission)) {
      continue;
    }
    items.push(permission);
  }

  if (items.length === 0) {
    console.log(`Contract call skipped. No permissions to set...`);
    return;
  }

  console.log(
    `Setting ${items.length} permissions. Skipped ${
      permissions.length - items.length
    }`
  );
  const tx = await permissionManagerContract.applyMultiTargetPermissions(
    items.map(item => [
      item.operation,
      item.where.address,
      item.who.address,
      item.condition || ethers.constants.AddressZero,
      ethers.utils.id(item.permission),
    ])
  );
  console.log(`Set permissions with ${tx.hash}. Waiting for confirmation...`);
  await tx.wait();

  items.forEach(permission => {
    console.log(
      `${
        permission.operation === Operation.Grant ? 'Granted' : 'Revoked'
      } the ${permission.permission} of (${permission.where.name}: ${
        permission.where.address
      }) for (${permission.who.name}: ${permission.who.address}), see (tx: ${
        tx.hash
      })`
    );
  });
}

export async function isENSDomainRegistered(
  domain: string,
  ensRegistryAddress: string,
  signer: SignerWithAddress
): Promise<boolean> {
  const ensRegistryContract = ENSRegistry__factory.connect(
    ensRegistryAddress,
    signer
  );

  return ensRegistryContract.recordExists(ethers.utils.namehash(domain));
}

export async function getENSAddress(
  hre: HardhatRuntimeEnvironment
): Promise<string> {
  if (ENS_ADDRESSES[hre.network.name]) {
    return ENS_ADDRESSES[hre.network.name];
  }

  const ensDeployment = await hre.deployments.get('ENSRegistry');
  if (ensDeployment) {
    return ensDeployment.address;
  }

  throw new Error('ENS address not found.');
}

export async function getPublicResolverAddress(
  hre: HardhatRuntimeEnvironment
): Promise<string> {
  if (ENS_PUBLIC_RESOLVERS[hre.network.name]) {
    return ENS_PUBLIC_RESOLVERS[hre.network.name];
  }

  const publicResolverDeployment = await hre.deployments.get('PublicResolver');
  if (publicResolverDeployment) {
    return publicResolverDeployment.address;
  }

  throw new Error('PublicResolver address not found.');
}

export async function registerSubnodeRecord(
  domain: string,
  owner: SignerWithAddress,
  ensRegistryAddress: string,
  publicResolver: string
): Promise<string> {
  const domainSplitted = domain.split('.');
  const subdomain = domainSplitted.splice(0, 1)[0];
  const parentDomain = domainSplitted.join('.');

  const ensRegistryContract = ENSRegistry__factory.connect(
    ensRegistryAddress,
    owner
  );
  const tx = await ensRegistryContract.setSubnodeRecord(
    ethers.utils.namehash(parentDomain),
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes(subdomain)),
    owner.address,
    publicResolver,
    0
  );
  await tx.wait();
  return ensRegistryContract.owner(ethers.utils.namehash(domain));
}

export async function transferSubnodeRecord(
  domain: string,
  newOwner: string,
  ensRegistryAddress: string
): Promise<void> {
  const domainSplitted = domain.split('.');
  const subdomain = domainSplitted.splice(0, 1)[0];
  const parentDomain = domainSplitted.join('.');

  const [deployer] = await ethers.getSigners();

  const ensRegistryContract = ENSRegistry__factory.connect(
    ensRegistryAddress,
    deployer
  );

  const tx = await ensRegistryContract.setSubnodeOwner(
    ethers.utils.namehash(parentDomain),
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes(subdomain)),
    newOwner
  );
  console.log(
    `Transfering owner of ${domain} to ${newOwner} with tx ${tx.hash}`
  );
  await tx.wait();
}

// transfers owner ship of a domain and all parent domains to a new owner if it matches the expected current owner
export async function transferSubnodeChain(
  fullDomain: string,
  newOwner: string,
  currentOwner: string,
  ensRegistryAddress: string
): Promise<void> {
  const [deployer] = await ethers.getSigners();

  const ensRegistryContract = ENSRegistry__factory.connect(
    ensRegistryAddress,
    deployer
  );

  const daoDomainSplitted = fullDomain.split('.').reverse();
  let domain = '';
  // +1 on length because we also need to check the owner of the empty domain
  for (let i = 0; i < daoDomainSplitted.length + 1; i++) {
    const domainOwner = await ensRegistryContract.callStatic.owner(
      ethers.utils.namehash(domain)
    );
    if (domainOwner !== newOwner && domainOwner === currentOwner) {
      const tx = await ensRegistryContract.setOwner(
        ethers.utils.namehash(domain),
        newOwner
      );
      console.log(
        `Changing owner of ${domain} from (currentOwner) ${domainOwner} to ${newOwner} (newOwner)`
      );
      await tx.wait();
    }

    domain = `${daoDomainSplitted[i]}.${domain}`;
    if (i === 0) {
      domain = daoDomainSplitted[i];
    }
  }
}

export async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// hh-deploy cannot process files without default exports
export default async () => {};
