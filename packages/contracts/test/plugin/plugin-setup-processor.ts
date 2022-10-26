import {expect} from 'chai';
import console from 'console';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  PluginSetupProcessor,
  PluginCloneableMock,
  PluginSetupV1Mock,
  PluginSetupV2Mock,
  PluginSetupV1MockBad,
  PluginRepoRegistry,
  PluginRepo,
} from '../../typechain';

import {customError} from '../test-utils/custom-error-helper';
import {deployENSSubdomainRegistrar} from '../test-utils/ens';

import {deployNewDAO} from '../test-utils/dao';
import {findEvent} from '../../utils/event';
import {
  deployPluginSetupProcessor,
  prepareInstallation,
} from '../test-utils/plugin-setup-processor';
import {
  deployPluginRepoFactory,
  deployPluginRepoRegistry,
} from '../test-utils/repo';

enum Op {
  Grant,
  Revoke,
  Freeze,
  GrantWithOracle,
}

const EVENTS = {
  InstallationPrepared: 'InstallationPrepared',
  InstallationApplied: 'InstallationApplied',
  UpdatePrepared: 'UpdatePrepared',
  UpdateApplied: 'UpdateApplied',
  UninstallationPrepared: 'UninstallationPrepared',
  UninstallationApplied: 'UninstallationApplied',
  PluginRepoRegistered: 'PluginRepoRegistered',
  Granted: 'Granted',
  Revoked: 'Revoked',
};

const EMPTY_DATA = '0x';

const AddressZero = ethers.constants.AddressZero;
const ADDRESS_TWO = `0x${'00'.repeat(19)}02`;

const EMPTY_ID = `0x${'00'.repeat(32)}`;

const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION');
const APPLY_INSTALLATION_PERMISSION_ID = ethers.utils.id(
  'APPLY_INSTALLATION_PERMISSION'
);
const APPLY_UPDATE_PERMISSION_ID = ethers.utils.id('APPLY_UPDATE_PERMISSION');
const APPLY_UNINSTALLATION_PERMISSION_ID = ethers.utils.id(
  'APPLY_UNINSTALLATION_PERMISSION'
);
const SET_REPO_REGISTRY_PERMISSION_ID = ethers.utils.id(
  'SET_REPO_REGISTRY_PERMISSION'
);
const REGISTER_PLUGIN_REPO_PERMISSION_ID = ethers.utils.id(
  'REGISTER_PLUGIN_REPO_PERMISSION'
);
const UPGRADE_PLUGIN_PERMISSION_ID = ethers.utils.id(
  'UPGRADE_PLUGIN_PERMISSION'
);

const REGISTER_ENS_SUBDOMAIN_PERMISSION_ID = ethers.utils.id(
  'REGISTER_ENS_SUBDOMAIN_PERMISSION'
);

let counter = 0;

