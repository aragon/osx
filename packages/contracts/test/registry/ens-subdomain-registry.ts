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

const DUMMY_METADATA = '0x';

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

// Setup ENS with signers[0] owning the the ENS root node (''), the resolver node ('resolver'), the managing DAO, and the subdomain registrar
async function setupENS(
  owner: SignerWithAddress
): Promise<[ENSRegistry, PublicResolver, DAO, ENSSubdomainRegistrar]> {
  const ENSRegistry = await ethers.getContractFactory('ENSRegistry');
  const PublicResolver = await ethers.getContractFactory('PublicResolver');
  const DAO = await ethers.getContractFactory('DAO');
  const ENSSubdomainRegistrar = await ethers.getContractFactory(
    'ENSSubdomainRegistrar'
  );

  // Deploy the ENSRegistry
  let ens = await ENSRegistry.connect(owner).deploy();
  await ens.deployed();

  // Deploy the Resolver
  let resolver = await PublicResolver.connect(owner).deploy(
    ens.address,
    ethers.constants.AddressZero
  );
  await resolver.deployed();
  await setupResolver(ens, resolver, owner);

  // Deploy the managing DAO
  let dao = await DAO.deploy();
  await dao.initialize(
    DUMMY_METADATA,
    await owner.getAddress(),
    ethers.constants.AddressZero
  );

  // Deploy the registrar
  let registrar = await ENSSubdomainRegistrar.deploy();

  return [ens, resolver, dao, registrar];
}

