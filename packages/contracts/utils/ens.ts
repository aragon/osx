import {ethers} from 'hardhat';
import {ENSRegistry__factory} from '../typechain';
import {EHRE} from './types';

export function ensLabelHash(label: string): string {
  return ethers.utils.id(label);
}

export function ensDomainHash(name: string): string {
  return ethers.utils.namehash(name);
}

export async function setupENS(domains: string[], hre: EHRE): Promise<any> {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  // Deploy the ENSRegistry
  await deploy('ENSRegistry', {
    from: deployer.address,
    args: [],
    log: true,
  });

  const ensDeployment = await deployments.get('ENSRegistry');
  const ens = ENSRegistry__factory.connect(ensDeployment.address, deployer);

  // Deploy the Resolver
  await deploy('PublicResolver', {
    from: deployer.address,
    args: [ensDeployment.address, ethers.constants.AddressZero],
  });

  const resolver = await deployments.get('PublicResolver');

  for (let i = 0; i < domains.length; i++) {
    // Register subdomains in the reverse order
    let domainNamesReversed = domains[i].split('.');
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
        deployer.address,
        resolver.address,
        0
      );
    }
  }

  return ens;
}
