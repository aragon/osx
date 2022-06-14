import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {customError} from '../test-utils/custom-error-helper';

import {
  ENSSubdomainRegistrar,
  DAO,
  PublicResolver,
  ENSRegistry,
} from '../../typechain';

function labelhash(label: string): string {
  return ethers.utils.id(label);
}

function namehash(name: string): string {
  return ethers.utils.namehash(name);
}

const REGISTER_ENS_SUBDOMAIN_ROLE = ethers.utils.id(
  'REGISTER_ENS_SUBDOMAIN_ROLE'
);

async function setupResolver(
  ens: ENSRegistry,
  resolver: PublicResolver,
  owner: SignerWithAddress
) {
  await ens
    .connect(owner)
    .setSubnodeOwner(
      namehash(''),
      labelhash('resolver'),
      await owner.getAddress()
    );

  const resolverNode = namehash('resolver');

  await ens.connect(owner).setResolver(resolverNode, resolver.address);
  await resolver
    .connect(owner)
    ['setAddr(bytes32,address)'](resolverNode, resolver.address);
}

async function setupENS(
  owner: SignerWithAddress
): Promise<[ENSRegistry, PublicResolver]> {
  const ENSRegistry = await ethers.getContractFactory('ENSRegistry');
  const PublicResolver = await ethers.getContractFactory('PublicResolver');

  // ENSRegistry
  let ens = await ENSRegistry.connect(owner).deploy();
  await ens.deployed();

  // Resolver
  let resolver = await PublicResolver.connect(owner).deploy(
    ens.address,
    ethers.constants.AddressZero
  );
  await resolver.deployed();
  await setupResolver(ens, resolver, owner);

  return [ens, resolver];
}

