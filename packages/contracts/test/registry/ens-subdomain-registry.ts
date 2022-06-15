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

describe.only('ENSSubdomainRegistrar', function () {
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
  });

  describe('After deployment of ENS', () => {
    beforeEach(async () => {
      [ens, resolver, dao, registrar] = await setupENS(signers[0]);
    });

    it('returns the zero address as the owner for unregistered domains', async () => {
      expect(await ens.owner(namehash('test'))).to.equal(
        ethers.constants.AddressZero
      );
    });

    it('resolves unregistered domains to the zero address', async () => {
      expect(await resolver['addr(bytes32)'](namehash('test'))).to.equal(
        ethers.constants.AddressZero
      );
    });

    it('reverts during intialization because the registrar is neither the domain node owner nor an approved operator of him/her', async () => {
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

      // This is also the case for signers[0] who owns the ENS registries
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

  describe('the registrar is the domain node owner', () => {
    beforeEach(async () => {
      [ens, resolver, dao, registrar] = await setupENS(signers[0]);

      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the subdomain registrar the owner
      registerSubdomainHelper('test', '', signers[0], registrar.address);
    });

    it('initializes correctly', async () => {
      expect(
        await registrar
          .connect(signers[0])
          .initialize(dao.address, ens.address, namehash('test'))
      );
    });

    postInitializationTests();
  });

  describe('the registrar is approved by the domain node owner', () => {
    beforeEach(async () => {
      [ens, resolver, dao, registrar] = await setupENS(signers[0]);

      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the signers[0] the owner
      registerSubdomainHelper('test', '', signers[0], signers[0].address);

      // Approve the subdomain registrar contract address to operate for signers[0] (who owns 'test')
      await ens.connect(signers[0]).setApprovalForAll(registrar.address, true);
    });

    it('initializes correctly', async () => {
      expect(
        await registrar
          .connect(signers[0])
          .initialize(dao.address, ens.address, namehash('test'))
      );
    });

    postInitializationTests();
  });

  function postInitializationTests() {
    describe('and is initialized', () => {
      beforeEach(async () => {
        // Initialize the registrar with the 'test' domain
        registrar.initialize(dao.address, ens.address, namehash('test'));
      });

      it('reverts if initialized a second time', async () => {
        await expect(
          registrar.initialize(dao.address, ens.address, namehash('foo'))
        ).to.be.revertedWith('Initializable: contract is already initialized');
      });

      it('reverts subnode registration if the calling address lacks the `REGISTER_ENS_SUBDOMAIN_ROLE`', async () => {
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

      it('reverts setting the resolver if the calling address lacks the `REGISTER_ENS_SUBDOMAIN_ROLE`', async () => {
        // Set a new resolver as signers[1] who does not have the `REGISTER_ENS_SUBDOMAIN_ROLE` granted
        await expect(
          registrar
            .connect(signers[1])
            .setResolver(ethers.constants.AddressZero)
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

      describe('and the `REGISTER_ENS_SUBDOMAIN_ROLE` permission is granted to the calling address', () => {
        beforeEach(async () => {
          // Grant signers[1] the right to register new subdomains in the subdomainRegistrar
          // this is possible because subdomainRegistrar is the controller
          await dao.grant(
            registrar.address,
            await signers[1].getAddress(),
            REGISTER_ENS_SUBDOMAIN_ROLE
          );
        });

        it('registers the subdomain and resolves to the target address', async () => {
          // register 'my.test' as signers[1] and set it to resovle to the target address
          const targetAddress = dao.address;
          let tx = await registrar
            .connect(signers[1])
            .registerSubnode(labelhash('my'), targetAddress);
          await tx.wait();

          // Check that the subdomain is still owned by the subdomain registrar
          expect(await ens.owner(namehash('my.test'))).to.equal(
            registrar.address
          );

          // Check that the subdomain resolves to the target address
          expect(await resolver['addr(bytes32)'](namehash('my.test'))).to.equal(
            targetAddress
          );
        });

        it('reverts if the subdomain was already registered before', async () => {
          // register 'my.test' as signers[1] and set it to resovle to the target address
          const targetAddress = dao.address;
          let tx = await registrar
            .connect(signers[1])
            .registerSubnode(labelhash('my'), targetAddress);
          await tx.wait();

          // try to regist the same subnode again
          await expect(
            registrar
              .connect(signers[1])
              .registerSubnode(labelhash('my'), await signers[1].getAddress())
          ).to.be.revertedWith(
            customError(
              'AlreadyRegistered',
              namehash('my.test'),
              registrar.address
            )
          );
        });

        it('sets the resolver correctly', async () => {
          const newResolverAddr = ethers.constants.AddressZero;
          let tx = await registrar
            .connect(signers[1])
            .setResolver(newResolverAddr);
          await tx.wait();

          expect(await registrar.resolver()).to.equal(newResolverAddr);
        });
      });
    });
  }
});
