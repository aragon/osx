import {promises as fs} from 'fs';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

import {ensLabelHash, ensDomainHash} from '../utils/ensHelpers';

// TODO: Add support for L2 such as Arbitrum. (https://discuss.ens.domains/t/register-using-layer-2/688)
export const ENS_ADDRESSES: {[key: string]: string} = {
  mainnet: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  ropsten: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  rinkeby: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
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

export async function setupENS(
  hre: HardhatRuntimeEnvironment,
  subDomain: string
): Promise<any> {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const ensRet = await deploy('ENSRegistry', {
    from: deployer,
    log: true,
  });
  const ensRegistryAddress: string = ensRet.receipt?.contractAddress || '';

  const ensResolverRet = await deploy('PublicResolver', {
    from: deployer,
    args: [ensRegistryAddress, ethers.constants.AddressZero],
    log: true,
  });
  const ensResolverAddress: string =
    ensResolverRet.receipt?.contractAddress || '';

  // setup resolver
  const ensRegistryContract = await ethers.getContractAt(
    'ENSRegistry',
    ensRegistryAddress
  );
  const ensResolverContract = await ethers.getContractAt(
    'PublicResolver',
    ensResolverAddress
  );
  const setSubnodeOwnerTx = await ensRegistryContract.setSubnodeOwner(
    ensDomainHash(''),
    ensLabelHash('resolver'),
    deployer
  );
  await setSubnodeOwnerTx.wait();

  const resolverNode = ensDomainHash('resolver');

  const setResolverTx = await ensRegistryContract.setResolver(
    resolverNode,
    ensResolverAddress
  );
  await setResolverTx.wait();

  await ensResolverContract['setAddr(bytes32,address)'](
    resolverNode,
    ensResolverAddress
  );

  // make the deployer owning the root ('') the owner of the subdomain 'eth'
  const setSubnodeOwnerETH = await ensRegistryContract.setSubnodeOwner(
    ensDomainHash(''),
    ensLabelHash('eth'),
    deployer
  );
  await setSubnodeOwnerETH.wait();

  // make the deployer owning the domain 'eth' the owner of the subdomain 'dao.eth'
  const setSubnodeOwnerDAO = await ensRegistryContract.setSubnodeOwner(
    ensDomainHash('eth'),
    ensLabelHash(subDomain),
    deployer
  );
  await setSubnodeOwnerDAO.wait();

  // deterministic
  const futureAddress = await detemineAccountNextAddress(2, hre);
  const setApprovalForAll = await ensRegistryContract.setApprovalForAll(
    futureAddress,
    true
  );
  await setApprovalForAll.wait();

  return ensRegistryAddress;
}

export async function detemineAccountNextAddress(
  index: number,
  hre: HardhatRuntimeEnvironment
): Promise<string> {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const [owner] = await ethers.getSigners();
  const nonce = await owner.getTransactionCount();
  const futureAddress = ethers.utils.getContractAddress({
    from: deployer,
    nonce: nonce + index,
  });
  return futureAddress;
}

// exports dummy function for hardhat-deploy. Otherwise we would have to move this file
export default function () {}
