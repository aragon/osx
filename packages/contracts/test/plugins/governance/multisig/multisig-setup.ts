import {expect} from 'chai';
import {ethers} from 'hardhat';

import {DAO, MultisigSetup, Multisig__factory} from '../../../../typechain';
import {deployNewDAO} from '../../../test-utils/dao';
import {getInterfaceID} from '../../../test-utils/interfaces';
import {Operation} from '../../../../utils/types';
import metadata from '../../../../src/plugins/governance/multisig/build-metadata.json';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {MultisigSettings, multisigInterface} from './multisig';

const abiCoder = ethers.utils.defaultAbiCoder;
const AddressZero = ethers.constants.AddressZero;
const EMPTY_DATA = '0x';

let defaultMultisigSettings: MultisigSettings;

// Permissions
const UPDATE_MULTISIG_SETTINGS_PERMISSION_ID = ethers.utils.id(
  'UPDATE_MULTISIG_SETTINGS_PERMISSION'
);
const UPGRADE_PLUGIN_PERMISSION_ID_ID = ethers.utils.id(
  'UPGRADE_PLUGIN_PERMISSION'
);
const EXECUTE_PERMISSION_ID = ethers.utils.id('EXECUTE_PERMISSION');

describe('MultisigSetup', function () {
  let signers: SignerWithAddress[];
  let multisigSetup: MultisigSetup;
  let MultisigFactory: Multisig__factory;
  let implementationAddress: string;
  let targetDao: DAO;
  let minimum_data: any;

  before(async () => {
    signers = await ethers.getSigners();
    targetDao = await deployNewDAO(signers[0].address);

    defaultMultisigSettings = {
      onlyListed: true,
      minApprovals: 1,
    };

    minimum_data = abiCoder.encode(
      metadata.pluginSetupABI.prepareInstallation,
      [[signers[0].address], Object.values(defaultMultisigSettings)]
    );

    const MultisigSetup = await ethers.getContractFactory('MultisigSetup');
    multisigSetup = await MultisigSetup.deploy();

    MultisigFactory = await ethers.getContractFactory('Multisig');

    implementationAddress = await multisigSetup.implementation();
  });

  it('creates multisig base with the correct interface', async () => {
    const factory = await ethers.getContractFactory('Multisig');
    const multisigContract = factory.attach(implementationAddress);

    expect(
      await multisigContract.supportsInterface(
        getInterfaceID(multisigInterface)
      )
    ).to.be.true;
  });

  describe('prepareInstallation', async () => {
    it('fails if data is empty, or not of minimum length', async () => {
      await expect(
        multisigSetup.prepareInstallation(targetDao.address, EMPTY_DATA)
      ).to.be.reverted;

      await expect(
        multisigSetup.prepareInstallation(
          targetDao.address,
          minimum_data.substring(0, minimum_data.length - 2)
        )
      ).to.be.reverted;

      await expect(
        multisigSetup.prepareInstallation(targetDao.address, minimum_data)
      ).not.to.be.reverted;
    });

    it('reverts if zero members are provided in `_data`', async () => {
      const noMembers: string[] = [];

      const wrongPrepareInstallationData = abiCoder.encode(
        metadata.pluginSetupABI.prepareInstallation,
        [noMembers, defaultMultisigSettings]
      );

      const nonce = await ethers.provider.getTransactionCount(
        multisigSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: multisigSetup.address,
        nonce,
      });

      const multisig = MultisigFactory.attach(anticipatedPluginAddress);

      await expect(
        multisigSetup.prepareInstallation(
          targetDao.address,
          wrongPrepareInstallationData
        )
      )
        .to.be.revertedWithCustomError(multisig, 'MinApprovalsOutOfBounds')
        .withArgs(0, 1);
    });

    it('reverts if the `minApprovals` value in `_data` is zero', async () => {
      const multisigSettings: MultisigSettings = {
        onlyListed: true,
        minApprovals: 0,
      };
      const members = [signers[0].address];

      const wrongPrepareInstallationData = abiCoder.encode(
        metadata.pluginSetupABI.prepareInstallation,
        [members, multisigSettings]
      );

      const nonce = await ethers.provider.getTransactionCount(
        multisigSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: multisigSetup.address,
        nonce,
      });
      const multisig = MultisigFactory.attach(anticipatedPluginAddress);

      await expect(
        multisigSetup.prepareInstallation(
          targetDao.address,
          wrongPrepareInstallationData
        )
      )
        .to.be.revertedWithCustomError(multisig, 'MinApprovalsOutOfBounds')
        .withArgs(1, 0);
    });

    it('reverts if the `minApprovals` value in `_data` is greater than the number members', async () => {
      const multisigSettings: MultisigSettings = {
        onlyListed: true,
        minApprovals: 2,
      };
      const members = [signers[0].address];

      const wrongPrepareInstallationData = abiCoder.encode(
        metadata.pluginSetupABI.prepareInstallation,
        [members, multisigSettings]
      );

      const nonce = await ethers.provider.getTransactionCount(
        multisigSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: multisigSetup.address,
        nonce,
      });
      const multisig = MultisigFactory.attach(anticipatedPluginAddress);

      await expect(
        multisigSetup.prepareInstallation(
          targetDao.address,
          wrongPrepareInstallationData
        )
      )
        .to.be.revertedWithCustomError(multisig, 'MinApprovalsOutOfBounds')
        .withArgs(members.length, multisigSettings.minApprovals);
    });

    it('returns the plugin, helpers, and permissions', async () => {
      const nonce = await ethers.provider.getTransactionCount(
        multisigSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: multisigSetup.address,
        nonce,
      });

      const {
        plugin,
        preparedSetupData: {helpers, permissions},
      } = await multisigSetup.callStatic.prepareInstallation(
        targetDao.address,
        minimum_data
      );

      expect(plugin).to.be.equal(anticipatedPluginAddress);
      expect(helpers.length).to.be.equal(0);
      expect(permissions.length).to.be.equal(3);
      expect(permissions).to.deep.equal([
        [
          Operation.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPDATE_MULTISIG_SETTINGS_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PLUGIN_PERMISSION_ID_ID,
        ],
        [
          Operation.Grant,
          targetDao.address,
          plugin,
          AddressZero,
          EXECUTE_PERMISSION_ID,
        ],
      ]);
    });

    it('sets up the plugin', async () => {
      const daoAddress = targetDao.address;

      const nonce = await ethers.provider.getTransactionCount(
        multisigSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: multisigSetup.address,
        nonce,
      });

      await multisigSetup.prepareInstallation(daoAddress, minimum_data);

      const factory = await ethers.getContractFactory('Multisig');
      const multisigContract = factory.attach(anticipatedPluginAddress);

      expect(await multisigContract.dao()).to.eq(daoAddress);
      expect(await multisigContract.addresslistLength()).to.be.eq(1);
      const settings = await multisigContract.multisigSettings();
      expect(settings.onlyListed).to.be.true;
      expect(settings.minApprovals).to.eq(1);
    });
  });

  describe('prepareUninstallation', async () => {
    it('correctly returns permissions', async () => {
      const plugin = ethers.Wallet.createRandom().address;

      const permissions = await multisigSetup.callStatic.prepareUninstallation(
        targetDao.address,
        {
          plugin,
          currentHelpers: [],
          data: EMPTY_DATA,
        }
      );

      expect(permissions.length).to.be.equal(3);
      expect(permissions).to.deep.equal([
        [
          Operation.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          UPDATE_MULTISIG_SETTINGS_PERMISSION_ID,
        ],
        [
          Operation.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PLUGIN_PERMISSION_ID_ID,
        ],
        [
          Operation.Revoke,
          targetDao.address,
          plugin,
          AddressZero,
          EXECUTE_PERMISSION_ID,
        ],
      ]);
    });
  });
});
