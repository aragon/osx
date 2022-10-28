import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  PluginSetupProcessor,
  PluginCloneableMock,
  PluginUUPSUpgradeableV1Mock,
  PluginUUPSUpgradeableV2Mock,
  PluginUUPSUpgradeableV3Mock,
  PluginUUPSUpgradeableV1Mock__factory,
  PluginUUPSUpgradeableV2Mock__factory,
  PluginUUPSUpgradeableV3Mock__factory,
  PluginUUPSUpgradeableSetupV1Mock,
  PluginUUPSUpgradeableSetupV2Mock,
  PluginUUPSUpgradeableSetupV3Mock,
  PluginUUPSUpgradeableSetupV1Mock__factory,
  PluginUUPSUpgradeableSetupV2Mock__factory,
  PluginUUPSUpgradeableSetupV3Mock__factory,
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
  prepareUpdate,
  Operation,
  mockPermissionsOperations,
  PermissionOperation,
} from '../test-utils/plugin-setup-processor';
import {
  deployPluginRepoFactory,
  deployPluginRepoRegistry,
} from '../test-utils/repo';
import {BytesLike} from 'ethers';

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
  let PluginV1: PluginUUPSUpgradeableV1Mock__factory;
  let PluginV2: PluginUUPSUpgradeableV2Mock__factory;
  let PluginV3: PluginUUPSUpgradeableV3Mock__factory;
  let SetupV1: PluginUUPSUpgradeableSetupV1Mock__factory;
  let SetupV2: PluginUUPSUpgradeableSetupV2Mock__factory;
  let SetupV3: PluginUUPSUpgradeableSetupV3Mock__factory;
  let setupV1: PluginUUPSUpgradeableSetupV1Mock;
  let setupV2: PluginUUPSUpgradeableSetupV2Mock;
  let setupV3: PluginUUPSUpgradeableSetupV3Mock;
  let setupV1Bad: PluginUUPSUpgradeableSetupV1MockBad;
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

    // Deploy PluginUUPSUpgradeableMock
    PluginV1 = await ethers.getContractFactory('PluginUUPSUpgradeableV1Mock');
    PluginV2 = await ethers.getContractFactory('PluginUUPSUpgradeableV2Mock');
    PluginV3 = await ethers.getContractFactory('PluginUUPSUpgradeableV3Mock');

    // Deploy PluginUUPSUpgradeableSetupMock
    SetupV1 = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV1Mock'
    );
    setupV1 = await SetupV1.deploy();

    SetupV2 = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV2Mock'
    );
    setupV2 = await SetupV2.deploy();

    SetupV3 = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV3Mock'
    );
    setupV3 = await SetupV3.deploy();

    const PluginUUPSUpgradeableSetupV1MockBad = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV1MockBad'
    );
    setupV1Bad = await PluginUUPSUpgradeableSetupV1MockBad.deploy();

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
      setupV1.address,
      '0x00',
      ownerAddress
    );
    const event = await findEvent(tx, EVENTS.PluginRepoRegistered);
    const PluginRepo = await ethers.getContractFactory('PluginRepo');
    pluginRepo = PluginRepo.attach(event.args.pluginRepo);

    // Add setups
    await pluginRepo.createVersion([2, 0, 0], setupV2.address, EMPTY_DATA);
    await pluginRepo.createVersion([3, 0, 0], setupV3.address, EMPTY_DATA);
    await pluginRepo.createVersion([4, 0, 0], setupV1Bad.address, EMPTY_DATA);
  });

  beforeEach(async function () {
    // Target DAO to be used as an example DAO
    targetDao = await deployNewDAO(ownerAddress);

    // Grant
    await targetDao.grant(targetDao.address, psp.address, ROOT_PERMISSION_ID);
  });

  describe('Plugin Setup Mocks', function () {
    describe('Setup V1', function () {
      it('points to the V1 implementation', async () => {
        await checkImplementation(setupV1, PluginV1);
      });

      it('points to the V2 implementation', async () => {
        await checkImplementation(setupV2, PluginV2);
      });

      it('points to the V3 implementation', async () => {
        await checkImplementation(setupV3, PluginV3);
      });

      async function checkImplementation(setup: any, pluginFactory: any) {
        const {plugin} = await prepareInstallation(
          psp,
          targetDao.address,
          setup.address,
          pluginRepo.address,
          EMPTY_DATA
        );

        const proxy = await pluginFactory
          .attach(plugin)
          .callStatic.getImplementationAddress();

        expect(proxy).to.equal(
          await setup.callStatic.getImplementationAddress()
        );
      }
    });
  });

  describe('Installation', function () {
    beforeEach(async () => {
      // Grant necessary permission to `ownerAddress` so it can install plugins on behalf of the DAO.
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
            setupV1.address,
            pluginSetupRepoAddr,
            data
          )
        ).to.be.revertedWith(customError('EmptyPluginRepo'));
      });

      it('reverts if installation already prepared', async () => {
        const pluginSetupBad = setupV1Bad.address;

        const data1 = ethers.utils.defaultAbiCoder.encode(
          ['address'],
          [AddressZero]
        );
        const {plugin, permissions: permissions} = await prepareInstallation(
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

      it('return the correct permissions', async () => {
        const {plugin, helpers, permissions} =
          await psp.callStatic.prepareInstallation(
            targetDao.address,
            setupV1.address,
            pluginRepo.address,
            EMPTY_DATA
          );

        expect(plugin).not.to.be.equal(AddressZero);
        expect(helpers.length).to.be.equal(1);

        expect(permissions).to.deep.equal(
          mockPermissionsOperations(0, 1, Operation.Grant).map(perm =>
            Object.values(perm)
          )
        );
      });
    });

    it('reverts if the plugin setup processor does not have the `UPGRADE_PLUGIN_PERMISSION_ID` permission', async () => {
      let proxy: string;
      let helpersV1: string[];
      let permissionsV1: PermissionOperation[];

      ({
        plugin: proxy,
        helpers: helpersV1,
        permissions: permissionsV1,
      } = await prepareInstallation(
        psp,
        targetDao.address,
        setupV1.address,
        pluginRepo.address,
        EMPTY_DATA
      ));

      await psp.applyInstallation(
        targetDao.address,
        setupV1.address,
        pluginRepo.address,
        proxy,
        permissionsV1
      );

      const pluginUpdateParams = {
        plugin: proxy,
        pluginSetupRepo: pluginRepo.address,
        currentPluginSetup: setupV1.address,
        newPluginSetup: setupV2.address,
      };
      const prepareUpdateTx = await psp.prepareUpdate(
        targetDao.address,
        pluginUpdateParams,
        helpersV1,
        EMPTY_DATA
      );

      const prepareUpdateEvent = await findEvent(
        prepareUpdateTx,
        EVENTS.UpdatePrepared
      );

      const {permissions: permissionsV2, initData: initDataV2} =
        prepareUpdateEvent.args;

      await expect(
        psp.applyUpdate(
          targetDao.address,
          proxy,
          setupV2.address,
          pluginRepo.address,
          initDataV2,
          permissionsV2
        )
      ).to.revertedWith(
        customError(
          'PluginProxyUpgradeFailed',
          proxy,
          await setupV2.callStatic.getImplementationAddress(),
          initDataV2
        )
      );
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

        const pluginSetup = setupV1.address;

        const {plugin, permissions: permissions} = await prepareInstallation(
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
            permissions
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

        const pluginSetup = setupV1.address;

        const {plugin, permissions: permissions} = await prepareInstallation(
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
            permissions
          )
        ).to.be.revertedWith(
          customError(
            'Unauthorized',
            targetDao.address,
            permissions[0]['where'],
            psp.address,
            ROOT_PERMISSION_ID
          )
        );
      });

      it('reverts if plugin setup return the same address', async () => {
        const pluginSetupBad = setupV1Bad.address;

        const dataUser1 = ethers.utils.defaultAbiCoder.encode(
          ['address'],
          [AddressZero]
        );
        const {plugin, permissions: permissions} = await prepareInstallation(
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
          permissions
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
            secondPreparation.permissions
          )
        ).to.be.revertedWith(customError('SetupAlreadyApplied'));
      });

      it('applies a prepared installation', async () => {
        const pluginSetup = setupV1.address;

        const {plugin, permissions: permissions} = await prepareInstallation(
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
            permissions
          )
        )
          .to.emit(psp, EVENTS.InstallationApplied)
          .withArgs(targetDao.address, plugin);
      });
    });
  });

  describe('Uninstallation', function () {
    beforeEach(async () => {
      // Grant necessary permission to `ownerAddress` so it can install and uninstall plugins on behalf of the DAO.
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
        const pluginSetup = setupV1.address;

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
        const pluginSetupBad = setupV1Bad.address;

        const installData = ethers.utils.defaultAbiCoder.encode(
          ['address'],
          [AddressZero]
        );
        const {
          plugin,
          helpers,
          permissions: permissions,
        } = await prepareInstallation(
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
          permissions
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
        const pluginSetup = setupV1.address;

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
        const pluginSetup = setupV1.address;

        const {
          plugin,
          helpers,
          permissions: permissions,
        } = await prepareInstallation(
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
          permissions
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

      it('applies a prepared uninstallation', async () => {
        const pluginSetup = setupV1.address;

        const {
          plugin,
          helpers,
          permissions: prepareInstallationPermissions,
        } = await prepareInstallation(
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
          prepareInstallationPermissions
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

  describe('Update', function () {
    beforeEach(async () => {
      // Grant necessary permission to `ownerAddress` so it can install and upadate plugins on behalf of the DAO.
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
      let proxy: string;
      let helpersV1: string[];
      let permissionsV1: PermissionOperation[];

      beforeEach(async () => {
        ({
          plugin: proxy,
          helpers: helpersV1,
          permissions: permissionsV1,
        } = await prepareInstallation(
          psp,
          targetDao.address,
          setupV1.address,
          pluginRepo.address,
          EMPTY_DATA
        ));

        await psp.applyInstallation(
          targetDao.address,
          setupV1.address,
          pluginRepo.address,
          proxy,
          permissionsV1
        );
      });

      it('reverts if plugin does not support `IPlugin` interface', async () => {
        const pluginSetupRepoAddr = ADDRESS_TWO;
        const plugin = AddressZero;
        let pluginUpdateParams = {
          plugin: plugin,
          oldPluginSetup: setupV1.address,
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
        const {plugin, helpers} = await prepareInstallation(
          psp,
          targetDao.address,
          setupV1.address,
          pluginRepo.address,
          EMPTY_DATA
        );

        const pluginSetupRepoAddr = ADDRESS_TWO;
        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginSetupRepoAddr,
          currentPluginSetup: setupV1.address,
          newPluginSetup: setupV2.address,
        };

        await expect(
          psp.prepareUpdate(
            targetDao.address,
            pluginUpdateParams,
            helpers,
            EMPTY_DATA
          )
        ).to.be.revertedWith(customError('EmptyPluginRepo'));
      });

      it('revert if plugin is not applied', async () => {
        const {plugin, helpers} = await prepareInstallation(
          psp,
          targetDao.address,
          setupV1.address,
          pluginRepo.address,
          EMPTY_DATA
        );

        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginRepo.address,
          currentPluginSetup: setupV1.address,
          newPluginSetup: setupV2.address,
        };

        await expect(
          psp.prepareUpdate(
            targetDao.address,
            pluginUpdateParams,
            helpers,
            EMPTY_DATA
          )
        ).to.be.revertedWith(customError('SetupNotApplied'));
      });

      it('revert if helpers passed are missmatched', async () => {
        const pluginUpdateParams = {
          plugin: proxy,
          pluginSetupRepo: pluginRepo.address,
          currentPluginSetup: setupV1.address,
          newPluginSetup: setupV2.address,
        };

        await expect(
          psp.prepareUpdate(
            targetDao.address,
            pluginUpdateParams,
            [],
            EMPTY_DATA
          )
        ).to.be.revertedWith(customError('HelpersHashMismatch'));
      });

      it('returns permissions and initData correctly', async () => {
        const pluginUpdateParams = {
          plugin: proxy,
          pluginSetupRepo: pluginRepo.address,
          currentPluginSetup: setupV1.address,
          newPluginSetup: setupV2.address,
        };

        const result = await psp.callStatic.prepareUpdate(
          targetDao.address,
          pluginUpdateParams,
          helpersV1,
          EMPTY_DATA
        );

        const permissions = result[0];
        const initData = result[1];

        expect(permissions).to.deep.equal(
          mockPermissionsOperations(1, 2, Operation.Grant).map(perm =>
            Object.values(perm)
          )
        ); //TODO use mock perm map everywhere
        expect(initData).not.to.be.equal(''); // TODO, improve test
      });

      it('prepares an update correctly', async () => {
        const pluginUpdateParams = {
          plugin: proxy,
          pluginSetupRepo: pluginRepo.address,
          currentPluginSetup: setupV1.address,
          newPluginSetup: setupV2.address,
        };

        await expect(
          psp.prepareUpdate(
            targetDao.address,
            pluginUpdateParams,
            helpersV1,
            EMPTY_DATA
          )
        ).to.emit(psp, EVENTS.UpdatePrepared);
      });
    });

    describe('applyUpdate', function () {
      it('reverts if caller does not have `APPLY_UPDATE_PERMISSION` permission', async () => {
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

      it('reverts if the plugin setup processor does not have the `UPGRADE_PLUGIN_PERMISSION_ID` permission', async () => {
        let proxy: string;
        let helpersV1: string[];
        let permissionsV1: PermissionOperation[];

        ({
          plugin: proxy,
          helpers: helpersV1,
          permissions: permissionsV1,
        } = await prepareInstallation(
          psp,
          targetDao.address,
          setupV1.address,
          pluginRepo.address,
          EMPTY_DATA
        ));

        await psp.applyInstallation(
          targetDao.address,
          setupV1.address,
          pluginRepo.address,
          proxy,
          permissionsV1
        );

        const pluginUpdateParams = {
          plugin: proxy,
          pluginSetupRepo: pluginRepo.address,
          currentPluginSetup: setupV1.address,
          newPluginSetup: setupV2.address,
        };
        const prepareUpdateTx = await psp.prepareUpdate(
          targetDao.address,
          pluginUpdateParams,
          helpersV1,
          EMPTY_DATA
        );

        const prepareUpdateEvent = await findEvent(
          prepareUpdateTx,
          EVENTS.UpdatePrepared
        );

        const {permissions: permissionsV2, initData: initDataV2} =
          prepareUpdateEvent.args;

        await expect(
          psp.applyUpdate(
            targetDao.address,
            proxy,
            setupV2.address,
            pluginRepo.address,
            initDataV2,
            permissionsV2
          )
        ).to.revertedWith(
          customError(
            'PluginProxyUpgradeFailed',
            proxy,
            await setupV2.callStatic.getImplementationAddress(),
            initDataV2
          )
        );
      });

      it('reverts if there is a mismatch between the permissions prepared and to be applied', async () => {
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
      // it('applyUpdate: reverts if PluginNonupgradeable', async () => {});
    });
  });

  describe('Update scenarios', function () {
    beforeEach(async () => {
      // Grant necessary permission to `ownerAddress` so it can install and upadate plugins on behalf of the DAO.
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

    context(`V1 was installed`, function () {
      let proxy: string;
      let helpersV1: string[];
      let permissionsV1: PermissionOperation[];

      beforeEach(async () => {
        ({
          proxy: proxy,
          helpers: helpersV1,
          permissions: permissionsV1,
        } = await installHelper(psp, targetDao, setupV1, pluginRepo));
      });

      it('points to the V1 implementation', async () => {
        expect(
          await PluginV1.attach(proxy).callStatic.getImplementationAddress()
        ).to.equal(await setupV1.callStatic.getImplementationAddress());
      });

      it('updates from V1 to V2', async () => {
        await updateHelper(
          psp,
          targetDao,
          proxy,
          pluginRepo,
          helpersV1,
          setupV1,
          setupV2
        );
      });

      it('updates from V1 to V3', async () => {
        await updateHelper(
          psp,
          targetDao,
          proxy,
          pluginRepo,
          helpersV1,
          setupV1,
          setupV3
        );
      });

      context(`and updated to V2`, function () {
        let helpersV2: string[];
        let permissionsV2: PermissionOperation[];

        beforeEach(async () => {
          ({updatedHelpers: helpersV2, permissions: permissionsV2} =
            await updateHelper(
              psp,
              targetDao,
              proxy,
              pluginRepo,
              helpersV1,
              setupV1,
              setupV2
            ));
        });

        it('points to the V2 implementation', async () => {
          expect(
            await PluginV2.attach(proxy).callStatic.getImplementationAddress()
          ).to.equal(await setupV2.callStatic.getImplementationAddress());
        });

        it('updates from V2 to V3', async () => {
          await updateHelper(
            psp,
            targetDao,
            proxy,
            pluginRepo,
            helpersV2,
            setupV2,
            setupV3
          );
        });
        context(`and updated to V3`, function () {
          let helpersV3: string[];
          let permissionsV3: PermissionOperation[];
          let initDataV3: BytesLike;

          beforeEach(async () => {
            ({updatedHelpers: helpersV3, permissions: permissionsV3} =
              await updateHelper(
                psp,
                targetDao,
                proxy,
                pluginRepo,
                helpersV2,
                setupV2,
                setupV3
              ));
          });

          it('points to the V3 implementation', async () => {
            expect(
              await PluginV3.attach(proxy).callStatic.getImplementationAddress()
            ).to.equal(await setupV3.callStatic.getImplementationAddress());
          });
        });
      });
      context(`and updated to V3`, function () {
        let helpersV3: string[];
        let permissionsV3: PermissionOperation[];
        let initDataV3: BytesLike;

        beforeEach(async () => {
          ({updatedHelpers: helpersV3, permissions: permissionsV3} =
            await updateHelper(
              psp,
              targetDao,
              proxy,
              pluginRepo,
              helpersV1,
              setupV1,
              setupV3
            ));
        });

        it('points to the V3 implementation', async () => {
          expect(
            await PluginV3.attach(proxy).callStatic.getImplementationAddress()
          ).to.equal(await setupV3.callStatic.getImplementationAddress());
        });
      });
    });

    context(`V2 was installed`, function () {
      let proxy: string;
      let helpersV2: string[];
      let permissionsV2: PermissionOperation[];

      beforeEach(async () => {
        ({
          proxy: proxy,
          helpers: helpersV2,
          permissions: permissionsV2,
        } = await installHelper(psp, targetDao, setupV2, pluginRepo));
      });

      it('points to the V2 implementation', async () => {
        expect(
          await PluginV2.attach(proxy).callStatic.getImplementationAddress()
        ).to.equal(await setupV2.callStatic.getImplementationAddress());
      });

      it('updates from V2 to V3', async () => {
        await updateHelper(
          psp,
          targetDao,
          proxy,
          pluginRepo,
          helpersV2,
          setupV2,
          setupV3
        );
      });
    });

    context(`V3 was installed`, function () {
      let proxy: string;
      let helpersV3: string[];
      let permissionsV3: PermissionOperation[];

      beforeEach(async () => {
        ({
          proxy: proxy,
          helpers: helpersV3,
          permissions: permissionsV3,
        } = await installHelper(psp, targetDao, setupV3, pluginRepo));
      });

      it('points to the V3 implementation', async () => {
        expect(
          await PluginV3.attach(proxy).callStatic.getImplementationAddress()
        ).to.equal(await setupV3.callStatic.getImplementationAddress());
      });
    });
  });
});
async function installHelper(
  psp: PluginSetupProcessor,
  targetDao: DAO,
  setup:
    | PluginUUPSUpgradeableSetupV1Mock
    | PluginUUPSUpgradeableSetupV2Mock
    | PluginUUPSUpgradeableSetupV3Mock,
  pluginRepo: PluginRepo
): Promise<{
  proxy: string;
  helpers: string[];
  permissions: PermissionOperation[];
}> {
  let proxy: string;
  let helpers: string[];
  let permissions: PermissionOperation[];
  ({
    plugin: proxy,
    helpers: helpers,
    permissions: permissions,
  } = await prepareInstallation(
    psp,
    targetDao.address,
    setup.address,
    pluginRepo.address,
    EMPTY_DATA
  ));

  await psp.applyInstallation(
    targetDao.address,
    setup.address,
    pluginRepo.address,
    proxy,
    permissions
  );
  return {proxy, helpers, permissions};
}

async function updateHelper(
  psp: PluginSetupProcessor,
  targetDao: DAO,
  proxy: string,
  pluginRepo: PluginRepo,
  currentHelpers: string[],
  currentVersionSetup:
    | PluginUUPSUpgradeableSetupV1Mock
    | PluginUUPSUpgradeableSetupV2Mock
    | PluginUUPSUpgradeableSetupV3Mock,
  newVersionSetup:
    | PluginUUPSUpgradeableSetupV1Mock
    | PluginUUPSUpgradeableSetupV2Mock
    | PluginUUPSUpgradeableSetupV3Mock
): Promise<{
  updatedHelpers: string[];
  permissions: PermissionOperation[];
}> {
  const pluginUpdateParams = {
    plugin: proxy,
    pluginSetupRepo: pluginRepo.address,
    currentPluginSetup: currentVersionSetup.address,
    newPluginSetup: newVersionSetup.address,
  };

  const prepareUpdateTx = await psp.prepareUpdate(
    targetDao.address,
    pluginUpdateParams,
    currentHelpers,
    EMPTY_DATA
  );

  const prepareUpdateEvent = await findEvent(
    prepareUpdateTx,
    EVENTS.UpdatePrepared
  );
  expect(prepareUpdateEvent).to.not.equal(undefined);

  const {
    updatedHelpers: updatedHelpers,
    permissions: permissions,
    initData: initData,
  } = prepareUpdateEvent.args;
  // TODO check them

  // Grant the `UPGRADE_PLUGIN_PERMISSION_ID` permission to the plugin setup processor
  await targetDao.grant(proxy, psp.address, UPGRADE_PLUGIN_PERMISSION_ID);

  const applyUpdateTx = await psp.applyUpdate(
    targetDao.address,
    proxy,
    newVersionSetup.address,
    pluginRepo.address,
    initData,
    permissions
  );

  // Revoke the `UPGRADE_PLUGIN_PERMISSION_ID` permission to the plugin setup processor
  await targetDao.revoke(proxy, psp.address, UPGRADE_PLUGIN_PERMISSION_ID);

  const appliedUpdateEvent = await findEvent(
    applyUpdateTx,
    EVENTS.UpdateApplied
  );
  expect(appliedUpdateEvent).to.not.equal(undefined);

  return {updatedHelpers, permissions};
}
