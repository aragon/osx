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
import {ensDomainHash, ensLabelHash} from '../../utils/ens';
import {deployWithProxy} from '../test-utils/proxy';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {Address} from 'hardhat-deploy/types';

export async function deployENSSubdomainRegistrar(
  owner: SignerWithAddress,
  managingDao: DAO,
  daoRegistry: Address,
  pluginRepoRegistry: Address,
  domain: string
): Promise<ENSSubdomainRegistrar> {
  const ENSRegistryFactory = new ENSRegistry__factory(owner);
  const ensRegistry = await ENSRegistryFactory.connect(owner).deploy();

  const PublicResolverFactory = new PublicResolver__factory(owner);
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

  const ENSSubdomainRegistrar = new ENSSubdomainRegistrar__factory(owner);

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
    daoRegistry,
    pluginRepoRegistry,
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
