import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {ensDomainHash, ensLabelHash} from '../../utils/ensHelpers';
import {
  DAO,
  ENSSubdomainRegistrar,
  ENSRegistry,
  PublicResolver,
} from '../../typechain';

export async function deployENSSubdomainRegistrar(
  owner: SignerWithAddress,
  managingDao: DAO,
  domain: string
): Promise<ENSSubdomainRegistrar> {
  const ENSRegistry = await ethers.getContractFactory('ENSRegistry');
  const PublicResolver = await ethers.getContractFactory('PublicResolver');
  const ENSSubdomainRegistrar = await ethers.getContractFactory(
    'ENSSubdomainRegistrar'
  );

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
      await owner.getAddress(),
      resolver.address,
      0
    );
  }

  // Deploy the ENS and approve the subdomain registrar
  const ensSubdomainRegistrar = await ENSSubdomainRegistrar.deploy(managingDao.address);
  await ens
    .connect(owner)
    .setApprovalForAll(ensSubdomainRegistrar.address, true);

  // Initialize it with the domain
  const node = ethers.utils.namehash(domain);
  ensSubdomainRegistrar.initialize(ens.address, node);

  return ensSubdomainRegistrar;
}

async function setupResolver(
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
