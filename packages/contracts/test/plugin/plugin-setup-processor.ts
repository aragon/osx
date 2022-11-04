import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  PluginSetupProcessor,
  PluginCloneableSetupV1Mock,
  PluginCloneableSetupV2Mock,
  PluginCloneableSetupV1Mock__factory,
  PluginCloneableSetupV2Mock__factory,
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
import {findEvent} from '../../utils/event';
import {
  deployPluginSetupProcessor,
  prepareInstallation,
  prepareUpdate,
  prepareUninstallation,
  Operation,
  mockPermissionsOperations,
  PermissionOperation,
  mockHelpers,
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
  let repoUUPS: PluginRepo;
  let repoClones: PluginRepo;
  let PluginV1: PluginUUPSUpgradeableV1Mock__factory;
  let PluginV2: PluginUUPSUpgradeableV2Mock__factory;
  let PluginV3: PluginUUPSUpgradeableV3Mock__factory;
  let SetupV1: PluginUUPSUpgradeableSetupV1Mock__factory;
  let SetupV2: PluginUUPSUpgradeableSetupV2Mock__factory;
  let SetupV3: PluginUUPSUpgradeableSetupV3Mock__factory;
  let setupV1: PluginUUPSUpgradeableSetupV1Mock;
  let setupV2: PluginUUPSUpgradeableSetupV2Mock;
  let setupV3: PluginUUPSUpgradeableSetupV3Mock;
  let SetupC1: PluginCloneableSetupV1Mock__factory;
  let SetupC2: PluginCloneableSetupV2Mock__factory;
  let setupC1: PluginCloneableSetupV1Mock;
  let setupC2: PluginCloneableSetupV2Mock;
  let setupV1Bad: PluginUUPSUpgradeableSetupV1MockBad;
  let ownerAddress: string;
  let targetDao: DAO;
  let targetDao2: DAO;
  let managingDao: DAO;
  let pluginRepoFactory: PluginRepoFactory;
  let pluginRepoRegistry: PluginRepoRegistry;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

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

    SetupC1 = await ethers.getContractFactory('PluginCloneableSetupV1Mock');
    setupC1 = await SetupC1.deploy();

    SetupC2 = await ethers.getContractFactory('PluginCloneableSetupV2Mock');
    setupC2 = await SetupC2.deploy();

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
    let tx = await pluginRepoFactory.createPluginRepoWithVersion(
      `PluginUUPSUpgradeableMock`,
      [1, 0, 0],
      setupV1.address,
      '0x00',
      ownerAddress
    );
    let event = await findEvent(tx, EVENTS.PluginRepoRegistered);
    const PluginRepo = await ethers.getContractFactory('PluginRepo');
    repoUUPS = PluginRepo.attach(event.args.pluginRepo);

    // Add setups
    await repoUUPS.createVersion([1, 1, 0], setupV2.address, EMPTY_DATA);
    await repoUUPS.createVersion([1, 2, 0], setupV3.address, EMPTY_DATA);
    await repoUUPS.createVersion([1, 3, 0], setupV1Bad.address, EMPTY_DATA);

    tx = await pluginRepoFactory.createPluginRepoWithVersion(
      `PluginCloneableMock`,
      [1, 0, 0],
      setupC1.address,
      '0x00',
      ownerAddress
    );
    event = await findEvent(tx, EVENTS.PluginRepoRegistered);
    repoClones = PluginRepo.attach(event.args.pluginRepo);
    await repoClones.createVersion([1, 1, 0], setupC2.address, EMPTY_DATA);
  });

  beforeEach(async function () {
    // Target DAO to be used as an example DAO
    targetDao = await deployNewDAO(ownerAddress);
    targetDao2 = await deployNewDAO(ownerAddress);

    // Grant
    await targetDao.grant(targetDao.address, psp.address, ROOT_PERMISSION_ID);
  });

  describe('Plugin Setup Mocks', function () {
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
        repoUUPS.address,
        EMPTY_DATA
      );

      const proxy = await pluginFactory
        .attach(plugin)
        .callStatic.getImplementationAddress();

      expect(proxy).to.equal(await setup.callStatic.getImplementationAddress());
    }
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
          repoUUPS.address,
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
            repoUUPS.address,
            data2
          )
        ).to.be.revertedWith(customError('SetupAlreadyPrepared'));
      });

      it('returns the plugin, helpers, and permissions', async () => {
        let plugin;
        let helpersV1;
        let permissionsV1;
        ({
          plugin: plugin,
          helpers: helpersV1,
          permissions: permissionsV1,
        } = await prepareInstallation(
          psp,
          targetDao.address,
          setupV1.address,
          repoUUPS.address,
          EMPTY_DATA
        ));

        expect(plugin).to.not.equal(AddressZero);
        expect(helpersV1).to.deep.equal(mockHelpers(1));
        expect(permissionsV1).to.deep.equal(
          mockPermissionsOperations(0, 1, Operation.Grant).map(perm =>
            Object.values(perm)
          )
        );
      });

      it('prepares a UUPS upgradeable plugin installation', async () => {
        await expect(
          prepareInstallation(
            psp,
            targetDao.address,
            setupV1.address,
            repoUUPS.address,
            EMPTY_DATA
          )
        ).to.not.be.reverted;
      });

      it('prepares a cloneable plugin installation', async () => {
        await expect(
          prepareInstallation(
            psp,
            targetDao.address,
            setupC1.address,
            repoClones.address,
            EMPTY_DATA
          )
        ).to.not.be.reverted;
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

        const pluginSetup = setupV1.address;

        const {plugin, permissions: permissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetup,
          repoUUPS.address,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetup,
            repoUUPS.address,
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
          repoUUPS.address,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetup,
            repoUUPS.address,
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

      it('reverts if a `PluginSetup` contract returns the same plugin address multiple times across different setups', async () => {
        const pluginSetupBad = setupV1Bad.address;

        const dataUser1 = ethers.utils.defaultAbiCoder.encode(
          ['address'],
          [AddressZero]
        );
        const {plugin, permissions: permissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetupBad,
          repoUUPS.address,
          dataUser1
        );

        await psp.applyInstallation(
          targetDao.address,
          pluginSetupBad,
          repoUUPS.address,
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
          repoUUPS.address,
          dataUser2
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetupBad,
            repoUUPS.address,
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
          repoUUPS.address,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetup,
            repoUUPS.address,
            plugin,
            permissions
          )
        )
          .to.emit(psp, EVENTS.InstallationApplied)
          .withArgs(targetDao.address, plugin);
      });

      it.skip('applies multiple prepared installations of the same plugin', async () => {
        await installHelper(psp, targetDao, setupV1, repoUUPS);
        await installHelper(psp, targetDao, setupV1, repoUUPS); // This reverts, because permissions cannot be regranted.
      });
    });
  });

  describe('Uninstallation', function () {
    let proxy: string;
    let helpersV1: string[];
    let permissionsV1: PermissionOperation[];

    beforeEach(async () => {
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

      ({
        plugin: proxy,
        helpers: helpersV1,
        permissions: permissionsV1,
      } = await installHelper(psp, targetDao, setupV1, repoUUPS));
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
        const {plugin, helpers} = await prepareInstallation(
          psp,
          targetDao.address,
          setupV1.address,
          repoUUPS.address,
          EMPTY_DATA
        );

        await expect(
          psp.prepareUninstallation(
            targetDao.address,
            plugin,
            setupV1.address,
            repoUUPS.address,
            helpers,
            EMPTY_DATA
          )
        ).to.be.revertedWith(customError('SetupNotApplied'));
      });

      it('reverts if plugin uninstallation is already prepared', async () => {
        // prepare first uninstallation
        await prepareUninstallation(
          psp,
          targetDao.address,
          proxy,
          setupV1.address,
          repoUUPS.address,
          helpersV1,
          EMPTY_DATA
        );

        // prepare second uninstallation
        await expect(
          prepareUninstallation(
            psp,
            targetDao.address,
            proxy,
            setupV1.address,
            repoUUPS.address,
            helpersV1,
            EMPTY_DATA
          )
        ).to.be.revertedWith(customError('SetupAlreadyPrepared'));
      });

      it('returns the plugin, helpers, and permissions', async () => {
        let returnedPluginAddress;
        let returnedHelpers;
        let uninstallPermissionsV1: PermissionOperation[];
        ({
          returnedPluginAddress: returnedPluginAddress,
          returnedHelpers: returnedHelpers,
          permissions: uninstallPermissionsV1,
        } = await prepareUninstallation(
          psp,
          targetDao.address,
          proxy,
          setupV1.address,
          repoUUPS.address,
          helpersV1,
          EMPTY_DATA
        ));

        expect(returnedPluginAddress).to.equal(proxy);
        expect(returnedHelpers).to.deep.equal(helpersV1);
        expect(uninstallPermissionsV1).to.deep.equal(
          mockPermissionsOperations(0, 1, Operation.Revoke).map(perm =>
            Object.values(perm)
          )
        );
      });

      it('prepares a UUPS upgradeable plugin uninstallation', async () => {
        await expect(
          prepareUninstallation(
            psp,
            targetDao.address,
            proxy,
            setupV1.address,
            repoUUPS.address,
            helpersV1,
            EMPTY_DATA
          )
        ).to.not.be.reverted;
      });

      it('prepares a cloneable plugin uninstallation', async () => {
        let clone;
        let helpersC1;
        let permissionsC1;

        ({
          plugin: clone,
          helpers: helpersC1,
          permissions: permissionsC1,
        } = await installHelper(psp, targetDao, setupC1, repoClones));

        await expect(
          prepareUninstallation(
            psp,
            targetDao.address,
            clone,
            setupC1.address,
            repoClones.address,
            helpersC1,
            EMPTY_DATA
          )
        ).to.not.be.reverted;
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
            proxy,
            setupV1.address,
            repoUUPS.address,
            helpersV1,
            permissionsV1
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

      it("reverts if PluginSetupProcessor does not have DAO's `ROOT_PERMISSION`", async () => {
        await targetDao.revoke(
          targetDao.address,
          psp.address,
          ROOT_PERMISSION_ID
        );

        let returnedPluginAddress;
        let returnedHelpers;
        let uninstallPermissionsV1;
        ({
          returnedPluginAddress: returnedPluginAddress,
          returnedHelpers: returnedHelpers,
          permissions: uninstallPermissionsV1,
        } = await prepareUninstallation(
          psp,
          targetDao.address,
          proxy,
          setupV1.address,
          repoUUPS.address,
          helpersV1,
          EMPTY_DATA
        ));

        await expect(
          psp.applyUninstallation(
            targetDao.address,
            proxy,
            setupV1.address,
            repoUUPS.address,
            helpersV1,
            uninstallPermissionsV1
          )
        ).to.be.revertedWith(
          customError(
            'Unauthorized',
            targetDao.address,
            uninstallPermissionsV1[0]['where'],
            psp.address,
            ROOT_PERMISSION_ID
          )
        );
      });

      it('reverts if helpers do not match', async () => {
        await expect(
          psp.applyUninstallation(
            targetDao.address,
            proxy,
            setupV1.address,
            repoUUPS.address,
            [],
            []
          )
        ).to.be.revertedWith(customError('HelpersHashMismatch'));
      });

      it('revert bad permissions is passed', async () => {
        await psp.callStatic.prepareUninstallation(
          targetDao.address,
          proxy,
          setupV1.address,
          repoUUPS.address,
          helpersV1,
          EMPTY_DATA
        );

        let badPermissions: PermissionOperation[] = [];
        await expect(
          psp.applyUninstallation(
            targetDao.address,
            proxy,
            setupV1.address,
            repoUUPS.address,
            helpersV1,
            badPermissions
          )
        ).to.be.revertedWith(customError('PermissionsHashMismatch'));
      });

      it('applies a prepared uninstallation', async () => {
        await expect(
          uninstallHelper(psp, targetDao, proxy, helpersV1, setupV1, repoUUPS)
        ).to.not.be.reverted;
      });

      it.skip('applies multiple prepared uninstallations of the same plugin', async () => {
        ({
          plugin: proxy,
          helpers: helpersV1,
          permissions: permissionsV1,
        } = await installHelper(psp, targetDao, setupV1, repoUUPS));
        await installHelper(psp, targetDao, setupV1, repoUUPS); // This reverts, because permissions cannot be regranted.

        await uninstallHelper(
          psp,
          targetDao,
          proxy,
          helpersV1,
          setupV1,
          repoUUPS
        ); // Uninstalling it the first time works but the second would not function anymore since its `permissionsV1` are revoked already.
        await uninstallHelper(
          psp,
          targetDao,
          proxy,
          helpersV1,
          setupV1,
          repoUUPS
        ); // This would revert, because permissions cannot be re-revoked.
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
        } = await installHelper(psp, targetDao, setupV1, repoUUPS));
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

      it('reverts if plugin supports the `IPlugin` interface, but is non-upgradable', async () => {
        await targetDao2.grant(
          targetDao2.address,
          psp.address,
          ROOT_PERMISSION_ID
        );
        await targetDao2.grant(
          psp.address,
          ownerAddress,
          APPLY_INSTALLATION_PERMISSION_ID
        );
        await targetDao2.grant(
          psp.address,
          ownerAddress,
          APPLY_UPDATE_PERMISSION_ID
        );

        let pluginCloneable;
        ({
          plugin: pluginCloneable,
          helpers: helpersV1,
          permissions: permissionsV1,
        } = await installHelper(psp, targetDao2, setupC1, repoClones));

        let pluginUpdateParams = {
          plugin: pluginCloneable,
          pluginSetupRepo: repoClones.address,
          currentPluginSetup: setupC1.address,
          newPluginSetup: setupC2.address,
        };

        await expect(
          psp.prepareUpdate(
            targetDao2.address,
            pluginUpdateParams,
            helpersV1,
            EMPTY_DATA
          )
        ).to.be.revertedWith(
          customError('PluginNonupgradeable', pluginCloneable)
        );
      });

      it('reverts if `PluginSetupRepo` do not exist on `PluginRepoRegistry`', async () => {
        const {plugin, helpers} = await prepareInstallation(
          psp,
          targetDao.address,
          setupV1.address,
          repoUUPS.address,
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
          repoUUPS.address,
          EMPTY_DATA
        );

        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: repoUUPS.address,
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

      it('revert if helpers passed do not match', async () => {
        const pluginUpdateParams = {
          plugin: proxy,
          pluginSetupRepo: repoUUPS.address,
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
          pluginSetupRepo: repoUUPS.address,
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
        );
        expect(initData).not.to.be.equal(''); // TODO, improve test
      });

      it('prepares an update', async () => {
        await expect(
          prepareUpdate(
            psp,
            targetDao.address,
            proxy,
            setupV1.address,
            setupV2.address,
            repoUUPS.address,
            helpersV1,
            EMPTY_DATA
          )
        ).to.not.be.reverted;
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
          repoUUPS.address,
          EMPTY_DATA
        ));

        await psp.applyInstallation(
          targetDao.address,
          setupV1.address,
          repoUUPS.address,
          proxy,
          permissionsV1
        );

        const pluginUpdateParams = {
          plugin: proxy,
          pluginSetupRepo: repoUUPS.address,
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
            repoUUPS.address,
            initDataV2,
            permissionsV2
          )
        ).to.be.revertedWith(
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
          plugin: proxy,
          helpers: helpersV1,
          permissions: permissionsV1,
        } = await installHelper(psp, targetDao, setupV1, repoUUPS));
      });

      it('points to the V1 implementation', async () => {
        expect(
          await PluginV1.attach(proxy).callStatic.getImplementationAddress()
        ).to.equal(await setupV1.callStatic.getImplementationAddress());
      });

      it('initializes the members', async () => {
        expect(await PluginV1.attach(proxy).state1()).to.equal(1);
      });

      it('sets the V1 helpers', async () => {
        expect(helpersV1).to.deep.equal(mockHelpers(1));
      });

      it('sets the V1 permissions', async () => {
        expect(permissionsV1).to.deep.equal(
          mockPermissionsOperations(0, 1, Operation.Grant).map(perm =>
            Object.values(perm)
          )
        );
      });

      it('updates to V2', async () => {
        await updateHelper(
          psp,
          targetDao,
          proxy,
          repoUUPS,
          helpersV1,
          setupV1,
          setupV2
        );
      });

      it('updates to V3', async () => {
        await updateHelper(
          psp,
          targetDao,
          proxy,
          repoUUPS,
          helpersV1,
          setupV1,
          setupV3
        );
      });

      it('cannot update again to V1', async () => {
        await expect(
          updateHelper(
            psp,
            targetDao,
            proxy,
            repoUUPS,
            helpersV1,
            setupV1,
            setupV1
          )
        ).to.be.reverted;
      });

      context(`and updated to V2`, function () {
        let helpersV2: string[];
        let permissionsV1V2: PermissionOperation[];
        let initDataV1V2: BytesLike;

        beforeEach(async () => {
          ({
            updatedHelpers: helpersV2,
            permissions: permissionsV1V2,
            initData: initDataV1V2,
          } = await updateHelper(
            psp,
            targetDao,
            proxy,
            repoUUPS,
            helpersV1,
            setupV1,
            setupV2
          ));
        });

        it('cannot update to V2 again', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoUUPS,
              helpersV2,
              setupV2,
              setupV2
            )
          ).to.be.reverted;
        });

        it('points to the V2 implementation', async () => {
          expect(
            await PluginV2.attach(proxy).callStatic.getImplementationAddress()
          ).to.equal(await setupV2.callStatic.getImplementationAddress());
        });

        it('initializes the members', async () => {
          expect(await PluginV2.attach(proxy).state1()).to.equal(1);
          expect(await PluginV2.attach(proxy).state2()).to.equal(2);
        });

        it('sets the V2 helpers', async () => {
          expect(helpersV2).to.deep.equal(mockHelpers(2));
        });

        it('sets the V1 to V2 permissions', async () => {
          expect(permissionsV1V2).to.deep.equal(
            mockPermissionsOperations(1, 2, Operation.Grant).map(perm =>
              Object.values(perm)
            )
          );
        });

        it('updates to V3', async () => {
          await updateHelper(
            psp,
            targetDao,
            proxy,
            repoUUPS,
            helpersV2,
            setupV2,
            setupV3
          );
        });

        it('cannot update back to V1', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoUUPS,
              helpersV2,
              setupV2,
              setupV1
            )
          ).to.be.reverted;
        });

        it('cannot update again to V2', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoUUPS,
              helpersV2,
              setupV2,
              setupV2
            )
          ).to.be.reverted;
        });

        context(`and updated to V3`, function () {
          let helpersV3: string[];
          let permissionsV2V3: PermissionOperation[];
          let initDataV2V3: BytesLike;

          beforeEach(async () => {
            ({
              updatedHelpers: helpersV3,
              permissions: permissionsV2V3,
              initData: initDataV2V3,
            } = await updateHelper(
              psp,
              targetDao,
              proxy,
              repoUUPS,
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

          it('initializes the members', async () => {
            expect(await PluginV3.attach(proxy).state1()).to.equal(1);
            expect(await PluginV3.attach(proxy).state2()).to.equal(2);
            expect(await PluginV3.attach(proxy).state3()).to.equal(3);
          });

          it('sets the V3 helpers', async () => {
            expect(helpersV3).to.deep.equal(mockHelpers(3));
          });

          it('sets the V2 to V3 permissions', async () => {
            expect(permissionsV2V3).to.deep.equal(
              mockPermissionsOperations(2, 3, Operation.Grant).map(perm =>
                Object.values(perm)
              )
            );
          });

          it('cannot update back to V1', async () => {
            await expect(
              updateHelper(
                psp,
                targetDao,
                proxy,
                repoUUPS,
                helpersV3,
                setupV3,
                setupV1
              )
            ).to.be.reverted;
          });

          it('cannot update back to V2', async () => {
            await expect(
              updateHelper(
                psp,
                targetDao,
                proxy,
                repoUUPS,
                helpersV3,
                setupV3,
                setupV2
              )
            ).to.be.reverted;
          });

          it('cannot update again to V3', async () => {
            await expect(
              updateHelper(
                psp,
                targetDao,
                proxy,
                repoUUPS,
                helpersV3,
                setupV3,
                setupV3
              )
            ).to.be.reverted;
          });
        });
      });
      context(`and updated to V3`, function () {
        let helpersV3: string[];
        let permissionsV1V3: PermissionOperation[];
        let initDataV1V3: BytesLike;

        beforeEach(async () => {
          ({
            updatedHelpers: helpersV3,
            permissions: permissionsV1V3,
            initData: initDataV1V3,
          } = await updateHelper(
            psp,
            targetDao,
            proxy,
            repoUUPS,
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

        it('initializes the members', async () => {
          expect(await PluginV3.attach(proxy).state1()).to.equal(1);
          expect(await PluginV3.attach(proxy).state2()).to.equal(2);
          expect(await PluginV3.attach(proxy).state3()).to.equal(3);
        });

        it('sets the V3 helpers', async () => {
          expect(helpersV3).to.deep.equal(mockHelpers(3));
        });

        it('sets the V1 to V3 permissions', async () => {
          expect(permissionsV1V3).to.deep.equal(
            mockPermissionsOperations(1, 3, Operation.Grant).map(perm =>
              Object.values(perm)
            )
          );
        });

        it('cannot update back to V1', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoUUPS,
              helpersV3,
              setupV3,
              setupV1
            )
          ).to.be.reverted;
        });

        it('cannot update back to V2', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoUUPS,
              helpersV3,
              setupV3,
              setupV2
            )
          ).to.be.reverted;
        });

        it('cannot update again to V3', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoUUPS,
              helpersV3,
              setupV3,
              setupV3
            )
          ).to.be.reverted;
        });
      });
    });

    context(`V2 was installed`, function () {
      let proxy: string;
      let helpersV2: string[];
      let permissionsV2: PermissionOperation[];

      beforeEach(async () => {
        ({
          plugin: proxy,
          helpers: helpersV2,
          permissions: permissionsV2,
        } = await installHelper(psp, targetDao, setupV2, repoUUPS));
      });

      it('points to the V2 implementation', async () => {
        expect(
          await PluginV2.attach(proxy).callStatic.getImplementationAddress()
        ).to.equal(await setupV2.callStatic.getImplementationAddress());
      });

      it('initializes the members', async () => {
        expect(await PluginV2.attach(proxy).state1()).to.equal(1);
        expect(await PluginV2.attach(proxy).state2()).to.equal(2);
      });

      it('sets the V2 helpers', async () => {
        expect(helpersV2).to.deep.equal(mockHelpers(2));
      });

      it('sets the V2 permissions', async () => {
        expect(permissionsV2).to.deep.equal(
          mockPermissionsOperations(0, 2, Operation.Grant).map(perm =>
            Object.values(perm)
          )
        );
      });

      it('updates to V3', async () => {
        await updateHelper(
          psp,
          targetDao,
          proxy,
          repoUUPS,
          helpersV2,
          setupV2,
          setupV3
        );
      });

      it('cannot update back to V1', async () => {
        await expect(
          updateHelper(
            psp,
            targetDao,
            proxy,
            repoUUPS,
            helpersV2,
            setupV2,
            setupV1
          )
        ).to.be.reverted;
      });

      it('cannot update again to V2', async () => {
        await expect(
          updateHelper(
            psp,
            targetDao,
            proxy,
            repoUUPS,
            helpersV2,
            setupV2,
            setupV2
          )
        ).to.be.reverted;
      });

      context(`and updated to V3`, function () {
        let helpersV3: string[];
        let permissionsV2V3: PermissionOperation[];
        let initDataV2V3: BytesLike;

        beforeEach(async () => {
          ({
            updatedHelpers: helpersV3,
            permissions: permissionsV2V3,
            initData: initDataV2V3,
          } = await updateHelper(
            psp,
            targetDao,
            proxy,
            repoUUPS,
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

        it('initializes the members', async () => {
          expect(await PluginV3.attach(proxy).state1()).to.equal(1);
          expect(await PluginV3.attach(proxy).state2()).to.equal(2);
          expect(await PluginV3.attach(proxy).state3()).to.equal(3);
        });

        it('sets the V3 helpers', async () => {
          expect(helpersV3).to.deep.equal(mockHelpers(3));
        });

        it('sets the V2 to V3 permissions', async () => {
          expect(permissionsV2V3).to.deep.equal(
            mockPermissionsOperations(2, 3, Operation.Grant).map(perm =>
              Object.values(perm)
            )
          );
        });

        it('cannot update again to V3', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoUUPS,
              helpersV3,
              setupV3,
              setupV3
            )
          ).to.be.reverted;
        });

        it('cannot update back to V1', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoUUPS,
              helpersV3,
              setupV3,
              setupV1
            )
          ).to.be.reverted;
        });

        it('cannot update back to V2', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoUUPS,
              helpersV3,
              setupV3,
              setupV2
            )
          ).to.be.reverted;
        });
      });
    });

    context(`V3 was installed`, function () {
      let proxy: string;
      let helpersV3: string[];
      let permissionsV3: PermissionOperation[];

      beforeEach(async () => {
        ({
          plugin: proxy,
          helpers: helpersV3,
          permissions: permissionsV3,
        } = await installHelper(psp, targetDao, setupV3, repoUUPS));
      });

      it('points to the V3 implementation', async () => {
        expect(
          await PluginV3.attach(proxy).callStatic.getImplementationAddress()
        ).to.equal(await setupV3.callStatic.getImplementationAddress());
      });

      it('initializes the members', async () => {
        expect(await PluginV3.attach(proxy).state1()).to.equal(1);
        expect(await PluginV3.attach(proxy).state2()).to.equal(2);
        expect(await PluginV3.attach(proxy).state3()).to.equal(3);
      });

      it('sets the V3 helpers', async () => {
        expect(helpersV3).to.deep.equal(mockHelpers(3));
      });

      it('sets the V3 permissions', async () => {
        expect(permissionsV3).to.deep.equal(
          mockPermissionsOperations(0, 3, Operation.Grant).map(perm =>
            Object.values(perm)
          )
        );
      });

      it('cannot update again to V3', async () => {
        await expect(
          updateHelper(
            psp,
            targetDao,
            proxy,
            repoUUPS,
            helpersV3,
            setupV3,
            setupV3
          )
        ).to.be.reverted;
      });

      it('cannot update back to V1', async () => {
        await expect(
          updateHelper(
            psp,
            targetDao,
            proxy,
            repoUUPS,
            helpersV3,
            setupV3,
            setupV1
          )
        ).to.be.reverted;
      });

      it('cannot update back to V2', async () => {
        await expect(
          updateHelper(
            psp,
            targetDao,
            proxy,
            repoUUPS,
            helpersV3,
            setupV3,
            setupV2
          )
        ).to.be.reverted;
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
    | PluginUUPSUpgradeableSetupV3Mock
    | PluginCloneableSetupV1Mock
    | PluginCloneableSetupV2Mock,
  pluginRepo: PluginRepo
): Promise<{
  plugin: string;
  helpers: string[];
  permissions: PermissionOperation[];
}> {
  let plugin: string;
  let helpers: string[];
  let permissions: PermissionOperation[];
  ({
    plugin: plugin,
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
    plugin,
    permissions
  );
  return {plugin: plugin, helpers, permissions};
}

async function uninstallHelper(
  psp: PluginSetupProcessor,
  targetDao: DAO,
  plugin: string,
  currentHelpers: string[],
  setup:
    | PluginUUPSUpgradeableSetupV1Mock
    | PluginUUPSUpgradeableSetupV2Mock
    | PluginUUPSUpgradeableSetupV3Mock
    | PluginCloneableSetupV1Mock
    | PluginCloneableSetupV2Mock,
  pluginRepo: PluginRepo
): Promise<{
  plugin: string;
  helpers: string[];
  permissions: PermissionOperation[];
}> {
  const prepareUninstallationTx = await psp.prepareUninstallation(
    targetDao.address,
    plugin,
    setup.address,
    pluginRepo.address,
    currentHelpers,
    EMPTY_DATA
  );

  const prepareUninstallationEvent = await findEvent(
    prepareUninstallationTx,
    'UninstallationPrepared'
  );
  expect(prepareUninstallationEvent).to.not.equal(undefined);

  const {currentHelpers: returnedCurrentHelpers, permissions: permissions} =
    prepareUninstallationEvent.args;

  expect(returnedCurrentHelpers).to.deep.equal(currentHelpers);

  psp.applyUninstallation(
    targetDao.address,
    plugin,
    setup.address,
    pluginRepo.address,
    currentHelpers,
    permissions
  );

  return {plugin: plugin, helpers: currentHelpers, permissions};
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
    | PluginUUPSUpgradeableSetupV3Mock
    | PluginCloneableSetupV1Mock
    | PluginCloneableSetupV2Mock,
  newVersionSetup:
    | PluginUUPSUpgradeableSetupV1Mock
    | PluginUUPSUpgradeableSetupV2Mock
    | PluginUUPSUpgradeableSetupV3Mock
    | PluginCloneableSetupV1Mock
    | PluginCloneableSetupV2Mock
): Promise<{
  updatedHelpers: string[];
  permissions: PermissionOperation[];
  initData: BytesLike;
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

  return {updatedHelpers, permissions, initData};
}
