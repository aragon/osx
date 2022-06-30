import {promises as fs} from 'fs';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

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

export function ensLabelHash(label: string, ethers: any): string {
  return ethers.utils.id(label);
}

export function ensDomainHash(name: string, ethers: any): string {
  return ethers.utils.namehash(name);
}

export async function setupENS(hre: HardhatRuntimeEnvironment): Promise<any> {
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
  await ensRegistryContract.setSubnodeOwner(
    ensDomainHash('', ethers),
    ensLabelHash('resolver', ethers),
    deployer
  );

  const resolverNode = ensDomainHash('resolver', ethers);

  await ensRegistryContract.setResolver(resolverNode, ensResolverAddress);
  await ensResolverContract['setAddr(bytes32,address)'](
    resolverNode,
    ensResolverAddress
  );

  await ensRegistryContract.setSubnodeOwner(
    ensDomainHash('', ethers),
    ensLabelHash('eth', ethers),
    deployer
  );

  await ensRegistryContract.setSubnodeOwner(
    ensDomainHash('eth', ethers),
    ensLabelHash('dao', ethers),
    deployer
  );

  // deterministic
  const [owner] = await ethers.getSigners();
  const nonce = await owner.getTransactionCount();
  const futureAddress = ethers.utils.getContractAddress({
    from: deployer,
    nonce: nonce + 2, // next address is implementation, so we use +2 for the proxy address
  });

  await ensRegistryContract.setApprovalForAll(futureAddress, true);

  return ensRegistryAddress;
}

// exports dummy function for hardhat-deploy. Otherwise we would have to move this file
export default function () {}
