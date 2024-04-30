import {
  DAO,
  DAORegistry,
  DAORegistry__factory,
  ENSSubdomainRegistrar,
} from '../../../typechain';
import {DAORegistry__factory as DAORegistry_V1_0_0__factory} from '../../../typechain/@aragon/osx-v1.0.1/framework/dao/DAORegistry.sol';
import {DAORegistry__factory as DAORegistry_V1_3_0__factory} from '../../../typechain/@aragon/osx-v1.3.0/framework/dao/DAORegistry.sol';
import {ensDomainHash, ensLabelHash} from '../../../utils/ens';
import {deployNewDAO} from '../../test-utils/dao';
import {deployENSSubdomainRegistrar} from '../../test-utils/ens';
import {osxContractsVersion} from '../../test-utils/protocol-version';
import {deployWithProxy} from '../../test-utils/proxy';
import {
  getProtocolVersion,
  deployAndUpgradeFromToCheck,
  deployAndUpgradeSelfCheck,
} from '../../test-utils/uups-upgradeable';
import {
  DAO_REGISTRY_PERMISSIONS,
  ENS_REGISTRAR_PERMISSIONS,
} from '@aragon/osx-commons-sdk';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ContractFactory} from 'ethers';
import {ethers} from 'hardhat';

const EVENTS = {
  DAORegistered: 'DAORegistered',
};

