import {promises as fs} from 'fs';
import {ethers} from 'hardhat';
import {BigNumberish, Contract} from 'ethers';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import IPFS from 'ipfs-http-client';

import {findEvent} from '../utils/event';
import {getMergedABI} from '../utils/abi';
import {EHRE} from '../utils/types';

// TODO: Add support for L2 such as Arbitrum. (https://discuss.ens.domains/t/register-using-layer-2/688)
// Make sure you own the ENS set in the {{NETWORK}}_ENS_DOMAIN variable in .env
export const ENS_ADDRESSES: {[key: string]: string} = {
  mainnet: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  ropsten: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  rinkeby: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // dao.eth
  goerli: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // aragon.eth
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
  return activeContracts[hre.network.name][contractName];
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
  const setDAO = await contract.callStatic.dao();
  if (setDAO !== expectedDaoAddress) {
    throw new Error(
      `${contract.address} has wrong DAO. Expected ${setDAO} to be ${expectedDaoAddress}`
    );
  }
}

export enum Operation {
  Grant,
  Revoke,
  GrantWithCondition,
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
  {operation, where, who, permission, data = '0x'}: Permission
) {
  const permissionId = ethers.utils.id(permission);
  const isGranted = await permissionManagerContract.isGranted(
    where.address,
    who.address,
    permissionId,
    data
  );
  if (!isGranted && operation === Operation.Grant) {
    throw new Error(
      `(${who.name}: ${who.address}) doesn't have ${permission} on (${where.name}: ${where.address}) in ${permissionManagerContract.address}`
    );
  }

  if (isGranted && operation === Operation.Revoke) {
    throw new Error(
      `(${who.name}: ${who.address}) has ${permission} on (${where.name}: ${where.address}) in ${permissionManagerContract.address}`
    );
  }
}

export async function managePermission(
  permissionManagerContract: ethers.Contract,
  permissions: Permission[]
): Promise<void> {
  const items = permissions.map(permission => [
    permission.operation,
    permission.where.address,
    permission.who.address,
    permission.condition || ethers.constants.AddressZero,
    ethers.utils.id(permission.permission),
  ]);

  const tx = await permissionManagerContract.applyMultiTargetPermissions(items);
  await tx.wait();

  permissions.forEach(permission => {
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

// exports dummy function for hardhat-deploy. Otherwise we would have to move this file
export default function () {}
