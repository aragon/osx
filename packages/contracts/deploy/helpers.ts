import {promises as fs} from 'fs';
import {ethers} from 'hardhat';
import {Contract} from 'ethers';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import IPFS from 'ipfs-http-client';

import {findEvent} from '../utils/event';
import {getMergedABI} from '../utils/abi';
import {EHRE, Operation} from '../utils/types';

// TODO: Add support for L2 such as Arbitrum. (https://discuss.ens.domains/t/register-using-layer-2/688)
// Make sure you own the ENS set in the {{NETWORK}}_ENS_DOMAIN variable in .env
export const ENS_ADDRESSES: {[key: string]: string} = {
  mainnet: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  goerli: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // aragon.eth
};

export const ENS_PUBLIC_RESOLVERS: {[key: string]: string} = {
  goerli: '0x19c2d5d0f035563344dbb7be5fd09c8dad62b001',
  mainnet: '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41',
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
    url: 'https://ipfs-0.aragon.network/api/v0',
    headers: {
      'X-API-KEY': 'yRERPRwFAb5ZiV94XvJdgvDKoGEeFerfFsAQ65',
    },
  });

  if (networkName === 'hardhat' || networkName === 'localhost') {
    // return a dummy path
    return 'QmNnobxuyCjtYgsStCPhXKEiQR5cjsc3GtG9ZMTKFTTEFJ';
  }

  const cid = await client.add(metadata);
  await client.pin.add(cid.cid);
  return cid.path;
}

export async function getContractAddress(
  contractName: string,
  hre: HardhatRuntimeEnvironment
): Promise<string> {
  const {deployments} = hre;
  try {
    const contract = await deployments.get(contractName);
    if (contract) {
      return contract.address;
    }
  } catch (e) {}

  const activeContracts = await getActiveContractsJSON();
  try {
    return activeContracts[hre.network.name][contractName];
  } catch (e) {
    console.error(e);
    return '';
  }
}

export async function getActiveContractsJSON(): Promise<{
  [index: string]: {[index: string]: string};
}> {
  const repoPath = process.env.GITHUB_WORKSPACE || '../../';
  const activeContractsFile = await fs.readFile(
    `${repoPath}/active_contracts.json`
  );
  const activeContracts = JSON.parse(activeContractsFile.toString());
  return activeContracts;
}

export async function updateActiveContractsJSON(payload: {
  [index: string]: {[index: string]: string};
}): Promise<void> {
  const repoPath = process.env.GITHUB_WORKSPACE || '../../';
  const activeContractsFile = await fs.readFile(
    `${repoPath}/active_contracts.json`
  );
  const activeContracts = JSON.parse(activeContractsFile.toString());
  Object.keys(payload).forEach(key => {
    activeContracts[key] = {...activeContracts[key], ...payload[key]};
  });

  await fs.writeFile(
    `${repoPath}/active_contracts.json`,
    JSON.stringify(activeContracts, null, 2)
  );
}

export async function detemineDeployerNextAddress(
  index: number,
  deployer: any
): Promise<string> {
  const [owner] = await ethers.getSigners();
  const nonce = await owner.getTransactionCount();
  const futureAddress = ethers.utils.getContractAddress({
    from: deployer,
    nonce: nonce + index,
  });
  return futureAddress;
}

export async function createPluginRepo(
  hre: EHRE,
  pluginContractName: string,
  pluginSetupContractName: string,
  releaseMetadata: string,
  buildMetadata: string
): Promise<void> {
  const {network} = hre;
  const pluginDomain =
    process.env[`${network.name.toUpperCase()}_PLUGIN_ENS_DOMAIN`] || '';
  if (
    await isENSDomainRegistered(
      `${pluginContractName}.${pluginDomain}`,
      await getENSAddress(hre)
    )
  ) {
    // not beeing able to register the plugin repo means that something is not right with the framework deployment used.
    // Either a fruntrun happened or something else. Thus we abort here
    throw new Error(`${pluginContractName} is already present! Aborting...`);
  }

  const signers = await ethers.getSigners();

  const managingDAOAddress = await getContractAddress('DAO', hre);
  const pluginRepoFactoryAddress = await getContractAddress(
    'PluginRepoFactory',
    hre
  );

  const {abi, bytecode} = await getMergedABI(hre, 'PluginRepoFactory', [
    'PluginRepoRegistry',
  ]);

  const pluginRepoFactoryFactory = new ethers.ContractFactory(
    abi,
    bytecode,
    signers[0]
  );
  const pluginRepoFactoryContract = pluginRepoFactoryFactory.attach(
    pluginRepoFactoryAddress
  );

  // register a plugin
  const pluginSetupAddress = await getContractAddress(
    pluginSetupContractName,
    hre
  );

  const tx = await pluginRepoFactoryContract.createPluginRepoWithFirstVersion(
    pluginContractName,
    pluginSetupAddress,
    managingDAOAddress,
    releaseMetadata,
    buildMetadata
  );
  console.log(
    `Creating & registering repo for ${pluginContractName} with tx ${tx.hash}`
  );
  await tx.wait();

  const event = await findEvent(tx, 'PluginRepoRegistered');
  const repoAddress = event.args.pluginRepo;

  hre.aragonPluginRepos[pluginContractName] = repoAddress;

  console.log(
    `Created & registered repo for ${pluginContractName} at address: ${repoAddress}, with contentURI ${ethers.utils.toUtf8String(
      releaseMetadata
    )}`
  );
}

export async function checkSetManagingDao(
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
  permissionManagerContract: ethers.Contract,
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
  permissionManagerContract: ethers.Contract,
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

export async function managePermissions(
  permissionManagerContract: ethers.Contract,
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
  ensRegistryAddress: string
): Promise<boolean> {
  const ensRegistryContract = await ethers.getContractAt(
    'ENSRegistry',
    ensRegistryAddress
  );

  return ensRegistryContract.recordExists(ethers.utils.namehash(domain));
}

export async function getENSAddress(hre: EHRE): Promise<string> {
  if (ENS_ADDRESSES[hre.network.name]) {
    return ENS_ADDRESSES[hre.network.name];
  }

  const ensDeployment = await hre.deployments.get('ENSRegistry');
  if (ensDeployment) {
    return ensDeployment.address;
  }

  throw new Error('ENS address not found.');
}

export async function getPublicResolverAddress(hre: EHRE): Promise<string> {
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
  owner: string,
  ensRegistryAddress: string,
  publicResolver: string
): Promise<string> {
  const domainSplitted = domain.split('.');
  const subdomain = domainSplitted.splice(0, 1)[0];
  const parentDomain = domainSplitted.join('.');

  const ensRegistryContract = await ethers.getContractAt(
    'ENSRegistry',
    ensRegistryAddress
  );

  const tx = await ensRegistryContract.setSubnodeRecord(
    ethers.utils.namehash(parentDomain),
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes(subdomain)),
    owner,
    publicResolver,
    0
  );
  await tx.wait();
  return ensRegistryContract.owner(ethers.utils.namehash(domain));
}

// exports dummy function for hardhat-deploy. Otherwise we would have to move this file
export default function () {}
