import {DAO, ProtocolVersion__factory} from '../../typechain';
import {
  DAO as DAO_V1_0_0,
  DAO__factory as DAO_V1_0_0__factory,
} from '../../typechain/@aragon/osx-v1.0.1/core/dao/DAO.sol';
import {
  DAO as DAO_V1_3_0,
  DAO__factory as DAO_V1_3_0__factory,
} from '../../typechain/@aragon/osx-v1.3.0/core/dao/DAO.sol';
import {UpgradedEvent} from '../../typechain/DAO';
import {readStorage, ERC1967_IMPLEMENTATION_SLOT} from '../../utils/storage';
import {daoExampleURI, ZERO_BYTES32} from '../test-utils/dao';
import {deployWithProxy} from '../test-utils/proxy';
import {
  IMPLICIT_INITIAL_PROTOCOL_VERSION,
  findEventTopicLog,
} from '@aragon/osx-commons-sdk';
import {DAO_PERMISSIONS} from '@aragon/osx-commons-sdk';
import {getInterfaceId} from '@aragon/osx-commons-sdk';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ethers} from 'hardhat';

let signers: SignerWithAddress[];

let daoV100Proxy: DAO_V1_0_0;
let daoV100Implementation: DAO_V1_0_0;
let daoV130Implementation: DAO_V1_3_0;

const EMPTY_DATA = '0x';

const DUMMY_METADATA = ethers.utils.hexlify(
  ethers.utils.toUtf8Bytes('0x123456789')
);

const FORWARDER_1 = `0x${'1'.repeat(40)}`;
const FORWARDER_2 = `0x${'2'.repeat(40)}`;

