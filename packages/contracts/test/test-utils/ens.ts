import hre, {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {deployWithProxy} from './proxy';

import {ensDomainHash, ensLabelHash, setupENS} from '../../utils/ens';
import {
  DAO,
  ENSSubdomainRegistrar,
  ENSRegistry,
  PublicResolver,
} from '../../typechain';
import {
  ENSRegistry__factory,
  ENSSubdomainRegistrar__factory,
  PublicResolver__factory,
} from '../../typechain';
import {ARTIFACT_SOURCES} from './wrapper/Wrapper';

export async function deployENSSubdomainRegistrar(
  owner: SignerWithAddress,
  managingDao: DAO,
  domain: string
): Promise<ENSSubdomainRegistrar> {
  // TODO:GIORGI test commented
  // const ENSRegistryFactory = new ENSRegistry__factory(owner);
  // const ensRegistry = await ENSRegistryFactory.connect(owner).deploy();

  // const PublicResolverFactory = new PublicResolver__factory(owner);
  // const publicResolver = await PublicResolverFactory.connect(owner).deploy(
  //   ensRegistry.address,
  //   owner.address
  // );

  const ensRegistry = await hre.wrapper.deploy('ENSRegistry');
  const publicResolver = await hre.wrapper.deploy('PublicResolver', {
    args: [ensRegistry.address, owner.address],
  });

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

  // TODO:GIORGI test commented
  // const ENSSubdomainRegistrar = new ENSSubdomainRegistrar__factory(owner);

  // // Deploy the ENS and approve the subdomain registrar
  // const ensSubdomainRegistrar = await deployWithProxy<ENSSubdomainRegistrar>(
  //   ENSSubdomainRegistrar
  // );

  const ensSubdomainRegistrar = await hre.wrapper.deploy(
    ARTIFACT_SOURCES.ENS_SUBDOMAIN_REGISTRAR,
    {withProxy: true}
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
