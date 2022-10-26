import {ethers} from 'hardhat';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

export function ensLabelHash(label: string): string {
  return ethers.utils.id(label);
}

export function ensDomainHash(name: string): string {
  return ethers.utils.namehash(name);
}

export async function setupENS(
  hre: HardhatRuntimeEnvironment,
  domain: string
): Promise<any> {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const ENSRegistry = await ethers.getContractFactory('ENSRegistry');
  const PublicResolver = await ethers.getContractFactory('PublicResolver');

  // Deploy the ENSRegistry
  let ens = await ENSRegistry.deploy();
  await ens.deployed();

  // Deploy the Resolver
  let resolver = await PublicResolver.deploy(
    ens.address,
    ethers.constants.AddressZero
  );
  await resolver.deployed();

  // Register subdomains in the reverse order
  let domainNamesReversed = domain.split('.');
  domainNamesReversed.push(''); //add the root domain
  domainNamesReversed = domainNamesReversed.reverse();

  for (let i = 0; i < domainNamesReversed.length - 1; i++) {
    await ens.setSubnodeRecord(
      ensDomainHash(domainNamesReversed[i]),
      ensLabelHash(domainNamesReversed[i + 1]),
      deployer,
      resolver.address,
      0
    );
  }

  return ens;
}