describe.only('ENSSubdomainRegistrar', function () {
  let signers: SignerWithAddress[];
  let dao: DAO;
  let ens: ENSRegistry;
  let resolver: PublicResolver;
  let subdomainRegistrar: ENSSubdomainRegistrar;

  // A Helper function to register a subdomain under parent domain
  async function registerSubdomainHelper(
    subdomain: string,
    domain: string,
    domainOwner: SignerWithAddress,
    subdomainOwnerAddress: string
  ) {
    let fullDomain: string;
    if (domain === '') {
      fullDomain = subdomain;
    } else {
      fullDomain = subdomain + '.' + domain;
    }

    let tx = await ens
      .connect(domainOwner)
      .setSubnodeRecord(
        namehash(domain),
        labelhash(subdomain),
        subdomainOwnerAddress,
        resolver.address,
        0
      );
    await tx.wait();

    // Verify that the subdomain is owned by the correct address
    expect(await ens.owner(namehash(fullDomain))).to.equal(
      subdomainOwnerAddress
    );
    // Verify that that the subdomain's resolver address is set correctly
    expect(await ens.resolver(namehash(fullDomain))).to.equal(resolver.address);
  }

  beforeEach(async () => {
    signers = await ethers.getSigners();
    const dummyMetadata = '0x';

    // Setup ENS with signers[0] owning the the ENS root node ('') and the resolver node ('resolver')
    [ens, resolver] = await setupENS(signers[0]);

    // create a DAO
    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize(
      dummyMetadata,
      await signers[0].getAddress(),
      ethers.constants.AddressZero
    );

    // Create the registrar to be tested
    const ENSSubdomainRegistrar = await ethers.getContractFactory(
      'ENSSubdomainRegistrar'
    );
    subdomainRegistrar = await ENSSubdomainRegistrar.deploy();
  });

  describe('initialize:', () => {
    it('initializes if the node owner has approved the subdomain registrar address', async () => {
      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the signers[0] the owner
      registerSubdomainHelper('test', '', signers[0], signers[0].address);

      // Approve the subdomain registrar contract address to operate for signers[0] (who owns 'test')
      await ens
        .connect(signers[0])
        .setApprovalForAll(subdomainRegistrar.address, true);

      expect(
        await subdomainRegistrar
          .connect(signers[0])
          .initialize(dao.address, ens.address, namehash('test'))
      );
    });

    it('initializes if the subdomain registrar owns the node', async () => {
      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the subdomain registrar the owner
      registerSubdomainHelper(
        'test',
        '',
        signers[0],
        subdomainRegistrar.address
      );

      expect(
        await subdomainRegistrar
          .connect(signers[0])
          .initialize(dao.address, ens.address, namehash('test'))
      );
    });

    it('reverts if the registrar is neither the domain node owner nor an approved operator of the domain node owner', async () => {
      await expect(
        subdomainRegistrar
          .connect(signers[1])
          .initialize(dao.address, ens.address, namehash('test'))
      ).to.be.revertedWith(
        customError(
          'RegistrarUnauthorized',
          ethers.constants.AddressZero,
          subdomainRegistrar.address
        )
      );
    });

    it('reverts if the registrar is neither the domain node owner nor an approved operator of the domain node owner, also if it is the owner of the ENS registries', async () => {
      // signers[0] has deployed the ENS registries before
      await expect(
        subdomainRegistrar
          .connect(signers[0])
          .initialize(dao.address, ens.address, namehash('test'))
      ).to.be.revertedWith(
        customError(
          'RegistrarUnauthorized',
          ethers.constants.AddressZero,
          subdomainRegistrar.address
        )
      );
    });
  });

  describe('registerSubnode:', () => {
    it('registers and reassigns a subdomain if the registrar is the parent domain owner', async () => {
      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the subdomain registrar the owner
      registerSubdomainHelper(
        'test',
        '',
        signers[0],
        subdomainRegistrar.address
      );

      // Initialize the registrar with the 'test' domain
      subdomainRegistrar.initialize(dao.address, ens.address, namehash('test'));

      // Grant signers[1] the right to register new subdomains in the subdomain registrar contract
      await dao.grant(
        subdomainRegistrar.address,
        await signers[1].getAddress(),
        REGISTER_ENS_SUBDOMAIN_ROLE
      );

      // Register the subdomain 'my.test' as signers[1] and give ownership to an address (here a DAO)
      let tx = await subdomainRegistrar
        .connect(signers[1])
        .registerSubnode(labelhash('my'), dao.address);
      tx.wait();
      expect(await ens.owner(namehash('my.test'))).to.equal(dao.address);

      // Reassigns the subdomain to another address (here signers[1].address)
      tx = await subdomainRegistrar
        .connect(signers[1])
        .registerSubnode(labelhash('my'), signers[1].address);
      tx.wait();
      expect(await ens.owner(namehash('my.test'))).to.equal(signers[1].address);
    });

    it('registers and reassign a subdomain if the registrar is approved by the domain owner', async () => {
      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make signers[1] its owner
      registerSubdomainHelper('test', '', signers[0], signers[1].address);

      // Approve the subdomain registrar contract address to operate for signers[1] (who owns 'test')
      await ens
        .connect(signers[1])
        .setApprovalForAll(subdomainRegistrar.address, true);
      expect(
        await ens.isApprovedForAll(
          await signers[1].getAddress(),
          subdomainRegistrar.address
        )
      ).to.equal(true);

      // Initialize the registrar with the 'test' domain
      subdomainRegistrar.initialize(dao.address, ens.address, namehash('test'));

      // Grant signers[2] the right to register new subdomains in the subdomainRegistrar
      // this is possible because subdomainRegistrar is the controller
      await dao.grant(
        subdomainRegistrar.address,
        await signers[2].getAddress(),
        REGISTER_ENS_SUBDOMAIN_ROLE
      );

      // register 'my.test' as signers[2] and give ownership to the DAO
      let tx = await subdomainRegistrar
        .connect(signers[2])
        .registerSubnode(labelhash('my'), dao.address);
      tx.wait();
      expect(await ens.owner(namehash('my.test'))).to.equal(dao.address);

      // Reassigns the subdomain to another address (here signers[1].address)
      tx = await subdomainRegistrar
        .connect(signers[2])
        .registerSubnode(labelhash('my'), signers[1].address);
      tx.wait();
      expect(await ens.owner(namehash('my.test'))).to.equal(signers[1].address);
    });
  });
});
