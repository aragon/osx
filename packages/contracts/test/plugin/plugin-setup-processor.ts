import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  PluginSetupProcessor,
  PluginUUPSUpgradeableV1Mock__factory,
  PluginUUPSUpgradeableV2Mock__factory,
  PluginUUPSUpgradeableV3Mock__factory,
  PluginUUPSUpgradeableSetupV1Mock,
  PluginUUPSUpgradeableSetupV1MockBad,
  PluginUUPSUpgradeableSetupV2Mock,
  PluginUUPSUpgradeableSetupV3Mock,
  PluginUUPSUpgradeableSetupV4Mock,
  PluginCloneableSetupV1Mock,
  PluginCloneableSetupV2Mock,
  PluginRepoFactory,
  PluginRepoRegistry,
  PluginRepo,
  DAO,
} from '../../typechain';

import {customError} from '../test-utils/custom-error-helper';
import {deployENSSubdomainRegistrar} from '../test-utils/ens';

import {deployNewDAO} from '../test-utils/dao';
import {findEvent} from '../../utils/event';
import {Operation} from '../core/permission/permission-manager';
import {
  deployPluginSetupProcessor,
  prepareInstallation,
  prepareUpdate,
  prepareUninstallation,
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
  Upgraded: 'Upgraded',
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
  let repoU: PluginRepo;
  let PluginUV1: PluginUUPSUpgradeableV1Mock__factory;
  let PluginUV2: PluginUUPSUpgradeableV2Mock__factory;
  let PluginUV3: PluginUUPSUpgradeableV3Mock__factory;
  let setupUV1: PluginUUPSUpgradeableSetupV1Mock;
  let setupUV2: PluginUUPSUpgradeableSetupV2Mock;
  let setupUV3: PluginUUPSUpgradeableSetupV3Mock;
  let setupUV4: PluginUUPSUpgradeableSetupV4Mock;
  let setupUV1Bad: PluginUUPSUpgradeableSetupV1MockBad;
  let repoC: PluginRepo;
  let setupCV1: PluginCloneableSetupV1Mock;
  let setupCV2: PluginCloneableSetupV2Mock;
  let ownerAddress: string;
  let targetDao: DAO;
  let managingDao: DAO;
  let pluginRepoFactory: PluginRepoFactory;
  let pluginRepoRegistry: PluginRepoRegistry;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    PluginUV1 = await ethers.getContractFactory('PluginUUPSUpgradeableV1Mock');
    PluginUV2 = await ethers.getContractFactory('PluginUUPSUpgradeableV2Mock');
    PluginUV3 = await ethers.getContractFactory('PluginUUPSUpgradeableV3Mock');

    // Deploy PluginUUPSUpgradeableSetupMock
    const SetupV1 = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV1Mock'
    );
    setupUV1 = await SetupV1.deploy();

    const SetupV2 = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV2Mock'
    );
    setupUV2 = await SetupV2.deploy();

    const SetupV3 = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV3Mock'
    );
    setupUV3 = await SetupV3.deploy();

    const SetupV4 = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV4Mock'
    );
    setupUV4 = await SetupV4.deploy(await setupUV3.getImplementationAddress());

    // Deploy PluginCloneableSetupMock
    const SetupC1 = await ethers.getContractFactory(
      'PluginCloneableSetupV1Mock'
    );
    setupCV1 = await SetupC1.deploy();

    const SetupC2 = await ethers.getContractFactory(
      'PluginCloneableSetupV2Mock'
    );
    setupCV2 = await SetupC2.deploy();

    const PluginUUPSUpgradeableSetupV1MockBad = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV1MockBad'
    );
    setupUV1Bad = await PluginUUPSUpgradeableSetupV1MockBad.deploy();

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
    let tx = await pluginRepoFactory.createPluginRepoWithContractAndContentURI(
      `PluginUUPSUpgradeableMock`,
      setupUV1.address,
      '0x00',
      ownerAddress
    );
    let event = await findEvent(tx, EVENTS.PluginRepoRegistered);
    const PluginRepo = await ethers.getContractFactory('PluginRepo');
    repoU = PluginRepo.attach(event.args.pluginRepo);

    // Add setups
    await repoU.createVersion(1, setupUV2.address, EMPTY_DATA);
    await repoU.createVersion(1, setupUV3.address, EMPTY_DATA);
    await repoU.createVersion(1, setupUV1Bad.address, EMPTY_DATA);
    await repoU.createVersion(1, setupUV4.address, EMPTY_DATA);

    tx = await pluginRepoFactory.createPluginRepoWithContractAndContentURI(
      `PluginCloneableMock`,
      setupCV1.address,
      '0x00',
      ownerAddress
    );
    event = await findEvent(tx, EVENTS.PluginRepoRegistered);
    repoC = PluginRepo.attach(event.args.pluginRepo);
    await repoC.createVersion(1, setupCV2.address, EMPTY_DATA);
  });

  beforeEach(async function () {
    // Target DAO to be used as an example DAO
    targetDao = await deployNewDAO(ownerAddress);

    // Grant
    await targetDao.grant(targetDao.address, psp.address, ROOT_PERMISSION_ID);
  });

  describe('PluginUUPSUpgradeableSetupMock', function () {
    it('points to the V1 implementation', async () => {
      await checkImplementation(setupUV1, PluginUV1);
    });

    it('points to the V2 implementation', async () => {
      await checkImplementation(setupUV2, PluginUV2);
    });

    it('points to the V3 implementation', async () => {
      await checkImplementation(setupUV3, PluginUV3);
    });

    async function checkImplementation(setup: any, pluginFactory: any) {
      const {plugin} = await prepareInstallation(
        psp,
        targetDao.address,
        setup.address,
        repoU.address,
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
            setupUV1.address,
            pluginSetupRepoAddr,
            data
          )
        ).to.be.revertedWith(customError('PluginRepoNonexistent'));
      });

      it('reverts if installation is already prepared', async () => {
        const pluginSetupBad = setupUV1Bad.address;

        const data1 = ethers.utils.defaultAbiCoder.encode(
          ['address'],
          [AddressZero]
        );
        const {plugin, permissions: permissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetupBad,
          repoU.address,
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
            repoU.address,
            data2
          )
        ).to.be.revertedWith(customError('SetupAlreadyPrepared'));
      });

      it('prepares an UUPS upgradeable plugin installation', async () => {
        let plugin;
        let helpersUV1;
        let permissionsUV1;
        ({
          plugin: plugin,
          helpers: helpersUV1,
          permissions: permissionsUV1,
        } = await prepareInstallation(
          psp,
          targetDao.address,
          setupUV1.address,
          repoU.address,
          EMPTY_DATA
        ));

        expect(plugin).to.not.equal(AddressZero);
        expect(helpersUV1).to.deep.equal(mockHelpers(1));
        expect(permissionsUV1).to.deep.equal(
          mockPermissionsOperations(0, 1, Operation.Grant).map(perm =>
            Object.values(perm)
          )
        );
      });

      it('prepares a cloneable plugin installation', async () => {
        let plugin;
        let helpersCV1;
        let permissionsCV1;
        ({
          plugin: plugin,
          helpers: helpersCV1,
          permissions: permissionsCV1,
        } = await prepareInstallation(
          psp,
          targetDao.address,
          setupCV1.address,
          repoC.address,
          EMPTY_DATA
        ));

        expect(plugin).to.not.equal(AddressZero);
        expect(helpersCV1).to.deep.equal(mockHelpers(1));
        expect(permissionsCV1).to.deep.equal(
          mockPermissionsOperations(5, 6, Operation.Grant).map(perm =>
            Object.values(perm)
          )
        );
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

        const pluginSetup = setupUV1.address;

        const {plugin, permissions: permissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetup,
          repoU.address,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetup,
            repoU.address,
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

        const pluginSetup = setupUV1.address;

        const {plugin, permissions: permissions} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetup,
          repoU.address,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            pluginSetup,
            repoU.address,
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
        const pluginSetupBad = setupUV1Bad.address;

        const dataUser1 = ethers.utils.defaultAbiCoder.encode(
          ['address'],
          [AddressZero]
        );
        const {plugin, permissions: permissions} = await prepareInstallation(
          psp,
          targetDao.address,
          setupUV1Bad.address,
          repoU.address,
          dataUser1
        );

        await psp.applyInstallation(
          targetDao.address,
          setupUV1Bad.address,
          repoU.address,
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
          setupUV1Bad.address,
          repoU.address,
          dataUser2
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            setupUV1Bad.address,
            repoU.address,
            secondPreparation.plugin,
            secondPreparation.permissions
          )
        ).to.be.revertedWith(customError('SetupAlreadyApplied'));
      });

      it('reverts if there is a mismatch between the permissions prepared and to be applied', async () => {
        let plugin;
        let helpers;
        let permissions;
        ({
          plugin: plugin,
          helpers: helpers,
          permissions: permissions,
        } = await prepareInstallation(
          psp,
          targetDao.address,
          setupUV1.address,
          repoU.address,
          EMPTY_DATA
        ));

        let badPermissions: PermissionOperation[] = [];
        await expect(
          psp.applyInstallation(
            targetDao.address,
            setupUV1.address,
            repoU.address,
            plugin,
            badPermissions
          )
        ).to.be.revertedWith(customError('PermissionsHashMismatch'));
      });

      it('reverts if the installation was not prepared', async () => {
        let unpreparedPlugin;
        let unpreparedHelpers;
        let unPreparedPermissions;

        // We use `callStatic` so that the installation is not prepared
        ({
          plugin: unpreparedPlugin,
          helpers: unpreparedHelpers,
          permissions: unPreparedPermissions,
        } = await psp.callStatic.prepareInstallation(
          targetDao.address,
          setupUV1.address,
          repoU.address,
          EMPTY_DATA
        ));

        await expect(
          psp.applyInstallation(
            targetDao.address,
            setupUV1.address,
            repoU.address,
            unpreparedPlugin,
            unPreparedPermissions
          )
        ).to.be.revertedWith(customError('SetupNotPrepared'));
      });

      it('applies a prepared installation', async () => {
        const {plugin, permissions: permissions} = await prepareInstallation(
          psp,
          targetDao.address,
          setupUV1.address,
          repoU.address,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            setupUV1.address,
            repoU.address,
            plugin,
            permissions
          )
        )
          .to.emit(psp, EVENTS.InstallationApplied)
          .withArgs(targetDao.address, plugin);
      });

      it.skip('applies multiple prepared installations of the same plugin', async () => {
        await installHelper(psp, targetDao, setupUV1, repoU);
        await installHelper(psp, targetDao, setupUV1, repoU); // This reverts, because permissions cannot be regranted.
      });
    });
  });

  describe('Uninstallation', function () {
    let proxy: string;
    let helpersUV1: string[];
    let permissionsUV1: PermissionOperation[];

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
        helpers: helpersUV1,
        permissions: permissionsUV1,
      } = await installHelper(psp, targetDao, setupUV1, repoU));
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
        ).to.be.revertedWith(customError('PluginRepoNonexistent'));
      });

      it('reverts if plugin is not applied yet', async () => {
        const {plugin, helpers} = await prepareInstallation(
          psp,
          targetDao.address,
          setupUV1.address,
          repoU.address,
          EMPTY_DATA
        );

        await expect(
          psp.prepareUninstallation(
            targetDao.address,
            plugin,
            setupUV1.address,
            repoU.address,
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
          setupUV1.address,
          repoU.address,
          helpersUV1,
          EMPTY_DATA
        );

        // prepare second uninstallation
        await expect(
          prepareUninstallation(
            psp,
            targetDao.address,
            proxy,
            setupUV1.address,
            repoU.address,
            helpersUV1,
            EMPTY_DATA
          )
        ).to.be.revertedWith(customError('SetupAlreadyPrepared'));
      });

      it('prepares an UUPS upgradeable plugin uninstallation', async () => {
        let returnedPlugin;
        let returnedHelpersV1;
        let uninstallPermissionsV1;
        ({
          returnedPluginAddress: returnedPlugin,
          returnedHelpers: returnedHelpersV1,
          permissions: uninstallPermissionsV1,
        } = await prepareUninstallation(
          psp,
          targetDao.address,
          proxy,
          setupUV1.address,
          repoU.address,
          helpersUV1,
          EMPTY_DATA
        ));

        expect(returnedPlugin).to.not.equal(AddressZero);
        expect(returnedHelpersV1).to.deep.equal(mockHelpers(1));
        expect(uninstallPermissionsV1).to.deep.equal(
          mockPermissionsOperations(0, 1, Operation.Revoke).map(perm =>
            Object.values(perm)
          )
        );
      });

      it('prepares a cloneable plugin uninstallation', async () => {
        let clone;
        let helpersCV1;
        let permissionsCV1;

        ({
          plugin: clone,
          helpers: helpersCV1,
          permissions: permissionsCV1,
        } = await installHelper(psp, targetDao, setupCV1, repoC));

        let returnedPlugin;
        let returnedHelpersV1;
        let uninstallPermissionsV1;
        ({
          returnedPluginAddress: returnedPlugin,
          returnedHelpers: returnedHelpersV1,
          permissions: uninstallPermissionsV1,
        } = await prepareUninstallation(
          psp,
          targetDao.address,
          clone,
          setupCV1.address,
          repoC.address,
          helpersCV1,
          EMPTY_DATA
        ));

        expect(returnedPlugin).to.not.equal(AddressZero);
        expect(returnedHelpersV1).to.deep.equal(mockHelpers(1));
        expect(uninstallPermissionsV1).to.deep.equal(
          mockPermissionsOperations(5, 6, Operation.Revoke).map(perm =>
            Object.values(perm)
          )
        );
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
            setupUV1.address,
            repoU.address,
            helpersUV1,
            permissionsUV1
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
          setupUV1.address,
          repoU.address,
          helpersUV1,
          EMPTY_DATA
        ));

        await expect(
          psp.applyUninstallation(
            targetDao.address,
            proxy,
            setupUV1.address,
            repoU.address,
            helpersUV1,
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
            setupUV1.address,
            repoU.address,
            [],
            []
          )
        ).to.be.revertedWith(customError('HelpersHashMismatch'));
      });

      it('reverts if there is a mismatch between the permissions prepared and to be applied', async () => {
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
          setupUV1.address,
          repoU.address,
          helpersUV1,
          EMPTY_DATA
        ));

        let badPermissions: PermissionOperation[] = [];
        await expect(
          psp.applyUninstallation(
            targetDao.address,
            returnedPluginAddress,
            setupUV1.address,
            repoU.address,
            returnedHelpers,
            badPermissions
          )
        ).to.be.revertedWith(customError('PermissionsHashMismatch'));
      });

      it('applies a prepared uninstallation', async () => {
        await expect(
          uninstallHelper(psp, targetDao, proxy, helpersUV1, setupUV1, repoU)
        ).to.not.be.reverted;
      });

      it.skip('applies multiple prepared uninstallations of the same plugin', async () => {
        ({
          plugin: proxy,
          helpers: helpersUV1,
          permissions: permissionsUV1,
        } = await installHelper(psp, targetDao, setupUV1, repoU));
        await installHelper(psp, targetDao, setupUV1, repoU); // This reverts, because permissions cannot be regranted.

        await uninstallHelper(
          psp,
          targetDao,
          proxy,
          helpersUV1,
          setupUV1,
          repoU
        ); // Uninstalling it the first time works but the second would not function anymore since its `permissionsUV1` are revoked already.
        await uninstallHelper(
          psp,
          targetDao,
          proxy,
          helpersUV1,
          setupUV1,
          repoU
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
      let helpersUV1: string[];
      let permissionsUV1: PermissionOperation[];

      beforeEach(async () => {
        ({
          plugin: proxy,
          helpers: helpersUV1,
          permissions: permissionsUV1,
        } = await installHelper(psp, targetDao, setupUV1, repoU));
      });

      it('reverts if plugin does not support `IPlugin` interface', async () => {
        const pluginSetupRepoAddr = ADDRESS_TWO;
        const plugin = AddressZero;
        let pluginUpdateParams = {
          plugin: plugin,
          oldPluginSetup: setupUV1.address,
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
        let pluginCloneable;
        ({
          plugin: pluginCloneable,
          helpers: helpersUV1,
          permissions: permissionsUV1,
        } = await installHelper(psp, targetDao, setupCV1, repoC));

        let pluginUpdateParams = {
          plugin: pluginCloneable,
          pluginSetupRepo: repoC.address,
          currentPluginSetup: setupCV1.address,
          newPluginSetup: setupCV2.address,
        };

        await expect(
          psp.prepareUpdate(
            targetDao.address,
            pluginUpdateParams,
            helpersUV1,
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
          setupUV1.address,
          repoU.address,
          EMPTY_DATA
        );

        const pluginSetupRepoAddr = ADDRESS_TWO;
        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: pluginSetupRepoAddr,
          currentPluginSetup: setupUV1.address,
          newPluginSetup: setupUV2.address,
        };

        await expect(
          psp.prepareUpdate(
            targetDao.address,
            pluginUpdateParams,
            helpers,
            EMPTY_DATA
          )
        ).to.be.revertedWith(customError('PluginRepoNonexistent'));
      });

      it('revert if plugin is not applied', async () => {
        const {plugin, helpers} = await prepareInstallation(
          psp,
          targetDao.address,
          setupUV1.address,
          repoU.address,
          EMPTY_DATA
        );

        const pluginUpdateParams = {
          plugin: plugin,
          pluginSetupRepo: repoU.address,
          currentPluginSetup: setupUV1.address,
          newPluginSetup: setupUV2.address,
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

      it('reverts if helpers passed do not match', async () => {
        const pluginUpdateParams = {
          plugin: proxy,
          pluginSetupRepo: repoU.address,
          currentPluginSetup: setupUV1.address,
          newPluginSetup: setupUV2.address,
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
          pluginSetupRepo: repoU.address,
          currentPluginSetup: setupUV1.address,
          newPluginSetup: setupUV2.address,
        };

        const result = await psp.callStatic.prepareUpdate(
          targetDao.address,
          pluginUpdateParams,
          helpersUV1,
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
            setupUV1.address,
            setupUV2.address,
            repoU.address,
            helpersUV1,
            EMPTY_DATA
          )
        ).to.not.be.reverted;
      });
    });

    describe('applyUpdate', function () {
      let proxy: string;
      let helpersUV1: string[];
      let permissionsUV1: PermissionOperation[];

      beforeEach(async () => {
        ({
          plugin: proxy,
          helpers: helpersUV1,
          permissions: permissionsUV1,
        } = await installHelper(psp, targetDao, setupUV1, repoU));
      });

      it('reverts if caller does not have `APPLY_UPDATE_PERMISSION` permission', async () => {
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

      it("reverts if PluginSetupProcessor does not have DAO's `ROOT_PERMISSION`", async () => {
        await targetDao.revoke(
          targetDao.address,
          psp.address,
          ROOT_PERMISSION_ID
        );

        // Grant the `UPGRADE_PLUGIN_PERMISSION_ID` permission to the plugin setup processor
        await targetDao.grant(proxy, psp.address, UPGRADE_PLUGIN_PERMISSION_ID);

        const pluginUpdateParams = {
          plugin: proxy,
          pluginSetupRepo: repoU.address,
          currentPluginSetup: setupUV1.address,
          newPluginSetup: setupUV2.address,
        };
        const prepareUpdateTx = await psp.prepareUpdate(
          targetDao.address,
          pluginUpdateParams,
          helpersUV1,
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
            setupUV2.address,
            repoU.address,
            initDataV2,
            permissionsV2
          )
        ).to.be.revertedWith(
          customError(
            'Unauthorized',
            targetDao.address,
            permissionsV2[0]['where'],
            psp.address,
            ROOT_PERMISSION_ID
          )
        );
      });

      it('reverts if the plugin setup processor does not have the `UPGRADE_PLUGIN_PERMISSION_ID` permission', async () => {
        const pluginUpdateParams = {
          plugin: proxy,
          pluginSetupRepo: repoU.address,
          currentPluginSetup: setupUV1.address,
          newPluginSetup: setupUV2.address,
        };
        const prepareUpdateTx = await psp.prepareUpdate(
          targetDao.address,
          pluginUpdateParams,
          helpersUV1,
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
            setupUV2.address,
            repoU.address,
            initDataV2,
            permissionsV2
          )
        ).to.be.revertedWith(
          customError(
            'PluginProxyUpgradeFailed',
            proxy,
            await setupUV2.callStatic.getImplementationAddress(),
            initDataV2
          )
        );
      });

      it('reverts if there is a mismatch between the permissions prepared and to be applied', async () => {
        let returnedPluginAddress;
        let updatedHelpers;
        let permissions;
        let initData;
        ({
          returnedPluginAddress: returnedPluginAddress,
          updatedHelpers: updatedHelpers,
          permissions: permissions,
          initData: initData,
        } = await prepareUpdate(
          psp,
          targetDao.address,
          proxy,
          setupUV1.address,
          setupUV2.address,
          repoU.address,
          helpersUV1,
          EMPTY_DATA
        ));

        let badPermissions: PermissionOperation[] = [];
        await expect(
          psp.applyUpdate(
            targetDao.address,
            returnedPluginAddress,
            setupUV1.address,
            repoU.address,
            initData,
            badPermissions
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
      let helpersUV1: string[];
      let permissionsUV1: PermissionOperation[];

      beforeEach(async () => {
        ({
          plugin: proxy,
          helpers: helpersUV1,
          permissions: permissionsUV1,
        } = await installHelper(psp, targetDao, setupUV1, repoU));
      });

      it('points to the V1 implementation', async () => {
        expect(
          await PluginUV1.attach(proxy).callStatic.getImplementationAddress()
        ).to.equal(await setupUV1.callStatic.getImplementationAddress());
      });

      it('initializes the members', async () => {
        expect(await PluginUV1.attach(proxy).state1()).to.equal(1);
      });

      it('sets the V1 helpers', async () => {
        expect(helpersUV1).to.deep.equal(mockHelpers(1));
      });

      it('sets the V1 permissions', async () => {
        expect(permissionsUV1).to.deep.equal(
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
          repoU,
          helpersUV1,
          setupUV1,
          setupUV2
        );
      });

      it('updates to V3', async () => {
        await updateHelper(
          psp,
          targetDao,
          proxy,
          repoU,
          helpersUV1,
          setupUV1,
          setupUV3
        );
      });

      it('cannot update again to V1', async () => {
        await expect(
          updateHelper(
            psp,
            targetDao,
            proxy,
            repoU,
            helpersUV1,
            setupUV1,
            setupUV1
          )
        ).to.be.reverted;
      });

      context(`and updated to V2`, function () {
        let helpersV2: string[];
        let permissionsUV1V2: PermissionOperation[];
        let initDataV1V2: BytesLike;

        beforeEach(async () => {
          ({
            updatedHelpers: helpersV2,
            permissions: permissionsUV1V2,
            initData: initDataV1V2,
          } = await updateHelper(
            psp,
            targetDao,
            proxy,
            repoU,
            helpersUV1,
            setupUV1,
            setupUV2
          ));
        });

        it('points to the V2 implementation', async () => {
          expect(
            await PluginUV2.attach(proxy).callStatic.getImplementationAddress()
          ).to.equal(await setupUV2.callStatic.getImplementationAddress());
        });

        it('initializes the members', async () => {
          expect(await PluginUV2.attach(proxy).state1()).to.equal(1);
          expect(await PluginUV2.attach(proxy).state2()).to.equal(2);
        });

        it('sets the V2 helpers', async () => {
          expect(helpersV2).to.deep.equal(mockHelpers(2));
        });

        it('sets the V1 to V2 permissions', async () => {
          expect(permissionsUV1V2).to.deep.equal(
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
            repoU,
            helpersV2,
            setupUV2,
            setupUV3
          );
        });

        it('cannot update back to V1', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoU,
              helpersV2,
              setupUV2,
              setupUV1
            )
          ).to.be.reverted;
        });

        it('cannot update again to V2', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoU,
              helpersV2,
              setupUV2,
              setupUV2
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
              repoU,
              helpersV2,
              setupUV2,
              setupUV3
            ));
          });

          it('points to the V3 implementation', async () => {
            expect(
              await PluginUV3.attach(
                proxy
              ).callStatic.getImplementationAddress()
            ).to.equal(await setupUV3.callStatic.getImplementationAddress());
          });

          it('initializes the members', async () => {
            expect(await PluginUV3.attach(proxy).state1()).to.equal(1);
            expect(await PluginUV3.attach(proxy).state2()).to.equal(2);
            expect(await PluginUV3.attach(proxy).state3()).to.equal(3);
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
                repoU,
                helpersV3,
                setupUV3,
                setupUV1
              )
            ).to.be.reverted;
          });

          it('cannot update back to V2', async () => {
            await expect(
              updateHelper(
                psp,
                targetDao,
                proxy,
                repoU,
                helpersV3,
                setupUV3,
                setupUV2
              )
            ).to.be.reverted;
          });

          it('cannot update again to V3', async () => {
            await expect(
              updateHelper(
                psp,
                targetDao,
                proxy,
                repoU,
                helpersV3,
                setupUV3,
                setupUV3
              )
            ).to.be.reverted;
          });
        });
      });
      context(`and updated to V3`, function () {
        let helpersV3: string[];
        let permissionsUV1V3: PermissionOperation[];
        let initDataV1V3: BytesLike;

        beforeEach(async () => {
          ({
            updatedHelpers: helpersV3,
            permissions: permissionsUV1V3,
            initData: initDataV1V3,
          } = await updateHelper(
            psp,
            targetDao,
            proxy,
            repoU,
            helpersUV1,
            setupUV1,
            setupUV3
          ));
        });

        it('points to the V3 implementation', async () => {
          expect(
            await PluginUV3.attach(proxy).callStatic.getImplementationAddress()
          ).to.equal(await setupUV3.callStatic.getImplementationAddress());
        });

        it('initializes the members', async () => {
          expect(await PluginUV3.attach(proxy).state1()).to.equal(1);
          expect(await PluginUV3.attach(proxy).state2()).to.equal(2);
          expect(await PluginUV3.attach(proxy).state3()).to.equal(3);
        });

        it('sets the V3 helpers', async () => {
          expect(helpersV3).to.deep.equal(mockHelpers(3));
        });

        it('sets the V1 to V3 permissions', async () => {
          expect(permissionsUV1V3).to.deep.equal(
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
              repoU,
              helpersV3,
              setupUV3,
              setupUV1
            )
          ).to.be.reverted;
        });

        it('cannot update back to V2', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoU,
              helpersV3,
              setupUV3,
              setupUV2
            )
          ).to.be.reverted;
        });

        it('cannot update again to V3', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoU,
              helpersV3,
              setupUV3,
              setupUV3
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
        } = await installHelper(psp, targetDao, setupUV2, repoU));
      });

      it('points to the V2 implementation', async () => {
        expect(
          await PluginUV2.attach(proxy).callStatic.getImplementationAddress()
        ).to.equal(await setupUV2.callStatic.getImplementationAddress());
      });

      it('initializes the members', async () => {
        expect(await PluginUV2.attach(proxy).state1()).to.equal(1);
        expect(await PluginUV2.attach(proxy).state2()).to.equal(2);
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
          repoU,
          helpersV2,
          setupUV2,
          setupUV3
        );
      });

      it('cannot update back to V1', async () => {
        await expect(
          updateHelper(
            psp,
            targetDao,
            proxy,
            repoU,
            helpersV2,
            setupUV2,
            setupUV1
          )
        ).to.be.reverted;
      });

      it('cannot update again to V2', async () => {
        await expect(
          updateHelper(
            psp,
            targetDao,
            proxy,
            repoU,
            helpersV2,
            setupUV2,
            setupUV2
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
            repoU,
            helpersV2,
            setupUV2,
            setupUV3
          ));
        });

        it('points to the V3 implementation', async () => {
          expect(
            await PluginUV3.attach(proxy).callStatic.getImplementationAddress()
          ).to.equal(await setupUV3.callStatic.getImplementationAddress());
        });

        it('initializes the members', async () => {
          expect(await PluginUV3.attach(proxy).state1()).to.equal(1);
          expect(await PluginUV3.attach(proxy).state2()).to.equal(2);
          expect(await PluginUV3.attach(proxy).state3()).to.equal(3);
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
              repoU,
              helpersV3,
              setupUV3,
              setupUV3
            )
          ).to.be.reverted;
        });

        it('cannot update back to V1', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoU,
              helpersV3,
              setupUV3,
              setupUV1
            )
          ).to.be.reverted;
        });

        it('cannot update back to V2', async () => {
          await expect(
            updateHelper(
              psp,
              targetDao,
              proxy,
              repoU,
              helpersV3,
              setupUV3,
              setupUV2
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
        } = await installHelper(psp, targetDao, setupUV3, repoU));
      });

      it('points to the V3 implementation', async () => {
        expect(
          await PluginUV3.attach(proxy).callStatic.getImplementationAddress()
        ).to.equal(await setupUV3.callStatic.getImplementationAddress());
      });

      it('initializes the members', async () => {
        expect(await PluginUV3.attach(proxy).state1()).to.equal(1);
        expect(await PluginUV3.attach(proxy).state2()).to.equal(2);
        expect(await PluginUV3.attach(proxy).state3()).to.equal(3);
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

      // Special case where implementations from old and new setups don't change.
      it('updates to v4', async () => {
        await updateHelper(
          psp,
          targetDao,
          proxy,
          repoU,
          helpersV3,
          setupUV3,
          setupUV4
        );
      });

      it('cannot update again to V3', async () => {
        await expect(
          updateHelper(
            psp,
            targetDao,
            proxy,
            repoU,
            helpersV3,
            setupUV3,
            setupUV3
          )
        ).to.be.reverted;
      });

      it('cannot update back to V1', async () => {
        await expect(
          updateHelper(
            psp,
            targetDao,
            proxy,
            repoU,
            helpersV3,
            setupUV3,
            setupUV1
          )
        ).to.be.reverted;
      });

      it('cannot update back to V2', async () => {
        await expect(
          updateHelper(
            psp,
            targetDao,
            proxy,
            repoU,
            helpersV3,
            setupUV3,
            setupUV2
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

  // If the base contracts don't change from current and new plugin setups,
  // PluginSetupProcessor shouldn't call `upgradeTo` or `upgradeToAndCall`
  // on the plugin. The below check for this still is not 100% ensuring,
  // As function `upgradeTo` might be called but event `Upgraded`
  // not thrown(OZ changed the logic or name) which will trick the test to pass..
  const currentImpl = await currentVersionSetup.getImplementationAddress();
  const newImpl = await newVersionSetup.getImplementationAddress();

  const upgradedEvent = await findEvent(applyUpdateTx, EVENTS.Upgraded);
  if (currentImpl == newImpl) {
    expect(upgradedEvent).to.equal(undefined);
  } else {
    expect(upgradedEvent).to.not.equal(undefined);
    expect(newImpl).to.equal(upgradedEvent.args.implementation);

     // ensure that the logic address was also correctly modified on the proxy.
     const proxyContract = await ethers.getContractAt("PluginUUPSUpgradeable", proxy);
     expect(await proxyContract.getImplementationAddress()).to.equal(newImpl); 
  }

  return {updatedHelpers, permissions, initData};
}
