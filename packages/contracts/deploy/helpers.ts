import {promises as fs} from 'fs';
import {ethers} from 'hardhat';
import {BigNumberish} from 'ethers';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

import {findEvent} from '../test/test-utils/event';
import {getMergedABI} from '../utils/abi';

// TODO: Add support for L2 such as Arbitrum. (https://discuss.ens.domains/t/register-using-layer-2/688)
// Make sure you own the ENS set in the {{NETWORK}}_ENS_DOMAIN variable in .env
export const ENS_ADDRESSES: {[key: string]: string} = {
  mainnet: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  ropsten: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  rinkeby: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // dao.eth
  goerli: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // aragon.eth
};

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

export async function createAndRegisterPluginRepo(
  hre: HardhatRuntimeEnvironment,
  pluginContractName: string,
  pluginSetupContractName: string,
  version: [BigNumberish, BigNumberish, BigNumberish],
  contentURI: string
): Promise<void> {
  const {ethers} = hre;
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

  const tx = await pluginRepoFactoryContract.createPluginRepoWithVersion(
    pluginContractName,
    version,
    pluginSetupAddress,
    contentURI,
    managingDAOAddress
  );

  const event = await findEvent(tx, 'PluginRepoRegistered');
  const repoAddress = event.args.pluginRepo;

  console.log(
    `Created & registered repo for ${pluginContractName} with version ${version} at address: ${repoAddress}`
  );
}

// exports dummy function for hardhat-deploy. Otherwise we would have to move this file
export default function () {}
