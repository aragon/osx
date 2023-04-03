import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {deployWithProxy} from './proxy';

import {ensDomainHash, ensLabelHash, setupENS} from '../../utils/ens';
import {
  DAO,
  ENSSubdomainRegistrar,
  ENSRegistry,
  PublicResolver,
} from '../../../typechain';

export async function deployENSSubdomainRegistrar(
  owner: SignerWithAddress,
  managingDao: DAO,
  domain: string
): Promise<ENSSubdomainRegistrar> {
  const ENSRegistryFactory = await ethers.getContractFactory('ENSRegistry');
  const ensRegistry = await ENSRegistryFactory.connect(owner).deploy();

  const PublicResolverFactory = await ethers.getContractFactory(
    'PublicResolver'
  );
  const publicResolver = await PublicResolverFactory.connect(owner).deploy(
    ensRegistry.address,
    owner.address
  );

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
    await ensRegistry.setSubnodeRecord(
      ensDomainHash(domain),
      ensLabelHash(domainNamesReversed[i + 1]),
      owner.address,
      publicResolver.address,
      0
    );
  }

  const ENSSubdomainRegistrar = await ethers.getContractFactory(
    'ENSSubdomainRegistrar'
  );

  // Deploy the ENS and approve the subdomain registrar
  const ensSubdomainRegistrar = await deployWithProxy<ENSSubdomainRegistrar>(
    ENSSubdomainRegistrar
  );
  await ensRegistry
    .connect(owner)
    .setApprovalForAll(ensSubdomainRegistrar.address, true);

  // Initialize it with the domain
  const node = ethers.utils.namehash(domain);
  await ensSubdomainRegistrar.initialize(
    managingDao.address,
    ensRegistry.address,
    node
  );

  return ensSubdomainRegistrar;
}

export async function setupResolver(
  ens: ENSRegistry,
  resolver: PublicResolver,
  owner: SignerWithAddress
) {
  await ens
    .connect(owner)
    .setSubnodeOwner(
      ensDomainHash(''),
      ensLabelHash('resolver'),
      await owner.getAddress()
    );

  const resolverNode = ensDomainHash('resolver');

  await ens.connect(owner).setResolver(resolverNode, resolver.address);
  await resolver
    .connect(owner)
    ['setAddr(bytes32,address)'](resolverNode, resolver.address);
}