describe.only('DAORegistry', function () {
  let signers: SignerWithAddress[];
  let daoRegistry: DAORegistry;
  let managingDao: DAO;
  let ownerAddress: string;
  let targetDao: DAO;
  let ensSubdomainRegistrar: ENSSubdomainRegistrar;

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

    // Target DAO to be used as an example DAO to be registered
    targetDao = await deployNewDAO(signers[0]);

    // DAO Registry
    const Registry = new DAORegistry__factory(signers[0]);

    daoRegistry = await deployWithProxy(Registry);

    await daoRegistry.initialize(managingDao.address);

    // ENS
    // ! not needed but used in previous version tets
    ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
      signers[0],
      managingDao,
      daoRegistry.address,
      topLevelDomain
    );

    // Grant the `REGISTER_DAO_PERMISSION_ID` permission in the DAO registry to `signers[0]`
    await managingDao.grant(
      daoRegistry.address,
      ownerAddress,
      DAO_REGISTRY_PERMISSIONS.REGISTER_DAO_PERMISSION_ID
    );

    // Grant the `REGISTER_ENS_SUBDOMAIN_PERMISSION_ID` permission on the ENS subdomain registrar to the DAO registry contract
    // await managingDao.grant(
    //   ensSubdomainRegistrar.address,
    //   daoRegistry.address,
    //   ENS_REGISTRAR_PERMISSIONS.REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
    // );
  });

  it('succeeds even if the dao subdomain is empty', async function () {
    await expect(daoRegistry.register(targetDao.address, ownerAddress)).to.not
      .be.reverted;
  });

  // it('successfully sets subdomainregistrar', async () => {
  //   expect(await daoRegistry.subdomainRegistrar()).to.equal(
  //     ensSubdomainRegistrar.address
  //   );
  // });

  it('Should register a new DAO successfully', async function () {
    await expect(daoRegistry.register(targetDao.address, ownerAddress))
      .to.emit(daoRegistry, EVENTS.DAORegistered)
      .withArgs(targetDao.address, ownerAddress);

    expect(await daoRegistry.entries(targetDao.address)).to.equal(true);
  });

  it('fails to register if the sender lacks the required role', async () => {
    // Register a DAO successfully
    await daoRegistry.register(targetDao.address, ownerAddress);

    // Revoke the permission
    await managingDao.revoke(
      daoRegistry.address,
      ownerAddress,
      DAO_REGISTRY_PERMISSIONS.REGISTER_DAO_PERMISSION_ID
    );

    const newTargetDao = await deployNewDAO(signers[0]);

    await expect(daoRegistry.register(newTargetDao.address, ownerAddress))
      .to.be.revertedWithCustomError(daoRegistry, 'DaoUnauthorized')
      .withArgs(
        managingDao.address,
        daoRegistry.address,
        ownerAddress,
        DAO_REGISTRY_PERMISSIONS.REGISTER_DAO_PERMISSION_ID
      );
  });

  it('fails to register if DAO already exists', async function () {
    await daoRegistry.register(targetDao.address, ownerAddress);

    await expect(daoRegistry.register(targetDao.address, ownerAddress))
      .to.be.revertedWithCustomError(daoRegistry, 'ContractAlreadyRegistered')
      .withArgs(targetDao.address);
  });

  it('fails to register a DAO with the same name twice', async function () {
    // Register the DAO name under the top level domain
    await daoRegistry.register(targetDao.address, ownerAddress);

    const newTargetDao = await deployNewDAO(signers[0]);
    const otherOwnerAddress = await (await ethers.getSigners())[1].getAddress();

    // ! no longer valid due to ens no longer part of the DAORegistry
    // Try to register the DAO name under the top level domain a second time
    // await expect(daoRegistry.register(newTargetDao.address, otherOwnerAddress))
    //   .to.be.revertedWithCustomError(ensSubdomainRegistrar, 'AlreadyRegistered')
    //   .withArgs(daoDomainHash, ensSubdomainRegistrar.address);
  });

  // without mocking we have to repeat the tests here to make sure the validation is correct
  // ! not needed as ENS no longer part of the DAORegistry
  // describe('subdomain validation', () => {
  //   it('should validate the passed subdomain correctly (< 32 bytes long subdomain)', async () => {
  //     const baseSubdomain = 'this-is-my-super-valid-subdomain';

  //     // loop through the ascii table
  //     for (let i = 0; i < 127; i++) {
  //       const newTargetDao = await deployNewDAO(signers[0]);

  //       // replace the 10th char in the baseSubdomain
  //       const subdomainName =
  //         baseSubdomain.substring(0, 10) +
  //         String.fromCharCode(i) +
  //         baseSubdomain.substring(10 + 1);

  //       // test success if it is a valid char [0-9a-z\-]
  //       if ((i > 47 && i < 58) || (i > 96 && i < 123) || i === 45) {
  //         await expect(
  //           daoRegistry.register(
  //             newTargetDao.address,
  //             ownerAddress,
  //             subdomainName
  //           )
  //         )
  //           .to.emit(daoRegistry, EVENTS.DAORegistered)
  //           .withArgs(newTargetDao.address, ownerAddress, subdomainName);
  //         continue;
  //       }

  //       await expect(
  //         daoRegistry.register(
  //           newTargetDao.address,
  //           ownerAddress,
  //           subdomainName
  //         )
  //       )
  //         .to.be.revertedWithCustomError(daoRegistry, 'InvalidDaoSubdomain')
  //         .withArgs(subdomainName);
  //     }
  //   }).timeout(120000);

  //   it('should validate the passed subdomain correctly (> 32 bytes long subdomain)', async () => {
  //     const baseSubdomain =
  //       'this-is-my-super-looooooooooooooooooooooooooong-valid-subdomain';

  //     // loop through the ascii table
  //     for (let i = 0; i < 127; i++) {
  //       const newTargetDao = await deployNewDAO(signers[0]);

  //       // replace the 40th char in the baseSubdomain
  //       const subdomainName =
  //         baseSubdomain.substring(0, 40) +
  //         String.fromCharCode(i) +
  //         baseSubdomain.substring(40 + 1);

  //       // test success if it is a valid char [0-9a-z\-]
  //       if ((i > 47 && i < 58) || (i > 96 && i < 123) || i === 45) {
  //         await expect(
  //           daoRegistry.register(
  //             newTargetDao.address,
  //             ownerAddress,
  //             subdomainName
  //           )
  //         )
  //           .to.emit(daoRegistry, EVENTS.DAORegistered)
  //           .withArgs(newTargetDao.address, ownerAddress, subdomainName);
  //         continue;
  //       }

  //       await expect(
  //         daoRegistry.register(
  //           newTargetDao.address,
  //           ownerAddress,
  //           subdomainName
  //         )
  //       )
  //         .to.be.revertedWithCustomError(daoRegistry, 'InvalidDaoSubdomain')
  //         .withArgs(subdomainName);
  //     }
  //   }).timeout(120000);
  // });

  describe('Protocol version', async () => {
    it('returns the current protocol version', async () => {
      expect(await daoRegistry.protocolVersion()).to.deep.equal(
        osxContractsVersion()
      );
    });
  });

  describe('Upgrades', () => {
    let legacyContractFactory: ContractFactory;
    let currentContractFactory: ContractFactory;
    let initArgs: any;

    before(() => {
      currentContractFactory = new DAORegistry__factory(signers[0]);
    });

    beforeEach(() => {
      initArgs = {
        dao: managingDao.address,
        ensSubdomainRegistrar: ensSubdomainRegistrar.address,
      };
    });

    it('upgrades to a new implementation', async () => {
      // remove ensSubdomainRegistrar since is no longer needed
      delete initArgs.ensSubdomainRegistrar;

      await deployAndUpgradeSelfCheck(
        signers[0],
        signers[1],
        initArgs,
        'initialize',
        currentContractFactory,
        DAO_REGISTRY_PERMISSIONS.UPGRADE_REGISTRY_PERMISSION_ID,
        managingDao
      );
    });

    it('upgrades from v1.0.0', async () => {
      legacyContractFactory = new DAORegistry_V1_0_0__factory(signers[0]);

      const {fromImplementation, toImplementation} =
        await deployAndUpgradeFromToCheck(
          signers[0],
          signers[1],
          initArgs,
          'initialize',
          legacyContractFactory,
          currentContractFactory,
          DAO_REGISTRY_PERMISSIONS.UPGRADE_REGISTRY_PERMISSION_ID,
          managingDao
        );
      expect(toImplementation).to.not.equal(fromImplementation);

      const fromProtocolVersion = await getProtocolVersion(
        legacyContractFactory.attach(fromImplementation)
      );
      const toProtocolVersion = await getProtocolVersion(
        currentContractFactory.attach(toImplementation)
      );
      expect(fromProtocolVersion).to.not.deep.equal(toProtocolVersion);
      expect(fromProtocolVersion).to.deep.equal([1, 0, 0]);
      expect(toProtocolVersion).to.deep.equal(osxContractsVersion());
    });

    it('from v1.3.0', async () => {
      legacyContractFactory = new DAORegistry_V1_3_0__factory(signers[0]);

      const {fromImplementation, toImplementation} =
        await deployAndUpgradeFromToCheck(
          signers[0],
          signers[1],
          initArgs,
          'initialize',
          legacyContractFactory,
          currentContractFactory,
          DAO_REGISTRY_PERMISSIONS.UPGRADE_REGISTRY_PERMISSION_ID,
          managingDao
        );
      expect(toImplementation).to.not.equal(fromImplementation);

      const fromProtocolVersion = await getProtocolVersion(
        legacyContractFactory.attach(fromImplementation)
      );
      const toProtocolVersion = await getProtocolVersion(
        currentContractFactory.attach(toImplementation)
      );

      expect(fromProtocolVersion).to.not.deep.equal(toProtocolVersion);
      expect(fromProtocolVersion).to.deep.equal([1, 0, 0]);
      expect(toProtocolVersion).to.deep.equal(osxContractsVersion());
    });
  });
});
