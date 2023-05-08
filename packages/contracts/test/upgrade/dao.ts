import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  DAO,
  DAO__factory,
  DAOV101,
  DAOV101__factory,
  DAOV120,
  DAOV120__factory,
} from '../../typechain';

import {daoExampleURI} from '../test-utils/dao';
import {deployWithProxy} from '../test-utils/proxy';
import {UPGRADE_PERMISSIONS} from '../test-utils/permissions';
import {findEventTopicLog} from '../../utils/event';
import {readImplementationValueFromSlot} from '../../utils/storage';

let signers: SignerWithAddress[];
let Dao_v1_0_1: DAOV101__factory;
let Dao_v1_2_0: DAOV120__factory;
let DaoCurrent: DAO__factory;

let daoV101Proxy: DAOV101;
let daoV120Proxy: DAOV120;

let daoV101Implementation: string;
let daoV120Implementation: string;
let daoCurrentImplementaion: DAO;

const EMPTY_DATA = '0x';

const DUMMY_METADATA = ethers.utils.hexlify(
  ethers.utils.toUtf8Bytes('0x123456789')
);

describe('DAO Upgrade', function () {
  before(async function () {
    signers = await ethers.getSigners();
    Dao_v1_0_1 = new DAOV101__factory(signers[0]);
    Dao_v1_2_0 = new DAOV120__factory(signers[0]);

    DaoCurrent = new DAO__factory(signers[0]); // 1.3.0

    // Deploy the v1.3.0 implementation
    daoCurrentImplementaion = await DaoCurrent.deploy();
  });

  context(`v1.0.1 to v1.3.0`, function () {
    beforeEach(async function () {
      daoV101Proxy = await deployWithProxy<DAOV101>(Dao_v1_0_1);
      await daoV101Proxy.initialize(
        DUMMY_METADATA,
        signers[0].address,
        ethers.constants.AddressZero,
        daoExampleURI
      );

      // Store the v1.0.1 implementation
      daoV101Implementation = await readImplementationValueFromSlot(
        daoV101Proxy.address
      );

      // Grant the upgrade permission
      await daoV101Proxy.grant(
        daoV101Proxy.address,
        signers[0].address,
        UPGRADE_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID
      );
    });

    it('does not corrupt the DAO storage', async () => {
      // Upgrade to the new implementation
      const upgradeTx = await daoV101Proxy.upgradeTo(
        daoCurrentImplementaion.address
      );

      // Check the stored implementation.
      const implementationAfterUpgrade = await readImplementationValueFromSlot(
        daoV101Proxy.address
      );
      expect(implementationAfterUpgrade).to.equal(
        daoCurrentImplementaion.address
      );
      expect(implementationAfterUpgrade).to.not.equal(daoV101Implementation);

      // Check the emitted implementation.
      const emittedImplementation = (
        await findEventTopicLog(upgradeTx, Dao_v1_0_1.interface, 'Upgraded')
      ).args.implementation;
      expect(emittedImplementation).to.equal(daoCurrentImplementaion.address);

      // Check that storage is not corrupted.
      expect(await daoV101Proxy.callStatic.daoURI()).to.equal(daoExampleURI);
    });

    it('does not corrupt permissions', async () => {
      await daoV101Proxy.grant(
        daoV101Proxy.address,
        signers[0].address,
        ethers.utils.id('EXECUTE_PERMISSION')
      );
      await daoV101Proxy.grant(
        daoV101Proxy.address,
        signers[0].address,
        ethers.utils.id('ROOT_PERMISSION')
      );

      // Upgrade to the new implementation
      await daoV101Proxy.upgradeTo(daoCurrentImplementaion.address);

      // Check the stored implementation.
      const implementationAfterUpgrade = await readImplementationValueFromSlot(
        daoV101Proxy.address
      );
      expect(implementationAfterUpgrade).to.equal(
        daoCurrentImplementaion.address
      );
      expect(implementationAfterUpgrade).to.not.equal(daoV101Implementation);

      expect(
        await daoV101Proxy.hasPermission(
          daoV101Proxy.address,
          signers[0].address,
          ethers.utils.id('EXECUTE_PERMISSION'),
          EMPTY_DATA
        )
      ).to.be.true;
      expect(
        await daoV101Proxy.hasPermission(
          daoV101Proxy.address,
          signers[0].address,
          ethers.utils.id('ROOT_PERMISSION'),
          EMPTY_DATA
        )
      ).to.be.true;
    });
  });

  context(`v1.2.0 to v1.3.0`, function () {
    beforeEach(async function () {
      daoV120Proxy = await deployWithProxy<DAOV120>(Dao_v1_2_0);
      await daoV120Proxy.initialize(
        DUMMY_METADATA,
        signers[0].address,
        ethers.constants.AddressZero,
        daoExampleURI
      );

      // Store the v1.2.0 implementation
      daoV120Implementation = await readImplementationValueFromSlot(
        daoV120Proxy.address
      );

      // Grant the upgrade permission
      await daoV120Proxy.grant(
        daoV120Proxy.address,
        signers[0].address,
        UPGRADE_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID
      );
    });

    it('does not corrupt the DAO storage', async () => {
      // Upgrade to the new implementation
      const upgradeTx = await daoV120Proxy.upgradeTo(
        daoCurrentImplementaion.address
      );

      // Check the stored implementation.
      const implementationAfterUpgrade = await readImplementationValueFromSlot(
        daoV120Proxy.address
      );
      expect(implementationAfterUpgrade).to.equal(
        daoCurrentImplementaion.address
      );
      expect(implementationAfterUpgrade).to.not.equal(daoV120Implementation);

      // Check the emitted implementation.
      const emittedImplementation = (
        await findEventTopicLog(upgradeTx, Dao_v1_2_0.interface, 'Upgraded')
      ).args.implementation;
      expect(emittedImplementation).to.equal(daoCurrentImplementaion.address);

      // Check that storage is not corrupted.
      expect(await daoV120Proxy.callStatic.daoURI()).to.equal(daoExampleURI);
    });

    it('does not corrupt permissions', async () => {
      await daoV120Proxy.grant(
        daoV120Proxy.address,
        signers[0].address,
        ethers.utils.id('EXECUTE_PERMISSION')
      );
      await daoV120Proxy.grant(
        daoV120Proxy.address,
        signers[0].address,
        ethers.utils.id('ROOT_PERMISSION')
      );

      // Upgrade to the new implementation
      await daoV120Proxy.upgradeTo(daoCurrentImplementaion.address);

      // Check the stored implementation.
      const implementationAfterUpgrade = await readImplementationValueFromSlot(
        daoV120Proxy.address
      );
      expect(implementationAfterUpgrade).to.equal(
        daoCurrentImplementaion.address
      );
      expect(implementationAfterUpgrade).to.not.equal(daoV120Implementation);

      expect(
        await daoV120Proxy.hasPermission(
          daoV120Proxy.address,
          signers[0].address,
          ethers.utils.id('EXECUTE_PERMISSION'),
          EMPTY_DATA
        )
      ).to.be.true;
      expect(
        await daoV120Proxy.hasPermission(
          daoV120Proxy.address,
          signers[0].address,
          ethers.utils.id('ROOT_PERMISSION'),
          EMPTY_DATA
        )
      ).to.be.true;
    });
  });
});
