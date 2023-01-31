import {ethers} from 'hardhat';

export function ensLabelHash(label: string): string {
  return ethers.utils.id(label);
}

export function ensDomainHash(name: string): string {
  return ethers.utils.namehash(name);
}

export async function setupENS(deployer: any, domain: string): Promise<any> {
  const ENSRegistry = await ethers.getContractFactory('ENSRegistry');
  const PublicResolver = await ethers.getContractFactory('PublicResolver');

  // Deploy the ENSRegistry
  const ens = await ENSRegistry.deploy();
  await ens.deployed();

  // Deploy the Resolver
  const resolver = await PublicResolver.deploy(
    ens.address,
    ethers.constants.AddressZero
  );
  await resolver.deployed();

  // Register subdomains in the reverse order
  let domainNamesReversed = domain.split('.');
  domainNamesReversed.push(''); //add the root domain
  domainNamesReversed = domainNamesReversed.reverse();

  for (let i = 0; i < domainNamesReversed.length - 1; i++) {
    // to support subdomains
    const domain = domainNamesReversed
      .map((value, index) => (index <= i ? value : ''))
      .filter(value => value !== '')
      .reverse()
      .join('.');
    await ens.setSubnodeRecord(
      ensDomainHash(domain),
      ensLabelHash(domainNamesReversed[i + 1]),
      deployer,
      resolver.address,
      0
    );
  }

  return ens;
}
