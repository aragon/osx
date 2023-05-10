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

import {daoExampleURI, ZERO_BYTES32} from '../test-utils/dao';
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

const FORWARDER_1 = `0x${'1'.repeat(40)}`;
const FORWARDER_2 = `0x${'2'.repeat(40)}`;

describe.only('DAO Upgrade', function () {
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

    it('executes actions after the upgrade', async () => {
      await daoV101Proxy.grant(
        daoV101Proxy.address,
        signers[0].address,
        ethers.utils.id('EXECUTE_PERMISSION')
      );

      // We use the `setTrustedForwarder` to test execution and must give permission to the DAO (executor) to call it.
      await daoV101Proxy.grant(
        daoV101Proxy.address,
        daoV101Proxy.address,
        ethers.utils.id('SET_TRUSTED_FORWARDER_PERMISSION')
      );

      // Create an action to set forwarder1
      const forwarderChangeAction1 = {
        to: daoV101Proxy.address,
        data: daoV101Proxy.interface.encodeFunctionData('setTrustedForwarder', [
          FORWARDER_1,
        ]),
        value: 0,
      };

      // Execute and check in the event that the forwarder1 has been set.
      await expect(
        daoV101Proxy.execute(ZERO_BYTES32, [forwarderChangeAction1], 0)
      )
        .to.emit(daoV101Proxy, 'TrustedForwarderSet')
        .withArgs(FORWARDER_1);

      // Check that the storage variable now forwarder 1.
      expect(await daoV101Proxy.getTrustedForwarder()).to.equal(FORWARDER_1);

      // Upgrade to the new implementation
      await daoV101Proxy.upgradeTo(daoCurrentImplementaion.address);

      // Check that the stored implementatio has changed.
      const implementationAfterUpgrade = await readImplementationValueFromSlot(
        daoV101Proxy.address
      );
      expect(implementationAfterUpgrade).to.equal(
        daoCurrentImplementaion.address
      );
      expect(implementationAfterUpgrade).to.not.equal(daoV101Implementation);

      // Check that the old forwarder is still unchanged.
      expect(await daoV101Proxy.getTrustedForwarder()).to.equal(FORWARDER_1);

      // Create an action to change the forwarder to a new address.
      const testAction = {
        to: daoV101Proxy.address,
        data: daoV101Proxy.interface.encodeFunctionData('setTrustedForwarder', [
          FORWARDER_2,
        ]),
        value: 0,
      };

      // Execute and check in the event that the forwarder1 has been set.
      await expect(daoV101Proxy.execute(ZERO_BYTES32, [testAction], 0))
        .to.emit(daoV101Proxy, 'TrustedForwarderSet')
        .withArgs(FORWARDER_2);

      // Check that the storage variable is now forwarder 2.
      expect(await daoV101Proxy.getTrustedForwarder()).to.equal(FORWARDER_2);
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

    it('executes actions after the upgrade', async () => {
      await daoV120Proxy.grant(
        daoV120Proxy.address,
        signers[0].address,
        ethers.utils.id('EXECUTE_PERMISSION')
      );

      // We use the `setTrustedForwarder` to test execution and must give permission to the DAO (executor) to call it.
      await daoV120Proxy.grant(
        daoV120Proxy.address,
        daoV120Proxy.address,
        ethers.utils.id('SET_TRUSTED_FORWARDER_PERMISSION')
      );

      // Create an action to set forwarder1
      const forwarderChangeAction1 = {
        to: daoV120Proxy.address,
        data: daoV120Proxy.interface.encodeFunctionData('setTrustedForwarder', [
          FORWARDER_1,
        ]),
        value: 0,
      };

      // Execute and check in the event that the forwarder1 has been set.
      await expect(
        daoV120Proxy.execute(ZERO_BYTES32, [forwarderChangeAction1], 0)
      )
        .to.emit(daoV120Proxy, 'TrustedForwarderSet')
        .withArgs(FORWARDER_1);

      // Check that the storage variable now forwarder 1.
      expect(await daoV120Proxy.getTrustedForwarder()).to.equal(FORWARDER_1);

      // Upgrade to the new implementation
      await daoV120Proxy.upgradeTo(daoCurrentImplementaion.address);

      // Check that the stored implementatio has changed.
      const implementationAfterUpgrade = await readImplementationValueFromSlot(
        daoV120Proxy.address
      );
      expect(implementationAfterUpgrade).to.equal(
        daoCurrentImplementaion.address
      );
      expect(implementationAfterUpgrade).to.not.equal(daoV101Implementation);

      // Check that the old forwarder is still unchanged.
      expect(await daoV120Proxy.getTrustedForwarder()).to.equal(FORWARDER_1);

      // Create an action to change the forwarder to a new address.
      const testAction = {
        to: daoV120Proxy.address,
        data: daoV120Proxy.interface.encodeFunctionData('setTrustedForwarder', [
          FORWARDER_2,
        ]),
        value: 0,
      };

      // Execute and check in the event that the forwarder1 has been set.
      await expect(daoV120Proxy.execute(ZERO_BYTES32, [testAction], 0))
        .to.emit(daoV120Proxy, 'TrustedForwarderSet')
        .withArgs(FORWARDER_2);

      // Check that the storage variable is now forwarder 2.
      expect(await daoV120Proxy.getTrustedForwarder()).to.equal(FORWARDER_2);
    });
  });
});
