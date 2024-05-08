import {expect} from 'chai';
import hre, {artifacts, ethers} from 'hardhat';
import {ContractFactory} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  ENSSubdomainRegistrar,
  DAO,
  PublicResolver,
  ENSRegistry,
  ENSSubdomainRegistrar__factory,
} from '../../../../typechain';
import {ENSSubdomainRegistrar__factory as ENSSubdomainRegistrar_V1_0_0__factory} from '../../../../typechain/@aragon/osx-v1.0.1/framework/utils/ens/ENSSubdomainRegistrar.sol';

import {deployNewDAO} from '../../../test-utils/dao';
import {ensDomainHash, ensLabelHash} from '../../../../utils/ens';
import {OZ_ERRORS} from '../../../test-utils/error';
import {setupResolver} from '../../../test-utils/ens';
import {UPGRADE_PERMISSIONS} from '../../../test-utils/permissions';
import {
  getProtocolVersion,
  ozUpgradeCheckManagedContract,
} from '../../../test-utils/uups-upgradeable';
import {CURRENT_PROTOCOL_VERSION} from '../../../test-utils/protocol-version';
import {ARTIFACT_SOURCES} from '../../../test-utils/wrapper';

const REGISTER_ENS_SUBDOMAIN_PERMISSION_ID = ethers.utils.id(
  'REGISTER_ENS_SUBDOMAIN_PERMISSION'
);

