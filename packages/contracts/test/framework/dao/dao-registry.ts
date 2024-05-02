import {expect} from 'chai';
import hre, {ethers} from 'hardhat';
import {ContractFactory} from 'ethers';

import {ensDomainHash, ensLabelHash} from '../../../utils/ens';
import {
  DAO,
  DAORegistry,
  DAORegistry__factory,
  ENSSubdomainRegistrar,
} from '../../../typechain';
import {DAORegistry__factory as DAORegistry_V1_0_0__factory} from '../../../typechain/@aragon/osx-v1.0.1/framework/dao/DAORegistry.sol';

import {deployNewDAO} from '../../test-utils/dao';
import {deployENSSubdomainRegistrar} from '../../test-utils/ens';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {UPGRADE_PERMISSIONS} from '../../test-utils/permissions';
import {
  getProtocolVersion,
  ozUpgradeCheckManagedContract,
} from '../../test-utils/uups-upgradeable';
import {CURRENT_PROTOCOL_VERSION} from '../../test-utils/protocol-version';
import {ARTIFACT_SOURCES} from '../../test-utils/wrapper';

const EVENTS = {
  DAORegistered: 'DAORegistered',
};

describe('DAORegistry', function () {
  let signers: SignerWithAddress[];
  let daoRegistry: DAORegistry;
  let managingDao: DAO;
  let ownerAddress: string;
  let targetDao: DAO;
  let ensSubdomainRegistrar: ENSSubdomainRegistrar;

  const REGISTER_ENS_SUBDOMAIN_PERMISSION_ID = ethers.utils.id(
    'REGISTER_ENS_SUBDOMAIN_PERMISSION'
  );
  const REGISTER_DAO_PERMISSION_ID = ethers.utils.id('REGISTER_DAO_PERMISSION');

  const topLevelDomain = 'dao.eth';
  const daoSubdomain = 'my-cool-org';
  const daoSubdomainEnsLabelhash = ensLabelHash(daoSubdomain);
  const daoDomainHash = ensDomainHash(daoSubdomain + '.' + topLevelDomain);

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // Managing DAO
    managingDao = await deployNewDAO(signers[0]);

    // ENS
    ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
      signers[0],
      managingDao,
      topLevelDomain
    );

    // Target DAO to be used as an example DAO to be registered
    targetDao = await deployNewDAO(signers[0]);

    // DAO Registry
    daoRegistry = await hre.wrapper.deploy(ARTIFACT_SOURCES.DAO_REGISTRY, {
      withProxy: true,
    });

    await daoRegistry.initialize(
      managingDao.address,
      ensSubdomainRegistrar.address
    );

    // Grant the `REGISTER_DAO_PERMISSION_ID` permission in the DAO registry to `signers[0]`
    await managingDao.grant(
      daoRegistry.address,
      ownerAddress,
      REGISTER_DAO_PERMISSION_ID
    );

    // Grant the `REGISTER_ENS_SUBDOMAIN_PERMISSION_ID` permission on the ENS subdomain registrar to the DAO registry contract
    await managingDao.grant(
      ensSubdomainRegistrar.address,
      daoRegistry.address,
      REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
    );
  });

  it('succeeds even if the dao subdomain is empty', async function () {
    await expect(daoRegistry.register(targetDao.address, ownerAddress, '')).to
      .not.be.reverted;
  });

  it('successfully sets subdomainregistrar', async () => {
    expect(await daoRegistry.subdomainRegistrar()).to.equal(
      ensSubdomainRegistrar.address
    );
  });

  it('Should register a new DAO successfully', async function () {
    await expect(
      daoRegistry.register(targetDao.address, ownerAddress, daoSubdomain)
    )
      .to.emit(daoRegistry, EVENTS.DAORegistered)
      .withArgs(targetDao.address, ownerAddress, daoSubdomain);

    expect(await daoRegistry.entries(targetDao.address)).to.equal(true);
  });

  it('fails to register if the sender lacks the required role', async () => {
    // Register a DAO successfully
    await daoRegistry.register(targetDao.address, ownerAddress, daoSubdomain);

    // Revoke the permission
    await managingDao.revoke(
      daoRegistry.address,
      ownerAddress,
      REGISTER_DAO_PERMISSION_ID
    );

    const newTargetDao = await deployNewDAO(signers[0]);

    await expect(
      daoRegistry.register(newTargetDao.address, ownerAddress, daoSubdomain)
    )
      .to.be.revertedWithCustomError(daoRegistry, 'DaoUnauthorized')
      .withArgs(
        managingDao.address,
        daoRegistry.address,
        ownerAddress,
        REGISTER_DAO_PERMISSION_ID
      );
  });

  it('fails to register if DAO already exists', async function () {
    await daoRegistry.register(
      targetDao.address,
      ownerAddress,
      daoSubdomainEnsLabelhash
    );

    await expect(
      daoRegistry.register(targetDao.address, ownerAddress, daoSubdomain)
    )
      .to.be.revertedWithCustomError(daoRegistry, 'ContractAlreadyRegistered')
      .withArgs(targetDao.address);
  });

  it('fails to register a DAO with the same name twice', async function () {
    // Register the DAO name under the top level domain
    await daoRegistry.register(targetDao.address, ownerAddress, daoSubdomain);

    const newTargetDao = await deployNewDAO(signers[0]);
    const otherOwnerAddress = await (await ethers.getSigners())[1].getAddress();

    // Try to register the DAO name under the top level domain a second time
    await expect(
      daoRegistry.register(
        newTargetDao.address,
        otherOwnerAddress,
        daoSubdomain
      )
    )
      .to.be.revertedWithCustomError(ensSubdomainRegistrar, 'AlreadyRegistered')
      .withArgs(daoDomainHash, ensSubdomainRegistrar.address);
  });

  // without mocking we have to repeat the tests here to make sure the validation is correct
  describe('subdomain validation', () => {
    it('should validate the passed subdomain correctly (< 32 bytes long subdomain)', async () => {
      const baseSubdomain = 'this-is-my-super-valid-subdomain';

      // loop through the ascii table
      for (let i = 0; i < 127; i++) {
        const newTargetDao = await deployNewDAO(signers[0]);

        // replace the 10th char in the baseSubdomain
        const subdomainName =
          baseSubdomain.substring(0, 10) +
          String.fromCharCode(i) +
          baseSubdomain.substring(10 + 1);

        // test success if it is a valid char [0-9a-z\-]
        if ((i > 47 && i < 58) || (i > 96 && i < 123) || i === 45) {
          await expect(
            daoRegistry.register(
              newTargetDao.address,
              ownerAddress,
              subdomainName
            )
          )
            .to.emit(daoRegistry, EVENTS.DAORegistered)
            .withArgs(newTargetDao.address, ownerAddress, subdomainName);
          continue;
        }

        await expect(
          daoRegistry.register(
            newTargetDao.address,
            ownerAddress,
            subdomainName
          )
        )
          .to.be.revertedWithCustomError(daoRegistry, 'InvalidDaoSubdomain')
          .withArgs(subdomainName);
      }
    }).timeout(120000);

    it('should validate the passed subdomain correctly (> 32 bytes long subdomain)', async () => {
      const baseSubdomain =
        'this-is-my-super-looooooooooooooooooooooooooong-valid-subdomain';

      // loop through the ascii table
      for (let i = 0; i < 127; i++) {
        const newTargetDao = await deployNewDAO(signers[0]);

        // replace the 40th char in the baseSubdomain
        const subdomainName =
          baseSubdomain.substring(0, 40) +
          String.fromCharCode(i) +
          baseSubdomain.substring(40 + 1);

        // test success if it is a valid char [0-9a-z\-]
        if ((i > 47 && i < 58) || (i > 96 && i < 123) || i === 45) {
          await expect(
            daoRegistry.register(
              newTargetDao.address,
              ownerAddress,
              subdomainName
            )
          )
            .to.emit(daoRegistry, EVENTS.DAORegistered)
            .withArgs(newTargetDao.address, ownerAddress, subdomainName);
          continue;
        }

        await expect(
          daoRegistry.register(
            newTargetDao.address,
            ownerAddress,
            subdomainName
          )
        )
          .to.be.revertedWithCustomError(daoRegistry, 'InvalidDaoSubdomain')
          .withArgs(subdomainName);
      }
    }).timeout(120000);
  });

  describe('Upgrades', () => {
    let legacyContractFactory: ContractFactory;
    let currentContractFactory: ContractFactory;

    before(() => {
      currentContractFactory = new DAORegistry__factory(signers[0]);
    });

    // TODO:GIORGI fix later
    it('from v1.0.0', async () => {
      legacyContractFactory = new DAORegistry_V1_0_0__factory(signers[0]);

      const {fromImplementation, toImplementation} =
        await ozUpgradeCheckManagedContract(
          0,
          1,
          managingDao,
          {
            dao: managingDao.address,
            ensSubdomainRegistrar: ensSubdomainRegistrar.address,
          },
          'initialize',
          ARTIFACT_SOURCES.DAO_REGISTRY_V1_0_0,
          ARTIFACT_SOURCES.DAO_REGISTRY,
          UPGRADE_PERMISSIONS.UPGRADE_REGISTRY_PERMISSION_ID
        );

      // TODO: GIORGI what the f is this ?
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
});