describe('DAO Upgrade', function () {
  before(async function () {
    signers = await ethers.getSigners();

    // Deploy the v1.3.0 implementation
    daoV130Implementation = await new DAO_V1_3_0__factory(signers[0]).deploy();
  });

  context(`Re-entrancy`, function () {
    context(`v1.0.0 to v1.3.0`, function () {
      beforeEach(async function () {
        daoV100Proxy = await deployWithProxy<DAO_V1_0_0>(
          new DAO_V1_0_0__factory(signers[0])
        );
        await daoV100Proxy.initialize(
          DUMMY_METADATA,
          signers[0].address,
          ethers.constants.AddressZero,
          daoExampleURI
        );

        // Store the v1.0.0 implementation
        daoV100Implementation = new DAO_V1_0_0__factory(signers[0]).attach(
          await readStorage(daoV100Proxy.address, ERC1967_IMPLEMENTATION_SLOT, [
            'address',
          ])
        );

        // Grant the upgrade permission
        await daoV100Proxy.grant(
          daoV100Proxy.address,
          signers[0].address,
          DAO_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID
        );
      });

      it('does not corrupt the DAO storage', async () => {
        // Upgrade and call `initializeFrom`.
        const upgradeTx = await daoV100Proxy.upgradeToAndCall(
          daoV130Implementation.address,
          daoV130Implementation.interface.encodeFunctionData('initializeFrom', [
            IMPLICIT_INITIAL_PROTOCOL_VERSION,
            EMPTY_DATA,
          ])
        );

        // Check the stored implementation.
        const implementationAfterUpgrade = await readStorage(
          daoV100Proxy.address,
          ERC1967_IMPLEMENTATION_SLOT,
          ['address']
        );
        expect(implementationAfterUpgrade).to.equal(
          daoV130Implementation.address
        );
        expect(implementationAfterUpgrade).to.not.equal(daoV100Implementation);

        // Check the emitted implementation.
        const emittedImplementation = findEventTopicLog<UpgradedEvent>(
          await upgradeTx.wait(),
          daoV130Implementation.interface,
          'Upgraded'
        ).args.implementation;
        expect(emittedImplementation).to.equal(daoV130Implementation.address);

        // Check that storage is not corrupted.
        expect(await daoV100Proxy.callStatic.daoURI()).to.equal(daoExampleURI);
      });

      it('does not corrupt permissions', async () => {
        await daoV100Proxy.grant(
          daoV100Proxy.address,
          signers[0].address,
          ethers.utils.id('EXECUTE_PERMISSION')
        );

        // Check that permissions are granted before the upgrade
        expect(
          await daoV100Proxy.hasPermission(
            daoV100Proxy.address,
            signers[0].address,
            ethers.utils.id('EXECUTE_PERMISSION'),
            EMPTY_DATA
          )
        ).to.be.true;
        expect(
          await daoV100Proxy.hasPermission(
            daoV100Proxy.address,
            signers[0].address,
            ethers.utils.id('ROOT_PERMISSION'),
            EMPTY_DATA
          )
        ).to.be.true;

        // Check that a arbitrary permission is not granted.
        expect(
          await daoV100Proxy.hasPermission(
            daoV100Proxy.address,
            signers[0].address,
            ethers.utils.id('NOT_GRANTED'),
            EMPTY_DATA
          )
        ).to.be.false;

        // Upgrade and call `initializeFrom`.
        await daoV100Proxy.upgradeToAndCall(
          daoV130Implementation.address,
          daoV130Implementation.interface.encodeFunctionData('initializeFrom', [
            IMPLICIT_INITIAL_PROTOCOL_VERSION,
            EMPTY_DATA,
          ])
        );

        // Check the stored implementation.
        const implementationAfterUpgrade = await readStorage(
          daoV100Proxy.address,
          ERC1967_IMPLEMENTATION_SLOT,
          ['address']
        );
        expect(implementationAfterUpgrade).to.equal(
          daoV130Implementation.address
        );
        expect(implementationAfterUpgrade).to.not.equal(daoV100Implementation);

        // Check that the permissions are still granted.
        expect(
          await daoV100Proxy.hasPermission(
            daoV100Proxy.address,
            signers[0].address,
            ethers.utils.id('EXECUTE_PERMISSION'),
            EMPTY_DATA
          )
        ).to.be.true;
        expect(
          await daoV100Proxy.hasPermission(
            daoV100Proxy.address,
            signers[0].address,
            ethers.utils.id('ROOT_PERMISSION'),
            EMPTY_DATA
          )
        ).to.be.true;

        // Check that a the arbitrary permission is still not granted.
        expect(
          await daoV100Proxy.hasPermission(
            daoV100Proxy.address,
            signers[0].address,
            ethers.utils.id('NOT_GRANTED'),
            EMPTY_DATA
          )
        ).to.be.false;
      });

      it('executes actions after the upgrade', async () => {
        await daoV100Proxy.grant(
          daoV100Proxy.address,
          signers[0].address,
          ethers.utils.id('EXECUTE_PERMISSION')
        );

        // We use the `setTrustedForwarder` to test execution and must give permission to the DAO (executor) to call it.
        await daoV100Proxy.grant(
          daoV100Proxy.address,
          daoV100Proxy.address,
          ethers.utils.id('SET_TRUSTED_FORWARDER_PERMISSION')
        );

        // Create an action to set forwarder1
        const forwarderChangeAction1 = {
          to: daoV100Proxy.address,
          data: daoV100Proxy.interface.encodeFunctionData(
            'setTrustedForwarder',
            [FORWARDER_1]
          ),
          value: 0,
        };

        // Execute and check in the event that the forwarder1 has been set.
        await expect(
          daoV100Proxy.execute(ZERO_BYTES32, [forwarderChangeAction1], 0)
        )
          .to.emit(daoV100Proxy, 'TrustedForwarderSet')
          .withArgs(FORWARDER_1);

        // Check that the storage variable now forwarder 1.
        expect(await daoV100Proxy.getTrustedForwarder()).to.equal(FORWARDER_1);

        // Upgrade and call `initializeFrom`.
        await daoV100Proxy.upgradeToAndCall(
          daoV130Implementation.address,
          daoV130Implementation.interface.encodeFunctionData('initializeFrom', [
            IMPLICIT_INITIAL_PROTOCOL_VERSION,
            EMPTY_DATA,
          ])
        );

        // Check that the stored implementation has changed.
        const implementationAfterUpgrade = await readStorage(
          daoV100Proxy.address,
          ERC1967_IMPLEMENTATION_SLOT,
          ['address']
        );
        expect(implementationAfterUpgrade).to.equal(
          daoV130Implementation.address
        );
        expect(implementationAfterUpgrade).to.not.equal(daoV100Implementation);

        // Check that the old forwarder is still unchanged.
        expect(await daoV100Proxy.getTrustedForwarder()).to.equal(FORWARDER_1);

        // Create an action to change the forwarder to a new address.
        const testAction = {
          to: daoV100Proxy.address,
          data: daoV100Proxy.interface.encodeFunctionData(
            'setTrustedForwarder',
            [FORWARDER_2]
          ),
          value: 0,
        };

        // Execute and check in the event that the forwarder1 has been set.
        await expect(daoV100Proxy.execute(ZERO_BYTES32, [testAction], 0))
          .to.emit(daoV100Proxy, 'TrustedForwarderSet')
          .withArgs(FORWARDER_2);

        // Check that the storage variable is now forwarder 2.
        expect(await daoV100Proxy.getTrustedForwarder()).to.equal(FORWARDER_2);
      });
    });
  });

  context(`Protocol Version`, function () {
    beforeEach(async function () {
      // prepare v1.0.0
      daoV100Proxy = await deployWithProxy<DAO_V1_0_0>(
        new DAO_V1_0_0__factory(signers[0])
      );
      await daoV100Proxy.initialize(
        DUMMY_METADATA,
        signers[0].address,
        ethers.constants.AddressZero,
        daoExampleURI
      );

      // Grant the upgrade permission
      await daoV100Proxy.grant(
        daoV100Proxy.address,
        signers[0].address,
        DAO_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID
      );
    });

    it('fails to call protocolVersion on versions prior to v1.3.0 and succeeds from v1.3.0 onwards', async () => {
      // deploy the different versions
      const daoCurrentProxy = await deployWithProxy<DAO>(
        new DAO_V1_3_0__factory(signers[0])
      );
      await daoCurrentProxy.initialize(
        DUMMY_METADATA,
        signers[0].address,
        ethers.constants.AddressZero,
        daoExampleURI
      );

      const protocolVersionSelector = new ethers.utils.Interface(
        daoCurrentProxy.interface.fragments
      ).getSighash('protocolVersion');

      // for DAO prior to v1.3.0
      const daoV100 = ProtocolVersion__factory.connect(
        daoV100Proxy.address,
        signers[0]
      );

      await expect(daoV100.protocolVersion())
        .to.be.revertedWithCustomError(daoV100Proxy, 'UnknownCallback')
        .withArgs(protocolVersionSelector, '0x00000000');

      // for DAO v1.3.0 onward
      const daoV130 = ProtocolVersion__factory.connect(
        daoCurrentProxy.address,
        signers[0]
      );

      await expect(daoV130.protocolVersion()).to.not.be.reverted;
    });

    context('v1.0.0 to v1.3.0', function () {
      it('supports new protocol version interface after upgrade', async () => {
        // check that the old version do not support protocol version interface
        const protocolVersionInterface =
          ProtocolVersion__factory.createInterface();

        expect(
          await daoV100Proxy.supportsInterface(
            getInterfaceId(protocolVersionInterface)
          )
        ).to.be.eq(false);

        // Upgrade and call `initializeFrom`.
        await daoV100Proxy.upgradeToAndCall(
          daoV130Implementation.address,
          daoV130Implementation.interface.encodeFunctionData('initializeFrom', [
            IMPLICIT_INITIAL_PROTOCOL_VERSION,
            EMPTY_DATA,
          ])
        );

        // check the interface is registered.
        expect(
          await daoV100Proxy.supportsInterface(
            getInterfaceId(protocolVersionInterface)
          )
        ).to.be.eq(true);
      });

      it('returns the correct protocol version after upgrade', async () => {
        // Upgrade and call `initializeFrom`.
        await daoV100Proxy.upgradeToAndCall(
          daoV130Implementation.address,
          daoV130Implementation.interface.encodeFunctionData('initializeFrom', [
            IMPLICIT_INITIAL_PROTOCOL_VERSION,
            EMPTY_DATA,
          ])
        );

        const daoV130 = new DAO_V1_3_0__factory(signers[0]).attach(
          daoV100Proxy.address
        );
        expect(await daoV130.protocolVersion()).to.be.deep.eq([1, 3, 0]);
      });
    });
  });
});
