import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {ensDomainHash, ensLabelHash} from '../../utils/ensHelpers';
import {
  DAO,
  ENSSubdomainRegistrar,
  ENSRegistry,
  PublicResolver,
  PluginRepoRegistry,
  PluginSetupV1Mock,
} from '../../typechain';

export async function deployNewDAO(ownerAddress: any): Promise<any> {
  const DAO = await ethers.getContractFactory('DAO');
  let dao = await DAO.deploy();
  await dao.initialize('0x00', ownerAddress, ethers.constants.AddressZero);

  return dao;
}

export async function deployMockPluginSetup(): Promise<PluginSetupV1Mock> {
  const PluginSetupMock = await ethers.getContractFactory('PluginSetupV1Mock');
  const pluginSetupMockContract = await PluginSetupMock.deploy();

  return pluginSetupMockContract;
}

export async function deployNewPluginRepo(ownerAddress: any): Promise<any> {
  const PluginRepo = await ethers.getContractFactory('PluginRepo');
  const newPluginRepo = await PluginRepo.deploy();
  await newPluginRepo.initialize(ownerAddress);

  return newPluginRepo;
}

export async function deployPluginRepoFactory(
  signers: SignerWithAddress[],
  pluginRepoRegistry: PluginRepoRegistry
): Promise<any> {
  // @ts-ignore
  const PluginRepoRegistryArtifact = await hre.artifacts.readArtifact(
    'PluginRepoRegistry'
  );
  // @ts-ignore
  const PluginRepoFactoryArtifact = await hre.artifacts.readArtifact(
    'PluginRepoFactory'
  );

  const _merged = [
    ...PluginRepoFactoryArtifact.abi,
    ...PluginRepoRegistryArtifact.abi.filter((f: any) => f.type === 'event'),
  ];

  // remove duplicated events
  const mergedAbi = _merged.filter(
    (value, index, self) =>
      index === self.findIndex(event => event.name === value.name)
  );

  // PluginRepoFactory
  const PluginRepoFactory = new ethers.ContractFactory(
    mergedAbi,
    PluginRepoFactoryArtifact.bytecode,
    signers[0]
  );

  const pluginRepoFactory = await PluginRepoFactory.deploy(
    pluginRepoRegistry.address
  );

  return pluginRepoFactory;
}

export async function deployPluginRepoRegistry(
  managingDao: DAO,
  ensSubdomainRegistrar: ENSSubdomainRegistrar
): Promise<PluginRepoRegistry> {
  let pluginRepoRegistry: PluginRepoRegistry;

  const PluginRepoRegistry = await ethers.getContractFactory(
    'PluginRepoRegistry'
  );
  pluginRepoRegistry = await PluginRepoRegistry.deploy();
  await pluginRepoRegistry.initialize(
    managingDao.address,
    ensSubdomainRegistrar.address
  );

  return pluginRepoRegistry;
}

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
  const ensSubdomainRegistrar = await ENSSubdomainRegistrar.deploy();
  await ens
    .connect(owner)
    .setApprovalForAll(ensSubdomainRegistrar.address, true);

  // Initialize it with the domain
  const node = ethers.utils.namehash(domain);
  ensSubdomainRegistrar.initialize(managingDao.address, ens.address, node);

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
