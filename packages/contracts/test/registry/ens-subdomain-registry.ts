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

function ensLabelHash(label: string): string {
  return ethers.utils.id(label);
}

function ensDomainHash(name: string): string {
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
  let managingDao: DAO;
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
        ensDomainHash(domain),
        ensLabelHash(subdomain),
        subdomainOwnerAddress,
        resolver.address,
        0
      );
    await tx.wait();

    // Verify that the subdomain is owned by the correct address
    expect(await ens.owner(ensDomainHash(fullDomain))).to.equal(
      subdomainOwnerAddress
    );
    // Verify that that the subdomain's resolver address is set correctly
    expect(await ens.resolver(ensDomainHash(fullDomain))).to.equal(
      resolver.address
    );
  }

  beforeEach(async () => {
    signers = await ethers.getSigners();
  });

  describe('After deployment', () => {
    beforeEach(async () => {
      [ens, resolver, managingDao, registrar] = await setupENS(signers[0]);
    });

    it('unregistered domains are owned by the zero address on ENS', async () => {
      expect(await ens.owner(ensDomainHash('test'))).to.equal(
        ethers.constants.AddressZero
      );
    });

    it('unregistered domains resolve to the zero address on ENS', async () => {
      expect(await resolver['addr(bytes32)'](ensDomainHash('test'))).to.equal(
        ethers.constants.AddressZero
      );
    });

    it('reverts during intialization because the registrar is neither the domain node owner nor an approved operator of him/her', async () => {
      await expect(
        registrar
          .connect(signers[1])
          .initialize(managingDao.address, ens.address, ensDomainHash('test'))
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
          .initialize(managingDao.address, ens.address, ensDomainHash('test'))
      ).to.be.revertedWith(
        customError(
          'RegistrarUnauthorized',
          ethers.constants.AddressZero,
          registrar.address
        )
      );
    });
  });

  describe('After deployment and giving ownership of the domain node to the registrar', () => {
    beforeEach(async () => {
      [ens, resolver, managingDao, registrar] = await setupENS(signers[0]);

      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the subdomain registrar the owner
      registerSubdomainHelper('test', '', signers[0], registrar.address);
    });

    it('initializes correctly', async () => {
      expect(
        await registrar
          .connect(signers[0])
          .initialize(managingDao.address, ens.address, ensDomainHash('test'))
      );
    });

    postInitializationTests();
  });

  describe('After deployment and approval of the registrar by the domain node owner', () => {
    beforeEach(async () => {
      [ens, resolver, managingDao, registrar] = await setupENS(signers[0]);

      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the signers[0] the owner
      registerSubdomainHelper('test', '', signers[0], signers[0].address);

      // Approve the subdomain registrar contract address to operate for signers[0] (who owns 'test')
      await ens.connect(signers[0]).setApprovalForAll(registrar.address, true);
    });

    it('initializes correctly', async () => {
      expect(
        await registrar
          .connect(signers[0])
          .initialize(managingDao.address, ens.address, ensDomainHash('test'))
      );

      // the default resolver is the resolver of the parent domain node
      expect(await registrar.resolver()).to.equal(resolver.address);
    });

    postInitializationTests();
  });

  function postInitializationTests() {
    describe('and after registrar initialization', () => {
      beforeEach(async () => {
        // Initialize the registrar with the 'test' domain
        registrar.initialize(
          managingDao.address,
          ens.address,
          ensDomainHash('test')
        );
      });

      it('reverts if initialized a second time', async () => {
        await expect(
          registrar.initialize(
            managingDao.address,
            ens.address,
            ensDomainHash('foo')
          )
        ).to.be.revertedWith('Initializable: contract is already initialized');
      });

      it('reverts subnode registration if the calling address lacks permission of the managing DAO', async () => {
        const targetAddress = managingDao.address;

        // Register the subdomain 'my.test' as signers[1] who does not have the `REGISTER_ENS_SUBDOMAIN_ROLE` granted
        await expect(
          registrar
            .connect(signers[1])
            .registerSubnode(ensLabelHash('my'), targetAddress)
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

      it('reverts setting the resolver if the calling address lacks permission of the managing DAO', async () => {
        // Set a new resolver as signers[1] who does not have the `REGISTER_ENS_SUBDOMAIN_ROLE` granted
        await expect(
          registrar
            .connect(signers[1])
            .setDefaultResolver(ethers.constants.AddressZero)
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

      describe('and after granting permission to the calling address via the managing DAO', () => {
        beforeEach(async () => {
          // Grant signers[1] the `REGISTER_ENS_SUBDOMAIN_ROLE` permission
          await managingDao.grant(
            registrar.address,
            await signers[1].getAddress(),
            REGISTER_ENS_SUBDOMAIN_ROLE
          );
        });

        it('registers the subdomain and resolves to the target address', async () => {
          // register 'my.test' as signers[1] and set it to resovle to the target address
          const targetAddress = managingDao.address;
          let tx = await registrar
            .connect(signers[1])
            .registerSubnode(ensLabelHash('my'), targetAddress);
          await tx.wait();

          // Check that the subdomain is still owned by the subdomain registrar
          expect(await ens.owner(ensDomainHash('my.test'))).to.equal(
            registrar.address
          );

          // Check that the subdomain resolves to the target address
          expect(
            await resolver['addr(bytes32)'](ensDomainHash('my.test'))
          ).to.equal(targetAddress);
        });

        it('reverts if the subdomain was already registered before', async () => {
          // register 'my.test' as signers[1] and set it to resovle to the target address
          const targetAddress = managingDao.address;
          let tx = await registrar
            .connect(signers[1])
            .registerSubnode(ensLabelHash('my'), targetAddress);
          await tx.wait();

          // try to regist the same subnode again
          await expect(
            registrar
              .connect(signers[1])
              .registerSubnode(
                ensLabelHash('my'),
                await signers[1].getAddress()
              )
          ).to.be.revertedWith(
            customError(
              'AlreadyRegistered',
              ensDomainHash('my.test'),
              registrar.address
            )
          );
        });

        it('sets the resolver correctly', async () => {
          const newResolverAddr = ethers.constants.AddressZero;
          let tx = await registrar
            .connect(signers[1])
            .setDefaultResolver(newResolverAddr);
          await tx.wait();

          expect(await registrar.resolver()).to.equal(newResolverAddr);
        });
      });
    });
  }
});