describe('ENSSubdomainRegistrar', function () {
  let signers: SignerWithAddress[];
  let dao: DAO;
  let ens: ENSRegistry;
  let resolver: PublicResolver;
  let registrar: ENSSubdomainRegistrar;

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
    [ens, resolver, dao, registrar] = await setupENS(signers[0]);
  });

  describe('initialize:', () => {
    it('initializes if the node owner has approved the subdomain registrar address', async () => {
      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the signers[0] the owner
      registerSubdomainHelper('test', '', signers[0], signers[0].address);

      // Approve the subdomain registrar contract address to operate for signers[0] (who owns 'test')
      await ens.connect(signers[0]).setApprovalForAll(registrar.address, true);

      expect(
        await registrar
          .connect(signers[0])
          .initialize(dao.address, ens.address, namehash('test'))
      );
    });

    it('initializes if the subdomain registrar owns the node', async () => {
      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the subdomain registrar the owner
      registerSubdomainHelper('test', '', signers[0], registrar.address);

      expect(
        await registrar
          .connect(signers[0])
          .initialize(dao.address, ens.address, namehash('test'))
      );
    });

    it('reverts if the registrar is neither the domain node owner nor an approved operator of the domain node owner', async () => {
      await expect(
        registrar
          .connect(signers[1])
          .initialize(dao.address, ens.address, namehash('test'))
      ).to.be.revertedWith(
        customError(
          'RegistrarUnauthorized',
          ethers.constants.AddressZero,
          registrar.address
        )
      );
    });

    it('reverts if the registrar is neither the domain node owner nor an approved operator of the domain node owner, also if it is the owner of the ENS registries', async () => {
      // signers[0] has deployed the ENS registries before
      await expect(
        registrar
          .connect(signers[0])
          .initialize(dao.address, ens.address, namehash('test'))
      ).to.be.revertedWith(
        customError(
          'RegistrarUnauthorized',
          ethers.constants.AddressZero,
          registrar.address
        )
      );
    });
  });

  describe('registerSubnode:', () => {
    it('registers the subdomain and resolves to the target address if the calling address has permission and the registrar is the parent domain owner', async () => {
      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the subdomain registrar the owner
      registerSubdomainHelper('test', '', signers[0], registrar.address);

      // Initialize the registrar with the 'test' domain
      registrar.initialize(dao.address, ens.address, namehash('test'));

      // Grant signers[1] the right to register new subdomains in the subdomain registrar contract
      await dao.grant(
        registrar.address,
        await signers[1].getAddress(),
        REGISTER_ENS_SUBDOMAIN_ROLE
      );

      // Register the subdomain 'my.test' as signers[1] and set it to resovle to the target address
      const targetAddress = dao.address;
      let tx = await registrar
        .connect(signers[1])
        .registerSubnode(labelhash('my'), targetAddress);
      await tx.wait();

      // Check that the subdomain is still owned by the subdomain registrar
      expect(await ens.owner(namehash('my.test'))).to.equal(registrar.address);

      // Check that the subdomain resolves to the target address
      expect(await resolver['addr(bytes32)'](namehash('my.test'))).to.equal(
        targetAddress
      );
    });

    it('registers the subdomain and resolves to the right address if the calling address has the `REGISTER_ENS_SUBDOMAIN_ROLE` and the registrar is approved by the domain owner', async () => {
      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make signers[1] its owner
      registerSubdomainHelper('test', '', signers[0], signers[1].address);

      // Approve the subdomain registrar contract address to operate for signers[1] (who owns 'test')
      await ens.connect(signers[1]).setApprovalForAll(registrar.address, true);
      expect(
        await ens.isApprovedForAll(
          await signers[1].getAddress(),
          registrar.address
        )
      ).to.equal(true);

      // Initialize the registrar with the 'test' domain
      registrar.initialize(dao.address, ens.address, namehash('test'));

      // Grant signers[2] the right to register new subdomains in the subdomainRegistrar
      // this is possible because subdomainRegistrar is the controller
      await dao.grant(
        registrar.address,
        await signers[2].getAddress(),
        REGISTER_ENS_SUBDOMAIN_ROLE
      );

      // register 'my.test' as signers[2] and set it to resovle to the target address
      const targetAddress = dao.address;
      let tx = await registrar
        .connect(signers[2])
        .registerSubnode(labelhash('my'), targetAddress);
      await tx.wait();

      // Check that the subdomain is still owned by the subdomain registrar
      expect(await ens.owner(namehash('my.test'))).to.equal(registrar.address);

      // Check that the subdomain resolves to the target address
      expect(await resolver['addr(bytes32)'](namehash('my.test'))).to.equal(
        targetAddress
      );

      /*       // TODO
      tx = await subdomainRegistrar
        .connect(signers[2])
        .registerSubnode(labelhash('my'), signers[0].address);
      await tx.wait(); */
    });

    it('reverts if the calling address lacks the `REGISTER_ENS_SUBDOMAIN_ROLE`', async () => {
      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the subdomain registrar the owner
      registerSubdomainHelper('test', '', signers[0], registrar.address);

      // Initialize the registrar with the 'test' domain
      registrar.initialize(dao.address, ens.address, namehash('test'));

      // Register the subdomain 'my.test' as signers[1] who does not have the `REGISTER_ENS_SUBDOMAIN_ROLE` granted
      const targetAddress = dao.address;

      await expect(
        registrar
          .connect(signers[1])
          .registerSubnode(labelhash('my'), targetAddress)
      ).to.be.revertedWith(
        customError(
          'ACLAuth',
          registrar.address,
          registrar.address,
          signers[1].address,
          REGISTER_ENS_SUBDOMAIN_ROLE
        )
      );
    });
  });

  describe('setResolver:', () => {
    it('sets the resolver if the calling address has the `REGISTER_ENS_SUBDOMAIN_ROLE`', async () => {
      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the subdomain registrar the owner
      registerSubdomainHelper('test', '', signers[0], registrar.address);

      // Initialize the registrar with the 'test' domain
      registrar.initialize(dao.address, ens.address, namehash('test'));

      // Grant signers[1] the right to register new subdomains in the subdomain registrar contract
      await dao.grant(
        registrar.address,
        await signers[1].getAddress(),
        REGISTER_ENS_SUBDOMAIN_ROLE
      );

      // Set a new resolver
      const newResolverAddr = ethers.constants.AddressZero;
      let tx = await registrar.connect(signers[1]).setResolver(newResolverAddr);
      await tx.wait();

      expect(await registrar.resolver()).to.equal(newResolverAddr);
    });

    it('reversts the resolver if the calling address lacks the `REGISTER_ENS_SUBDOMAIN_ROLE`', async () => {
      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the subdomain registrar the owner
      registerSubdomainHelper('test', '', signers[0], registrar.address);

      // Initialize the registrar with the 'test' domain
      registrar.initialize(dao.address, ens.address, namehash('test'));

      // Set a new resolver as signers[1] who does not have the `REGISTER_ENS_SUBDOMAIN_ROLE` granted
      await expect(
        registrar.connect(signers[1]).setResolver(ethers.constants.AddressZero)
      ).to.be.revertedWith(
        customError(
          'ACLAuth',
          registrar.address,
          registrar.address,
          signers[1].address,
          REGISTER_ENS_SUBDOMAIN_ROLE
        )
      );
    });
  });
});
