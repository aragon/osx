import {expect} from 'chai';
import {ethers} from 'hardhat';

import {ensDomainHash, ensLabelHash} from '../../utils/ens';
import {DAO, DAORegistry, ENSSubdomainRegistrar} from '../../typechain';
import {deployNewDAO} from '../test-utils/dao';
import {deployENSSubdomainRegistrar} from '../test-utils/ens';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {deployWithProxy} from '../test-utils/proxy';
import {Wallet} from 'ethers';

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
  const daoName = 'my-cool-org';
  const daoNameEnsLabelhash = ensLabelHash(daoName);
  const daoDomainHash = ensDomainHash(daoName + '.' + topLevelDomain);

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // Managing DAO
    managingDao = await deployNewDAO(ownerAddress);

    // ENS
    ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
      signers[0],
      managingDao,
      topLevelDomain
    );

    // Target DAO to be used as an example DAO to be registered
    targetDao = await deployNewDAO(ownerAddress);

    // DAO Registry
    const Registry = await ethers.getContractFactory('DAORegistry');

    daoRegistry = await deployWithProxy(Registry);

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

  it('reverts the registration if the DAO name is empty', async function () {
    await expect(
      daoRegistry.register(targetDao.address, ownerAddress, '')
    ).to.be.revertedWithCustomError(daoRegistry, 'EmptyDaoName');
  });

  it('Should register a new DAO successfully', async function () {
    await expect(daoRegistry.register(targetDao.address, ownerAddress, daoName))
      .to.emit(daoRegistry, EVENTS.DAORegistered)
      .withArgs(targetDao.address, ownerAddress, daoName);

    expect(await daoRegistry.entries(targetDao.address)).to.equal(true);
  });

  it('fails to register if the sender lacks the required role', async () => {
    // Register a DAO successfully
    await daoRegistry.register(targetDao.address, ownerAddress, daoName);

    // Revoke the permission
    await managingDao.revoke(
      daoRegistry.address,
      ownerAddress,
      REGISTER_DAO_PERMISSION_ID
    );

    const newTargetDao = await deployNewDAO(ownerAddress);

    await expect(
      daoRegistry.register(newTargetDao.address, ownerAddress, daoName)
    )
      .to.be.revertedWithCustomError(daoRegistry, 'DaoUnauthorized')
      .withArgs(
        managingDao.address,
        daoRegistry.address,
        daoRegistry.address,
        ownerAddress,
        REGISTER_DAO_PERMISSION_ID
      );
  });

  it('fails to register if DAO already exists', async function () {
    await daoRegistry.register(
      targetDao.address,
      ownerAddress,
      daoNameEnsLabelhash
    );

    await expect(daoRegistry.register(targetDao.address, ownerAddress, daoName))
      .to.be.revertedWithCustomError(daoRegistry, 'ContractAlreadyRegistered')
      .withArgs(targetDao.address);
  });

  it('fails to register a DAO with the same name twice', async function () {
    // Register the the DAO name under the top level domain
    await daoRegistry.register(targetDao.address, ownerAddress, daoName);

    const newTargetDao = await deployNewDAO(ownerAddress);
    const otherOwnerAddress = await (await ethers.getSigners())[1].getAddress();

    // Try to register the the DAO name under the top level domain a second time
    await expect(
      daoRegistry.register(newTargetDao.address, otherOwnerAddress, daoName)
    )
      .to.be.revertedWithCustomError(ensSubdomainRegistrar, 'AlreadyRegistered')
      .withArgs(daoDomainHash, ensSubdomainRegistrar.address);
  });

  // without mocking we have to repeat the tests here to make sure the validation is correct
  describe('name validation', () => {
    it('should validate the passed name correctly (< 32 bytes long name)', async () => {
      const baseName = 'this-is-my-super-valid-name';

      // loop through the ascii table
      for (let i = 0; i < 127; i++) {
        const newTargetDao = await deployNewDAO(ownerAddress);

        // replace the 10th char in the baseName
        const subdomainName =
          baseName.substring(0, 10) +
          String.fromCharCode(i) +
          baseName.substring(10 + 1);

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
          .to.be.revertedWithCustomError(daoRegistry, 'InvalidDaoName')
          .withArgs(subdomainName);
      }
    });

    it('should validate the passed name correctly (> 32 bytes long name)', async () => {
      const baseName =
        'this-is-my-super-looooooooooooooooooooooooooong-valid-name';

      // loop through the ascii table
      for (let i = 0; i < 127; i++) {
        const newTargetDao = await deployNewDAO(ownerAddress);

        // replace the 40th char in the baseName
        const subdomainName =
          baseName.substring(0, 40) +
          String.fromCharCode(i) +
          baseName.substring(40 + 1);

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
          .to.be.revertedWithCustomError(daoRegistry, 'InvalidDaoName')
          .withArgs(subdomainName);
      }
    });
  });
});