// Setup ENS with signers[0] owning the ENS root node (''), the resolver node ('resolver'), the managing DAO, and the subdomain registrar
async function setupENS(
  owner: SignerWithAddress
): Promise<[ENSRegistry, PublicResolver, DAO, ENSSubdomainRegistrar]> {
  // Deploy the ENSRegistry
  const ens = await hre.wrapper.deploy('ENSRegistry');

  // Deploy the Resolver
  const resolver = await hre.wrapper.deploy('PublicResolver', {
    args: [ens.address, ethers.constants.AddressZero],
  });

  await setupResolver(ens, resolver, owner);

  // Deploy the managing DAO
  const dao = await deployNewDAO(owner);

  // Deploy the registrar
  const registrar = await hre.wrapper.deploy(
    ARTIFACT_SOURCES.ENS_SUBDOMAIN_REGISTRAR,
    {withProxy: true}
  );

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

  before(async function () {
    signers = await ethers.getSigners();
  });

  beforeEach(async function () {
    [ens, resolver, managingDao, registrar] = await setupENS(signers[0]);
  });

  describe('Check the initial ENS state', async () => {
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
  });

  describe('Registrar is the domain owner but not approved', () => {
    beforeEach(async () => {
      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the subdomain registrar the owner
      await registerSubdomainHelper('test', '', signers[0], registrar.address);
    });

    it('initializes correctly', async () => {
      expect(
        await registrar
          .connect(signers[0])
          .initialize(managingDao.address, ens.address, ensDomainHash('test'))
      ).to.not.be.revertedWithCustomError(registrar, 'InvalidResolver');
    });

    postInitializationTests();

    it('reverts if the registrar do not have the ownership of the domain node', async () => {
      // Register the parent domain 'test2' through signers[0] who owns the ENS root node ('') and make the subdomain registrar the owner
      await registerSubdomainHelper(
        'test2',
        '',
        signers[0],
        signers[0].address
      );

      // Initialize the registrar with the 'test' domain
      await registrar.initialize(
        managingDao.address,
        ens.address,
        ensDomainHash('test2')
      );

      // Grant signers[1] the `REGISTER_ENS_SUBDOMAIN_PERMISSION_ID` permission
      await managingDao.grant(
        registrar.address,
        await signers[1].getAddress(),
        REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
      );

      // signers[0] can't register subdomains
      await expect(
        registrar
          .connect(signers[1])
          .registerSubnode(ensLabelHash('my1'), await signers[1].getAddress())
      ).to.be.reverted;
    });

    it('reverts if the ownership of the domain node is removed from the registrar', async () => {
      // Initialize the registrar with the 'test' domain
      await registrar.initialize(
        managingDao.address,
        ens.address,
        ensDomainHash('test')
      );

      // Grant signers[1] the `REGISTER_ENS_SUBDOMAIN_PERMISSION_ID` permission
      await managingDao.grant(
        registrar.address,
        await signers[1].getAddress(),
        REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
      );

      // signers[1] can register subdomain
      expect(
        await registrar
          .connect(signers[1])
          .registerSubnode(ensLabelHash('my1'), await signers[1].getAddress())
      );

      // Remove ownership of 'test' from the registrar contract address through the parent domain node owner
      await ens
        .connect(signers[0])
        .setSubnodeOwner(
          ensDomainHash(''),
          ensLabelHash('test'),
          await signers[0].getAddress()
        );

      // signers[1] can't register subdomains anymore
      await expect(
        registrar
          .connect(signers[1])
          .registerSubnode(ensLabelHash('my2'), await signers[1].getAddress())
      ).to.be.reverted;
    });
  });

  describe('Registrar is not the domain owner but it is approved', () => {
    beforeEach(async () => {
      // Register the parent domain 'test' through signers[0] who owns the ENS root node ('') and make the signers[0] the owner
      await registerSubdomainHelper('test', '', signers[0], signers[0].address);

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

    it('reverts if the approval of the registrar is removed', async () => {
      // Initialize the registrar with the 'test' domain
      await registrar.initialize(
        managingDao.address,
        ens.address,
        ensDomainHash('test')
      );

      // Grant signers[1] the `REGISTER_ENS_SUBDOMAIN_PERMISSION_ID` permission
      await managingDao.grant(
        registrar.address,
        await signers[1].getAddress(),
        REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
      );

      // signers[1] can register subdomain
      expect(
        await registrar
          .connect(signers[1])
          .registerSubnode(ensLabelHash('my1'), await signers[1].getAddress())
      );

      // Remove approval of the registrar to manage  all domains owned by signers[0] including 'test'
      await ens.connect(signers[0]).setApprovalForAll(registrar.address, false);

      // signers[1] can't register subdomains anymore
      await expect(
        registrar
          .connect(signers[1])
          .registerSubnode(ensLabelHash('my2'), await signers[1].getAddress())
      ).to.be.reverted;
    });
  });

  describe('Registrar is not the domain owner and is not approved but has permission', () => {
    beforeEach(async () => {
      // Grant signers[1] the `REGISTER_ENS_SUBDOMAIN_PERMISSION_ID` permission
      await managingDao.grant(
        registrar.address,
        await signers[1].getAddress(),
        REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
      );
    });

    expectedReverts();
  });

  describe('Random signer with no permissions at all', () => {
    expectedReverts();
  });

  describe('Upgrades', () => {
    let legacyContractFactory: ContractFactory;
    let currentContractFactory: ContractFactory;

    before(() => {
      currentContractFactory = new ENSSubdomainRegistrar__factory(signers[0]);
    });

    beforeEach(async () => {
      await registerSubdomainHelper('test', '', signers[0], registrar.address);
    });

    it('from v1.0.0', async () => {
      legacyContractFactory = new ENSSubdomainRegistrar_V1_0_0__factory(
        signers[0]
      );

      const {fromImplementation, toImplementation} =
        await ozUpgradeCheckManagedContract(
          0,
          1,
          managingDao,
          {
            managingDao: managingDao.address,
            ens: ens.address,
            parentDomain: ensDomainHash('test'),
          },
          'initialize',
          ARTIFACT_SOURCES.ENS_SUBDOMAIN_REGISTRAR_V1_0_0,
          ARTIFACT_SOURCES.ENS_SUBDOMAIN_REGISTRAR,
          UPGRADE_PERMISSIONS.UPGRADE_REGISTRAR_PERMISSION_ID
        );

      // TODO:GIORGI what th
      expect(toImplementation).to.equal(fromImplementation); // The implementation was not changed from 1.0.0 to the current version

      const fromProtocolVersion = await getProtocolVersion(
        legacyContractFactory.attach(fromImplementation)
      );
      const toProtocolVersion = await getProtocolVersion(
        currentContractFactory.attach(toImplementation)
      );

      expect(fromProtocolVersion).to.deep.equal(toProtocolVersion);
      expect(fromProtocolVersion).to.deep.equal([1, 0, 0]);
      expect(toProtocolVersion).to.not.deep.equal(CURRENT_PROTOCOL_VERSION);
    });
  });

  function expectedReverts() {
    it('reverts during initialization if node does not have a valid resolver', async () => {
      await expect(
        registrar
          .connect(signers[1])
          .initialize(managingDao.address, ens.address, ensDomainHash('test2'))
      )
        .to.be.revertedWithCustomError(registrar, 'InvalidResolver')
        .withArgs(ensDomainHash('test2'), ethers.constants.AddressZero);
    });

    it('reverts on attempted subnode registration', async () => {
      // signers[1] can register subdomain
      await expect(
        registrar
          .connect(signers[1])
          .registerSubnode(ensLabelHash('my'), await signers[1].getAddress())
      ).to.be.reverted;
    });

    it('reverts on attempted default resolver setting', async () => {
      const newResolverAddr = ethers.constants.AddressZero;

      // signers[1] can register subdomain
      await expect(
        registrar.connect(signers[1]).setDefaultResolver(newResolverAddr)
      ).to.be.reverted;
    });
  }

  function postInitializationTests() {
    describe('After registrar initialization', () => {
      beforeEach(async () => {
        // Initialize the registrar with the 'test' domain
        await registrar.initialize(
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
        ).to.be.revertedWith(OZ_ERRORS.ALREADY_INITIALIZED);
      });

      it('reverts subnode registration if the calling address lacks permission of the managing DAO', async () => {
        const targetAddress = managingDao.address;

        // Register the subdomain 'my.test' as signers[1] who does not have the `REGISTER_ENS_SUBDOMAIN_PERMISSION_ID` granted
        await expect(
          registrar
            .connect(signers[1])
            .registerSubnode(ensLabelHash('my'), targetAddress)
        )
          .to.be.revertedWithCustomError(registrar, 'DaoUnauthorized')
          .withArgs(
            managingDao.address,
            registrar.address,
            signers[1].address,
            REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
          );
      });

      it('reverts setting the resolver if the calling address lacks permission of the managing DAO', async () => {
        // Set a new resolver as signers[1] who does not have the `REGISTER_ENS_SUBDOMAIN_PERMISSION_ID` granted
        await expect(
          registrar
            .connect(signers[1])
            .setDefaultResolver(ethers.constants.AddressZero)
        )
          .to.be.revertedWithCustomError(registrar, 'DaoUnauthorized')
          .withArgs(
            managingDao.address,
            registrar.address,
            signers[1].address,
            REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
          );
      });

      describe('After granting permission to the calling address via the managing DAO', () => {
        beforeEach(async () => {
          // Grant signers[1] and signers[2] the `REGISTER_ENS_SUBDOMAIN_PERMISSION_ID` permission
          await managingDao.grant(
            registrar.address,
            await signers[1].getAddress(),
            REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
          );
          await managingDao.grant(
            registrar.address,
            await signers[2].getAddress(),
            REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
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

        it('reverts subnode registration if the subdomain was already registered before', async () => {
          // register 'my.test' as signers[1] and set it to resovle to the target address
          const targetAddress = managingDao.address;
          let tx = await registrar
            .connect(signers[1])
            .registerSubnode(ensLabelHash('my'), targetAddress);
          await tx.wait();

          // try to register the same subnode again as signers[2]
          await expect(
            registrar
              .connect(signers[2])
              .registerSubnode(
                ensLabelHash('my'),
                await signers[2].getAddress()
              )
          )
            .to.be.revertedWithCustomError(registrar, 'AlreadyRegistered')
            .withArgs(ensDomainHash('my.test'), registrar.address);
        });

        it('reverts subnode registration if the subdomain was already registered before, also for the same caller', async () => {
          // register 'my.test' as signers[1] and set it to resovle to the target address
          const targetAddress = managingDao.address;
          let tx = await registrar
            .connect(signers[1])
            .registerSubnode(ensLabelHash('my'), targetAddress);
          await tx.wait();

          // try to register the same subnode again as signers[1]
          await expect(
            registrar
              .connect(signers[1])
              .registerSubnode(
                ensLabelHash('my'),
                await signers[1].getAddress()
              )
          )
            .to.be.revertedWithCustomError(registrar, 'AlreadyRegistered')
            .withArgs(ensDomainHash('my.test'), registrar.address);
        });

        it('revert if invalid resolver is set', async () => {
          const newResolverAddr = ethers.constants.AddressZero;

          await expect(
            registrar.connect(signers[1]).setDefaultResolver(newResolverAddr)
          )
            .to.be.revertedWithCustomError(registrar, 'InvalidResolver')
            .withArgs(ensDomainHash('test'), newResolverAddr);
        });

        it('sets the resolver correctly', async () => {
          const newResolverAddr = await signers[8].getAddress();
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
