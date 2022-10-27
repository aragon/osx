import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  PluginSetupProcessor,
  PluginCloneableMock,
  PluginUUPSUpgradeableSetupV1Mock,
  PluginUUPSUpgradeableSetupV2Mock,
  PluginUUPSUpgradeableSetupV3Mock,
  PluginUUPSUpgradeableSetupV1MockBad,
  PluginRepoFactory,
  PluginRepoRegistry,
  PluginRepo,
  DAO,
} from '../../typechain';

import {customError} from '../test-utils/custom-error-helper';
import {deployENSSubdomainRegistrar} from '../test-utils/ens';

import {deployNewDAO} from '../test-utils/dao';
import {findEvent} from '../test-utils/event';
import {
  deployPluginSetupProcessor,
  prepareInstallation,
  Op,
  mockPermissions,
} from '../test-utils/plugin-setup-processor';
import {
  deployPluginRepoFactory,
  deployPluginRepoRegistry,
} from '../test-utils/repo';

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

const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION');
const APPLY_INSTALLATION_PERMISSION_ID = ethers.utils.id(
  'APPLY_INSTALLATION_PERMISSION'
);
const APPLY_UPDATE_PERMISSION_ID = ethers.utils.id('APPLY_UPDATE_PERMISSION');
const APPLY_UNINSTALLATION_PERMISSION_ID = ethers.utils.id(
  'APPLY_UNINSTALLATION_PERMISSION'
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

describe('Plugin Setup Processor', function () {
  let signers: SignerWithAddress[];
  let psp: PluginSetupProcessor;
  let pluginRepo: PluginRepo;
  let pluginCloneableMock: PluginCloneableMock;
  let pluginSetupV1Mock: PluginUUPSUpgradeableSetupV1Mock;
  let pluginSetupV2Mock: PluginUUPSUpgradeableSetupV2Mock;
  let pluginSetupV3Mock: PluginUUPSUpgradeableSetupV2Mock;
  let pluginSetupV1MockBad: PluginUUPSUpgradeableSetupV1MockBad;
  let ownerAddress: string;
  let targetDao: DAO;
  let managingDao: DAO;
  let pluginRepoFactory: PluginRepoFactory;
  let pluginRepoRegistry: PluginRepoRegistry;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    // Directly deploy PluginCloneableMock
    const _PluginCloneableMock = await ethers.getContractFactory(
      'PluginCloneableMock'
    );
    pluginCloneableMock = await _PluginCloneableMock.deploy();

    // Deploy PluginUUPSUpgradeableSetupMock
    const PluginUUPSUpgradeableSetupV1Mock = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV1Mock'
    );
    pluginSetupV1Mock = await PluginUUPSUpgradeableSetupV1Mock.deploy();

    const PluginUUPSUpgradeableSetupV2Mock = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV2Mock'
    );
    pluginSetupV2Mock = await PluginUUPSUpgradeableSetupV2Mock.deploy();

    const PluginUUPSUpgradeableSetupV3Mock = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV3Mock'
    );
    pluginSetupV2Mock = await PluginUUPSUpgradeableSetupV2Mock.deploy();

    const PluginUUPSUpgradeableSetupV1MockBad = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV1MockBad'
    );
    pluginSetupV1MockBad = await PluginUUPSUpgradeableSetupV1MockBad.deploy();

    // Deploy yhe managing DAO having permission to manage `PluginSetupProcessor`
    managingDao = await deployNewDAO(ownerAddress);

    // Deploy ENS subdomain Registry
    const ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
      signers[0],
      managingDao,
      'dao.eth'
    );

    // Deploy Plugin Repo Registry
    pluginRepoRegistry = await deployPluginRepoRegistry(
      managingDao,
      ensSubdomainRegistrar
    );

    // Deploy Plugin Repo Factory
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

    // Create and register a plugin on the PluginRepoRegistry
    const tx = await pluginRepoFactory.createPluginRepoWithVersion(
      `PluginUUPSUpgradeableMock`,
      [1, 0, 0],
      pluginSetupV1Mock.address,
      '0x00',
      ownerAddress
    );
    const event = await findEvent(tx, EVENTS.PluginRepoRegistered);
    const PluginRepo = await ethers.getContractFactory('PluginRepo');
    pluginRepo = PluginRepo.attach(event.args.pluginRepo);

    // Add PluginUUPSUpgradeableSetupV2Mock to the PluginRepo.
    await pluginRepo.createVersion(
      [2, 0, 0],
      pluginSetupV2Mock.address,
      '0x00'
    );

    // register the bad plugin setup on `PluginRepoRegistry`.
    await pluginRepo.createVersion(
      [3, 0, 0],
      pluginSetupV1MockBad.address,
      '0x00'
    );
  });

  beforeEach(async function () {
    // Target DAO to be used as an example DAO
    targetDao = await deployNewDAO(ownerAddress);

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

    describe('prepareInstallation', function () {
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
        const {plugin, prepareInstallPermissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetupBad,
          pluginRepo.address,
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
            pluginRepo.address,
            data2
          )
        ).to.be.revertedWith(customError('SetupAlreadyPrepared'));
      });

      it('Return the correct permissions', async () => {
        const {plugin, helpers, permissions} =
          await psp.callStatic.prepareInstallation(
            targetDao.address,
            pluginSetupV1Mock.address,
            pluginRepo.address,
            EMPTY_DATA
          );

        expect(plugin).not.to.be.equal(AddressZero);
        expect(helpers.length).to.be.equal(1);
        expect(permissions).to.deep.equal(mockPermissions(1, Op.Grant));
      });
    });

    describe('applyInstallation', function () {
      it('reverts if caller does not have `APPLY_INSTALLATION_PERMISSION`', async () => {
        // revoke `APPLY_INSTALLATION_PERMISSION_ID` on dao for plugin installer
        // to see that it can't set permissions without it.
        await targetDao.revoke(
          psp.address,
          ownerAddress,
          APPLY_INSTALLATION_PERMISSION_ID
        );

        const pluginSetup = pluginSetupV1Mock.address;

        const {plugin, prepareInstallPermissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetup,
          pluginRepo.address,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetup,
            pluginRepo.address,
            plugin,
            prepareInstallPermissions
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

        const {plugin, prepareInstallPermissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetup,
          pluginRepo.address,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetup,
            pluginRepo.address,
            plugin,
            prepareInstallPermissions
          )
        ).to.be.revertedWith(
          customError(
            'Unauthorized',
            targetDao.address,
            prepareInstallPermissions[0]['where'],
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
        const {plugin, prepareInstallPermissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetupBad,
          pluginRepo.address,
          dataUser1
        );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetupBad,
          pluginRepo.address,
          plugin,
          prepareInstallPermissions
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
          pluginRepo.address,
          dataUser2
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetupBad,
            pluginRepo.address,
            secondPreparation.plugin,
            secondPreparation.prepareInstallPermissions
          )
        ).to.be.revertedWith(customError('SetupAlreadyApplied'));
      });

      it('correctly complete an instaltion process', async () => {
        const pluginSetup = pluginSetupV1Mock.address;

        const {plugin, prepareInstallPermissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetup,
          pluginRepo.address,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetup,
            pluginRepo.address,
            plugin,
            prepareInstallPermissions
          )
        )
          .to.emit(psp, EVENTS.InstallationApplied)
          .withArgs(targetDao.address, plugin);
      });
    });
  });

  describe('Uninstall Plugin', function () {
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

    describe('prepareUninstallation', function () {
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
          pluginRepo.address,
          EMPTY_DATA
        );

        await expect(
          psp.prepareUninstallation(
            targetDao.address,
            plugin,
            pluginSetup,
            pluginRepo.address,
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
        const {plugin, helpers, prepareInstallPermissions} =
          await prepareInstallation(
            psp,
            targetDao.address,
            pluginSetupBad,
            pluginRepo.address,
            installData
          );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetupBad,
          pluginRepo.address,
          plugin,
          prepareInstallPermissions
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
          pluginRepo.address,
          helpers,
          uninstallData
        );

        // prepare second uninstallation
        await expect(
          psp.prepareUninstallation(
            targetDao.address,
            plugin,
            pluginSetupBad,
            pluginRepo.address,
            helpers,
            ethers.utils.defaultAbiCoder.encode(['bool'], [true])
          )
        ).to.be.revertedWith(customError('SetupAlreadyPrepared'));
      });
    });

    describe('applyUninstallation', function () {
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
          pluginRepo.address,
          EMPTY_DATA
        );

        await expect(
          psp.applyUninstallation(
            targetDao.address,
            plugin,
            pluginSetup,
            pluginRepo.address,
            [],
            []
          )
        ).to.be.revertedWith(customError('HelpersHashMismatch'));
      });

      it('revert bad permissions is passed', async () => {
        const pluginSetup = pluginSetupV1Mock.address;

        const {plugin, helpers, prepareInstallPermissions} =
          await prepareInstallation(
            psp,
            targetDao.address,
            pluginSetup,
            pluginRepo.address,
            EMPTY_DATA
          );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetup,
          pluginRepo.address,
          plugin,
          prepareInstallPermissions
        );

        await psp.callStatic.prepareUninstallation(
          targetDao.address,
          plugin,
          pluginSetup,
          pluginRepo.address,
          helpers,
          EMPTY_DATA
        );

        await expect(
          psp.applyUninstallation(
            targetDao.address,
            plugin,
            pluginSetup,
            pluginRepo.address,
            helpers,
            []
          )
        ).to.be.revertedWith(customError('PermissionsHashMismatch'));
      });

      it('correctly complete an uninstallation process', async () => {
        const pluginSetup = pluginSetupV1Mock.address;

        const {plugin, helpers, prepareInstallPermissions} =
          await prepareInstallation(
            psp,
            targetDao.address,
            pluginSetup,
            pluginRepo.address,
            EMPTY_DATA
          );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetup,
          pluginRepo.address,
          plugin,
          prepareInstallPermissions
        );

        const tx = await psp.prepareUninstallation(
          targetDao.address,
          plugin,
          pluginSetup,
          pluginRepo.address,
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
            pluginRepo.address,
            helpers,
            permissions
          )
        )
          .to.emit(psp, EVENTS.UninstallationApplied)
          .withArgs(targetDao.address, plugin);
      });
    });
  });

  describe('Update Plugin', function () {
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

    describe('prepareUpdate', function () {
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
          pluginRepo.address,
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
          pluginRepo.address,
          EMPTY_DATA
        );

        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginRepo.address,
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

        const {plugin, prepareInstallPermissions} = await prepareInstallation(
          psp,
          daoAddress,
          pluginSetupV1,
          pluginRepo.address,
          EMPTY_DATA
        );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetupV1,
          pluginRepo.address,
          plugin,
          prepareInstallPermissions
        );

        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginRepo.address,
          currentPluginSetup: pluginSetupV1,
          newPluginSetup: pluginSetupV2Mock.address,
        };

        await expect(
          psp.prepareUpdate(daoAddress, pluginUpdateParams, [], EMPTY_DATA)
        ).to.be.revertedWith(customError('HelpersHashMismatch'));
      });

      it('Correctly return permissions and initData', async () => {
        const daoAddress = targetDao.address;
        const pluginSetupV1 = pluginSetupV1Mock.address;

        const {plugin, helpers, prepareInstallPermissions} =
          await prepareInstallation(
            psp,
            daoAddress,
            pluginSetupV1,
            pluginRepo.address,
            EMPTY_DATA
          );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetupV1,
          pluginRepo.address,
          plugin,
          prepareInstallPermissions
        );

        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginRepo.address,
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

        expect(permissions).to.deep.equal(mockPermissions(1, Op.Freeze));
        expect(initData).not.to.be.equal(''); // TODO, improve test
      });

      it('correctly prepares an update', async () => {
        const daoAddress = targetDao.address;
        const pluginSetupV1 = pluginSetupV1Mock.address;

        const {plugin, helpers, prepareInstallPermissions} =
          await prepareInstallation(
            psp,
            daoAddress,
            pluginSetupV1,
            pluginRepo.address,
            EMPTY_DATA
          );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetupV1,
          pluginRepo.address,
          plugin,
          prepareInstallPermissions
        );

        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginRepo.address,
          currentPluginSetup: pluginSetupV1,
          newPluginSetup: pluginSetupV2Mock.address,
        };

        await expect(
          psp.prepareUpdate(daoAddress, pluginUpdateParams, helpers, EMPTY_DATA)
        ).to.emit(psp, EVENTS.UpdatePrepared);
      });
    });

    describe('applyUpdate', function () {
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

        const {plugin, helpers, prepareInstallPermissions} =
          await prepareInstallation(
            psp,
            daoAddress,
            pluginSetupV1,
            pluginRepo.address,
            EMPTY_DATA
          );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetupV1,
          pluginRepo.address,
          plugin,
          prepareInstallPermissions
        );

        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginRepo.address,
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
            pluginRepo.address,
            initData,
            permissions
          )
        ).to.emit(psp, EVENTS.UpdateApplied);
      });
    });
  });
});