describe('Plugin Setup Processor', function () {
  let signers: SignerWithAddress[];
  let psp: PluginSetupProcessor;
  let pluginRepo: PluginRepo;
  let pluginCloneableMock: PluginCloneableMock;
  let pluginSetupV1Mock: PluginSetupV1Mock;
  let pluginSetupMockRepoAddress: any;
  let pluginSetupV2Mock: PluginSetupV2Mock;
  let pluginSetupV1MockBad: PluginSetupV1MockBad;
  let ownerAddress: string;
  let targetDao: any;
  let managingDao: any;
  let pluginRepoFactory: any;
  let pluginRepoRegistry: PluginRepoRegistry;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  before(async () => {
    // Directly deploy PluginCloneableMock
    const _PluginCloneableMock = await ethers.getContractFactory(
      'PluginCloneableMock'
    );
    pluginCloneableMock = await _PluginCloneableMock.deploy();

    // PluginSetupV1
    const PluginSetupV1Mock = await ethers.getContractFactory(
      'PluginSetupV1Mock'
    );
    pluginSetupV1Mock = await PluginSetupV1Mock.deploy();

    // PluginSetupV2
    const PluginSetupV2Mock = await ethers.getContractFactory(
      'PluginSetupV2Mock'
    );
    pluginSetupV2Mock = await PluginSetupV2Mock.deploy();

    // Managing DAO that have permission to manage PluginSetupProcessor
    managingDao = await deployNewDAO(ownerAddress);

    // ENS subdomain Registry
    const ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
      signers[0],
      managingDao,
      'dao.eth'
    );

    // Plugin Repo Registry
    pluginRepoRegistry = await deployPluginRepoRegistry(
      managingDao,
      ensSubdomainRegistrar
    );

    // Plugin Repo Factory
    pluginRepoFactory = await deployPluginRepoFactory(
      signers,
      pluginRepoRegistry
    );

    // Grant `PLUGIN_REGISTER_PERMISSION` to `PluginRepoFactory`.
    await managingDao.grant(
      pluginRepoRegistry.address,
      pluginRepoFactory.address,
      REGISTER_PLUGIN_REPO_PERMISSION_ID
    );

    // Grant `REGISTER_ENS_SUBDOMAIN_PERMISSION` to `PluginRepoFactory`.
    await managingDao.grant(
      ensSubdomainRegistrar.address,
      pluginRepoRegistry.address,
      REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
    );

    // Plugin Setup Processor
    psp = await deployPluginSetupProcessor(managingDao, pluginRepoRegistry);
  });

  beforeEach(async function () {
    // Target DAO to be used as an example DAO
    targetDao = await deployNewDAO(ownerAddress);

    // Create and register a plugin on the PluginRepoRegistry
    const tx = await pluginRepoFactory.createPluginRepoWithVersion(
      `PluginSetupV1Mock-${counter}`,
      [1, 0, 0],
      pluginSetupV1Mock.address,
      '0x00',
      ownerAddress
    );

    counter++;

    const event = await findEvent(tx, EVENTS.PluginRepoRegistered);

    pluginSetupMockRepoAddress = event.args.pluginRepo;

    // Add PluginSetupV2Mock to the PluginRepo.
    const PluginRepo = await ethers.getContractFactory('PluginRepo');
    pluginRepo = PluginRepo.attach(pluginSetupMockRepoAddress);
    await pluginRepo.createVersion(
      [2, 0, 0],
      pluginSetupV2Mock.address,
      '0x00'
    );

    const PluginSetupV1MockBad = await ethers.getContractFactory(
      'PluginSetupV1MockBad'
    );
    pluginSetupV1MockBad = await PluginSetupV1MockBad.deploy();

    // register the bad plugin setup on `PluginRepoRegistry`.
    await pluginRepo.createVersion(
      [3, 0, 0],
      pluginSetupV1MockBad.address,
      '0x00'
    );

    // Grant
    await targetDao.grant(targetDao.address, psp.address, ROOT_PERMISSION_ID);
  });

  describe('Install Plugin', function () {
    beforeEach(async () => {
      // Grant necessary permission to `ownerAddress` so it can install plugin on behalf of the DAO,
      // this way we don't have to create DAO execute call.
      await targetDao.grant(
        psp.address,
        ownerAddress,
        APPLY_INSTALLATION_PERMISSION_ID
      );
    });

    describe('PrepareInstallation', function () {
      it('reverts if `PluginSetupRepo` do not exist on `PluginRepoRegistry`', async () => {
        const data = '0x';
        const pluginSetupRepoAddr = ADDRESS_TWO;

        await expect(
          psp.prepareInstallation(
            targetDao.address,
            pluginSetupV1Mock.address,
            pluginSetupRepoAddr,
            data
          )
        ).to.be.revertedWith(customError('EmptyPluginRepo'));
      });

      it('reverts if installation already prepared', async () => {
        const pluginSetupBad = pluginSetupV1MockBad.address;

        const data1 = ethers.utils.defaultAbiCoder.encode(
          ['address'],
          [AddressZero]
        );
        const {plugin, prepareInstallpermissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetupBad,
          pluginSetupMockRepoAddress,
          data1
        );

        const data2 = ethers.utils.defaultAbiCoder.encode(
          ['address'],
          [plugin]
        );

        await expect(
          psp.prepareInstallation(
            targetDao.address,
            pluginSetupBad,
            pluginSetupMockRepoAddress,
            data2
          )
        ).to.be.revertedWith(customError('SetupAlreadyPrepared'));
      });

      it('retruns correctly the plugin, helpers, and permissions', async () => {
        const {plugin, helpers, permissions} =
          await psp.callStatic.prepareInstallation(
            targetDao.address,
            pluginSetupV1Mock.address,
            pluginSetupMockRepoAddress,
            EMPTY_DATA
          );

        expect(plugin).not.to.be.equal(AddressZero);
        expect(helpers.length).to.be.equal(1);
        expect(permissions).to.deep.equal([
          [
            Op.Grant,
            targetDao.address,
            plugin,
            AddressZero,
            ethers.utils.id('EXECUTE_PERMISSION'),
          ],
          [
            Op.Grant,
            plugin,
            helpers[0],
            AddressZero,
            ethers.utils.id('SETTINGS_PERMISSION'),
          ],
        ]);
      });
    });

    describe('ApplyInstallation', function () {
      it('reverts if caller does not have `APPLY_INSTALLATION_PERMISSION`', async () => {
        // revoke `APPLY_INSTALLATION_PERMISSION_ID` on dao for plugin installer
        // to see that it can't set permissions without it.
        await targetDao.revoke(
          psp.address,
          ownerAddress,
          APPLY_INSTALLATION_PERMISSION_ID
        );

        const pluginSetup = pluginSetupV1Mock.address;

        const {plugin, prepareInstallpermissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetup,
          pluginSetupMockRepoAddress,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetup,
            pluginSetupMockRepoAddress,
            plugin,
            prepareInstallpermissions
          )
        ).to.be.revertedWith(
          customError(
            'SetupApplicationUnauthorized',
            targetDao.address,
            ownerAddress,
            APPLY_INSTALLATION_PERMISSION_ID
          )
        );
      });

      it("reverts if PluginSetupProcessor does not have DAO's `ROOT_PERMISSION`", async () => {
        // revoke root permission on dao for plugin installer
        // to see that it can't set permissions without it.
        await targetDao.revoke(
          targetDao.address,
          psp.address,
          ROOT_PERMISSION_ID
        );

        const pluginSetup = pluginSetupV1Mock.address;

        const {plugin, prepareInstallpermissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetup,
          pluginSetupMockRepoAddress,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetup,
            pluginSetupMockRepoAddress,
            plugin,
            prepareInstallpermissions
          )
        ).to.be.revertedWith(
          customError(
            'Unauthorized',
            targetDao.address,
            targetDao.address,
            psp.address,
            ROOT_PERMISSION_ID
          )
        );
      });

      it('reverts if plugin setup return the same address', async () => {
        const pluginSetupBad = pluginSetupV1MockBad.address;

        const dataUser1 = ethers.utils.defaultAbiCoder.encode(
          ['address'],
          [AddressZero]
        );
        const {plugin, prepareInstallpermissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetupBad,
          pluginSetupMockRepoAddress,
          dataUser1
        );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetupBad,
          pluginSetupMockRepoAddress,
          plugin,
          prepareInstallpermissions
        );

        // user2 tries to prepare bad installation with the same plugin address.
        const dataUser2 = ethers.utils.defaultAbiCoder.encode(
          ['address'],
          [plugin]
        );

        const secondPreparation = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetupBad,
          pluginSetupMockRepoAddress,
          dataUser2
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetupBad,
            pluginSetupMockRepoAddress,
            secondPreparation.plugin,
            secondPreparation.prepareInstallpermissions
          )
        ).to.be.revertedWith(customError('SetupAlreadyApplied'));
      });

      it('correctly complete an instaltion process', async () => {
        const pluginSetup = pluginSetupV1Mock.address;

        const {plugin, prepareInstallpermissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetup,
          pluginSetupMockRepoAddress,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetup,
            pluginSetupMockRepoAddress,
            plugin,
            prepareInstallpermissions
          )
        )
          .to.emit(psp, EVENTS.InstallationApplied)
          .withArgs(targetDao.address, plugin);
      });
    });
  });

  describe('Plugin Uninstall', function () {
    beforeEach(async () => {
      // Grant necessary permission to `ownerAddress` so it can install/uninstall plugin on behalf of the DAO,
      // this way we don't have to create DAO execute call.
      await targetDao.grant(
        psp.address,
        ownerAddress,
        APPLY_INSTALLATION_PERMISSION_ID
      );
      await targetDao.grant(
        psp.address,
        ownerAddress,
        APPLY_UNINSTALLATION_PERMISSION_ID
      );
    });

    describe('PrepareUninstallation', function () {
      it('reverts if `PluginSetupRepo` do not exist on `PluginRepoRegistry`', async () => {
        await expect(
          psp.prepareUninstallation(
            targetDao.address,
            AddressZero,
            AddressZero,
            AddressZero,
            [AddressZero],
            EMPTY_DATA
          )
        ).to.be.revertedWith(customError('EmptyPluginRepo'));
      });

      it('reverts if plugin is not applied yet', async () => {
        const pluginSetup = pluginSetupV1Mock.address;

        const {plugin, helpers} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetup,
          pluginSetupMockRepoAddress,
          EMPTY_DATA
        );

        await expect(
          psp.prepareUninstallation(
            targetDao.address,
            plugin,
            pluginSetup,
            pluginSetupMockRepoAddress,
            helpers,
            EMPTY_DATA
          )
        ).to.be.revertedWith(customError('SetupNotApplied'));
      });

      it('reverts if plugin uninstallation is already prepared', async () => {
        const pluginSetupBad = pluginSetupV1MockBad.address;

        const installData = ethers.utils.defaultAbiCoder.encode(
          ['address'],
          [AddressZero]
        );
        const {plugin, helpers, prepareInstallpermissions} =
          await prepareInstallation(
            psp,
            targetDao.address,
            pluginSetupBad,
            pluginSetupMockRepoAddress,
            installData
          );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetupBad,
          pluginSetupMockRepoAddress,
          plugin,
          prepareInstallpermissions
        );

        // prepare first uninstallation
        const uninstallData = ethers.utils.defaultAbiCoder.encode(
          ['bool'],
          [false]
        );

        await psp.prepareUninstallation(
          targetDao.address,
          plugin,
          pluginSetupBad,
          pluginSetupMockRepoAddress,
          helpers,
          uninstallData
        );

        // prepare second uninstallation
        await expect(
          psp.prepareUninstallation(
            targetDao.address,
            plugin,
            pluginSetupBad,
            pluginSetupMockRepoAddress,
            helpers,
            ethers.utils.defaultAbiCoder.encode(['bool'], [true])
          )
        ).to.be.revertedWith(customError('SetupAlreadyPrepared'));
      });
    });

    describe('ApplyUninstallation', function () {
      it('reverts if caller does not have `APPLY_UNINSTALLATION_PERMISSION`', async () => {
        // revoke `APPLY_INSTALLATION_PERMISSION_ID` on dao for plugin installer
        // to see that it can't set permissions without it.
        await targetDao.revoke(
          psp.address,
          ownerAddress,
          APPLY_UNINSTALLATION_PERMISSION_ID
        );

        await expect(
          psp.applyUninstallation(
            targetDao.address,
            AddressZero,
            AddressZero,
            AddressZero,
            [],
            []
          )
        ).to.be.revertedWith(
          customError(
            'SetupApplicationUnauthorized',
            targetDao.address,
            ownerAddress,
            APPLY_UNINSTALLATION_PERMISSION_ID
          )
        );
      });

      it('reverts if helpers do not match', async () => {
        const pluginSetup = pluginSetupV1Mock.address;

        const {plugin} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetup,
          pluginSetupMockRepoAddress,
          EMPTY_DATA
        );

        await expect(
          psp.applyUninstallation(
            targetDao.address,
            plugin,
            pluginSetup,
            pluginSetupMockRepoAddress,
            [],
            []
          )
        ).to.be.revertedWith(customError('HelpersHashMismatch'));
      });

      it('revert bad permissions is passed', async () => {
        const pluginSetup = pluginSetupV1Mock.address;

        const {plugin, helpers, prepareInstallpermissions} =
          await prepareInstallation(
            psp,
            targetDao.address,
            pluginSetup,
            pluginSetupMockRepoAddress,
            EMPTY_DATA
          );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetup,
          pluginSetupMockRepoAddress,
          plugin,
          prepareInstallpermissions
        );

        await psp.callStatic.prepareUninstallation(
          targetDao.address,
          plugin,
          pluginSetup,
          pluginSetupMockRepoAddress,
          helpers,
          EMPTY_DATA
        );

        await expect(
          psp.applyUninstallation(
            targetDao.address,
            plugin,
            pluginSetup,
            pluginSetupMockRepoAddress,
            helpers,
            []
          )
        ).to.be.revertedWith(customError('PermissionsHashMismatch'));
      });

      it('correctly complete an uninstallation process', async () => {
        const pluginSetup = pluginSetupV1Mock.address;

        const {plugin, helpers, prepareInstallpermissions} =
          await prepareInstallation(
            psp,
            targetDao.address,
            pluginSetup,
            pluginSetupMockRepoAddress,
            EMPTY_DATA
          );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetup,
          pluginSetupMockRepoAddress,
          plugin,
          prepareInstallpermissions
        );

        const tx = await psp.prepareUninstallation(
          targetDao.address,
          plugin,
          pluginSetup,
          pluginSetupMockRepoAddress,
          helpers,
          EMPTY_DATA
        );

        const event = await findEvent(tx, 'UninstallationPrepared');
        const {permissions} = event.args;

        await expect(
          psp.applyUninstallation(
            targetDao.address,
            plugin,
            pluginSetup,
            pluginSetupMockRepoAddress,
            helpers,
            permissions
          )
        )
          .to.emit(psp, EVENTS.UninstallationApplied)
          .withArgs(targetDao.address, plugin);
      });
    });
  });

  describe('Plugin Update', function () {
    beforeEach(async () => {
      await targetDao.grant(
        psp.address,
        ownerAddress,
        APPLY_INSTALLATION_PERMISSION_ID
      );
      await targetDao.grant(
        psp.address,
        ownerAddress,
        APPLY_UPDATE_PERMISSION_ID
      );
    });

    describe('PrepareUpdate', function () {
      it('reverts if plugin does not support `IPlugin` interface', async () => {
        const pluginSetupRepoAddr = ADDRESS_TWO;
        const plugin = AddressZero;
        let pluginUpdateParams = {
          plugin: plugin,
          oldPluginSetup: pluginSetupV1Mock.address,
          pluginSetupRepo: pluginSetupRepoAddr,
          currentPluginSetup: AddressZero,
          newPluginSetup: AddressZero,
        };
        const helpers = [AddressZero];

        await expect(
          psp.prepareUpdate(
            targetDao.address,
            pluginUpdateParams,
            helpers,
            EMPTY_DATA
          )
        ).to.be.revertedWith(customError('IPluginNotSupported', plugin));
      });

      it('reverts if plugin supports IPlugin, but is non upgradable', async () => {
        let pluginUpdateParams = {
          plugin: pluginCloneableMock.address,
          pluginSetupRepo: ADDRESS_TWO,
          currentPluginSetup: AddressZero,
          newPluginSetup: AddressZero,
        };

        const helpers = [AddressZero];
        await expect(
          psp.prepareUpdate(
            targetDao.address,
            pluginUpdateParams,
            helpers,
            EMPTY_DATA
          )
        ).to.be.revertedWith(
          customError('PluginNonupgradeable', pluginCloneableMock.address)
        );
      });

      it('reverts if `PluginSetupRepo` do not exist on `PluginRepoRegistry`', async () => {
        const daoAddress = targetDao.address;
        const pluginSetupV1 = pluginSetupV1Mock.address;

        const {plugin, helpers} = await prepareInstallation(
          psp,
          daoAddress,
          pluginSetupV1,
          pluginSetupMockRepoAddress,
          EMPTY_DATA
        );

        const pluginSetupRepoAddr = ADDRESS_TWO;
        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginSetupRepoAddr,
          currentPluginSetup: pluginSetupV1,
          newPluginSetup: pluginSetupV2Mock.address,
        };

        await expect(
          psp.prepareUpdate(daoAddress, pluginUpdateParams, helpers, EMPTY_DATA)
        ).to.be.revertedWith(customError('EmptyPluginRepo'));
      });

      it('revert if plugin is not applied', async () => {
        const daoAddress = targetDao.address;
        const pluginSetupV1 = pluginSetupV1Mock.address;

        const {plugin, helpers} = await prepareInstallation(
          psp,
          daoAddress,
          pluginSetupV1,
          pluginSetupMockRepoAddress,
          EMPTY_DATA
        );

        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginSetupMockRepoAddress,
          currentPluginSetup: pluginSetupV1,
          newPluginSetup: pluginSetupV2Mock.address,
        };

        await expect(
          psp.prepareUpdate(daoAddress, pluginUpdateParams, helpers, EMPTY_DATA)
        ).to.be.revertedWith(customError('SetupNotApplied'));
      });

      it('revert if helpers passed are missmatched', async () => {
        const daoAddress = targetDao.address;
        const pluginSetupV1 = pluginSetupV1Mock.address;

        const {plugin, prepareInstallpermissions} = await prepareInstallation(
          psp,
          daoAddress,
          pluginSetupV1,
          pluginSetupMockRepoAddress,
          EMPTY_DATA
        );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetupV1,
          pluginSetupMockRepoAddress,
          plugin,
          prepareInstallpermissions
        );

        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginSetupMockRepoAddress,
          currentPluginSetup: pluginSetupV1,
          newPluginSetup: pluginSetupV2Mock.address,
        };

        await expect(
          psp.prepareUpdate(daoAddress, pluginUpdateParams, [], EMPTY_DATA)
        ).to.be.revertedWith(customError('HelpersHashMismatch'));
      });

      it('correctly retruns permissions and initData', async () => {
        const daoAddress = targetDao.address;
        const pluginSetupV1 = pluginSetupV1Mock.address;

        const {plugin, helpers, prepareInstallpermissions} =
          await prepareInstallation(
            psp,
            daoAddress,
            pluginSetupV1,
            pluginSetupMockRepoAddress,
            EMPTY_DATA
          );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetupV1,
          pluginSetupMockRepoAddress,
          plugin,
          prepareInstallpermissions
        );

        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginSetupMockRepoAddress,
          currentPluginSetup: pluginSetupV1,
          newPluginSetup: pluginSetupV2Mock.address,
        };

        const result = await psp.callStatic.prepareUpdate(
          daoAddress,
          pluginUpdateParams,
          helpers,
          EMPTY_DATA
        );

        const permissions = result[0];
        const initData = result[1];

        expect(permissions.length).to.be.equal(2);
        expect(initData).not.to.be.equal('');
      });

      it('correctly prepares an update', async () => {
        const daoAddress = targetDao.address;
        const pluginSetupV1 = pluginSetupV1Mock.address;

        const {plugin, helpers, prepareInstallpermissions} =
          await prepareInstallation(
            psp,
            daoAddress,
            pluginSetupV1,
            pluginSetupMockRepoAddress,
            EMPTY_DATA
          );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetupV1,
          pluginSetupMockRepoAddress,
          plugin,
          prepareInstallpermissions
        );

        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginSetupMockRepoAddress,
          currentPluginSetup: pluginSetupV1,
          newPluginSetup: pluginSetupV2Mock.address,
        };

        await expect(
          psp.prepareUpdate(daoAddress, pluginUpdateParams, helpers, EMPTY_DATA)
        ).to.emit(psp, EVENTS.UpdatePrepared);
      });
    });

    describe('ApplyUpdate', function () {
      it('reverts if caller does not have `APPLY_UPDATE_PERMISSION`', async () => {
        // revoke `APPLY_INSTALLATION_PERMISSION_ID` on dao for plugin installer
        // to see that it can't set permissions without it.
        await targetDao.revoke(
          psp.address,
          ownerAddress,
          APPLY_UPDATE_PERMISSION_ID
        );

        await expect(
          psp.applyUpdate(
            targetDao.address,
            AddressZero,
            AddressZero,
            AddressZero,
            EMPTY_DATA,
            []
          )
        ).to.be.revertedWith(
          customError(
            'SetupApplicationUnauthorized',
            targetDao.address,
            ownerAddress,
            APPLY_UPDATE_PERMISSION_ID
          )
        );
      });

      it('revert if permissions are mismatched', async () => {
        const permissions: any[] = [];

        await expect(
          psp.applyUpdate(
            targetDao.address,
            AddressZero,
            AddressZero,
            AddressZero,
            EMPTY_DATA,
            permissions
          )
        ).to.be.revertedWith(customError('PermissionsHashMismatch'));
      });

      // TODO: Find a way to test upgradeProxy
      // also check this function's errors as they might be misleading
      // it also get thrown if UPGRADE_PLUGIN_PERMISSION_ID permission is not granted
      // it('applyUpdate: reverts if PluginNonupgradeable', async () => {});

      it('correctly applies an update', async () => {
        const daoAddress = targetDao.address;
        const pluginSetupV1 = pluginSetupV1Mock.address;

        const {plugin, helpers, prepareInstallpermissions} =
          await prepareInstallation(
            psp,
            daoAddress,
            pluginSetupV1,
            pluginSetupMockRepoAddress,
            EMPTY_DATA
          );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetupV1,
          pluginSetupMockRepoAddress,
          plugin,
          prepareInstallpermissions
        );

        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginSetupMockRepoAddress,
          currentPluginSetup: pluginSetupV1,
          newPluginSetup: pluginSetupV2Mock.address,
        };
        const prepareUpdateTx = await psp.prepareUpdate(
          targetDao.address,
          pluginUpdateParams,
          helpers,
          EMPTY_DATA
        );
        const prepareUpdateEvent = await findEvent(
          prepareUpdateTx,
          EVENTS.UpdatePrepared
        );
        const {permissions, initData} = prepareUpdateEvent.args;

        await targetDao.grant(
          plugin,
          psp.address,
          UPGRADE_PLUGIN_PERMISSION_ID
        );

        await expect(
          psp.applyUpdate(
            targetDao.address,
            plugin,
            pluginSetupV2Mock.address,
            pluginSetupMockRepoAddress,
            initData,
            permissions
          )
        ).to.emit(psp, EVENTS.UpdateApplied);
      });
    });
  });
});
