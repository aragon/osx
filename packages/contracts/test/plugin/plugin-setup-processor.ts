import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  PluginSetupProcessor,
  PluginCloneableMock,
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
  let PluginUUPSUpgradeableSetupV1Mock: PluginUUPSUpgradeableSetupV1Mock__factory;
  let PluginUUPSUpgradeableSetupV2Mock: PluginUUPSUpgradeableSetupV2Mock__factory;
  let PluginUUPSUpgradeableSetupV3Mock: PluginUUPSUpgradeableSetupV3Mock__factory;
  let setupV1: PluginUUPSUpgradeableSetupV1Mock;
  let setupV2: PluginUUPSUpgradeableSetupV2Mock;
  let setupV3: PluginUUPSUpgradeableSetupV3Mock;
  let PluginUUPSUpgradeableV1Mock: PluginUUPSUpgradeableV1Mock__factory;
  let PluginUUPSUpgradeableV2Mock: PluginUUPSUpgradeableV2Mock__factory;
  let PluginUUPSUpgradeableV3Mock: PluginUUPSUpgradeableV3Mock__factory;
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
    PluginUUPSUpgradeableV1Mock = await ethers.getContractFactory(
      'PluginUUPSUpgradeableV1Mock'
    );
    PluginUUPSUpgradeableV2Mock = await ethers.getContractFactory(
      'PluginUUPSUpgradeableV2Mock'
    );
    PluginUUPSUpgradeableV3Mock = await ethers.getContractFactory(
      'PluginUUPSUpgradeableV3Mock'
    );

    // Deploy PluginUUPSUpgradeableSetupMock
    PluginUUPSUpgradeableSetupV1Mock = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV1Mock'
    );
    setupV1 = await PluginUUPSUpgradeableSetupV1Mock.deploy();

    PluginUUPSUpgradeableSetupV2Mock = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV2Mock'
    );
    setupV2 = await PluginUUPSUpgradeableSetupV2Mock.deploy();

    PluginUUPSUpgradeableSetupV3Mock = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV3Mock'
    );
    setupV3 = await PluginUUPSUpgradeableSetupV3Mock.deploy();

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

  describe('Install Plugin', function () {
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

      it('applies an instaltion process correctly', async () => {
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

  describe('Uninstall Plugin', function () {
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

      it('applies an uninstallation process correctly', async () => {
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

  describe('Update Plugin', function () {
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

      context(`V1 was installed`, function () {
        let proxy: string;
        let helpersV1: string[];
        let permissionsV1: PermissionOperation[];

        beforeEach(async () => {
          ({proxy, helpersV1, permissionsV1} = await installV1(
            psp,
            targetDao,
            setupV1,
            pluginRepo
          ));
        });

        it('points to the right implementation', async () => {
          const proxyLogic = await PluginUUPSUpgradeableV1Mock.attach(
            proxy
          ).callStatic.getImplementationAddress();
          expect(proxyLogic).to.equal(
            await setupV1.callStatic.getImplementationAddress()
          );
          expect(proxyLogic).to.not.equal(
            await setupV2.callStatic.getImplementationAddress()
          );
          expect(proxyLogic).to.not.equal(
            await setupV3.callStatic.getImplementationAddress()
          );
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

        context(`V1 was updated to V2`, function () {
          let helpersV2: string[];
          let permissionsV2: PermissionOperation[];
          let initDataV2: BytesLike;

          beforeEach(async () => {
            await targetDao.grant(
              proxy,
              psp.address,
              UPGRADE_PLUGIN_PERMISSION_ID
            );

            ({proxy, helpersV2, permissionsV2, initDataV2} = await updateV1toV2(
              proxy,
              psp,
              targetDao,
              setupV1,
              setupV2,
              pluginRepo,
              helpersV1,
              EMPTY_DATA
            ));
          });

          it('points to the right implementation', async () => {
            const proxyLogic = await PluginUUPSUpgradeableV1Mock.attach(
              proxy
            ).callStatic.getImplementationAddress();
            expect(proxyLogic).to.not.equal(
              await setupV1.callStatic.getImplementationAddress()
            );
            expect(proxyLogic).to.equal(
              await setupV2.callStatic.getImplementationAddress()
            );
            expect(proxyLogic).to.not.equal(
              await setupV3.callStatic.getImplementationAddress()
            );
          });

          it('prepares the follow-up update to v3 correctly', async () => {
            const pluginUpdateParams = {
              plugin: proxy,
              pluginSetupRepo: pluginRepo.address,
              currentPluginSetup: setupV2.address,
              newPluginSetup: setupV3.address,
            };

            await expect(
              psp.prepareUpdate(
                targetDao.address,
                pluginUpdateParams,
                helpersV2,
                EMPTY_DATA
              )
            ).to.emit(psp, EVENTS.UpdatePrepared);
            // TODO check event
          });
        });
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

      context(`V1 was installed`, function () {
        let proxy: string;
        let helpersV1: string[];
        let permissionsV1: PermissionOperation[];

        beforeEach(async () => {
          ({proxy, helpersV1, permissionsV1} = await installV1(
            psp,
            targetDao,
            setupV1,
            pluginRepo
          ));
        });

        it('applies an update correctly', async () => {
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

          await targetDao.grant(
            proxy,
            psp.address,
            UPGRADE_PLUGIN_PERMISSION_ID
          );

          await expect(
            psp.applyUpdate(
              targetDao.address,
              proxy,
              setupV2.address,
              pluginRepo.address,
              initDataV2,
              permissionsV2
            )
          ).to.emit(psp, EVENTS.UpdateApplied);
        });

        context(`V1 was updated to V2`, function () {
          let helpersV2: string[];
          let permissionsV2: PermissionOperation[];
          let initDataV2: BytesLike;

          beforeEach(async () => {
            await targetDao.grant(
              proxy,
              psp.address,
              UPGRADE_PLUGIN_PERMISSION_ID
            );

            ({proxy, helpersV2, permissionsV2, initDataV2} = await updateV1toV2(
              proxy,
              psp,
              targetDao,
              setupV1,
              setupV2,
              pluginRepo,
              helpersV1,
              EMPTY_DATA
            ));
          });

          it('applies the follow-up update to v3 correctly', async () => {
            const pluginUpdateParams = {
              plugin: proxy,
              pluginSetupRepo: pluginRepo.address,
              currentPluginSetup: setupV2.address,
              newPluginSetup: setupV3.address,
            };
            const prepareUpdateTx = await psp.prepareUpdate(
              targetDao.address,
              pluginUpdateParams,
              helpersV2,
              EMPTY_DATA
            );
            const prepareUpdateEvent = await findEvent(
              prepareUpdateTx,
              EVENTS.UpdatePrepared
            );
            const {permissions: permissionsV3, initData: initDataV3} =
              prepareUpdateEvent.args; // HERE IS SOME ERROR

            /*await targetDao.grant(
              proxy,
              psp.address,
              UPGRADE_PLUGIN_PERMISSION_ID
            );*/

            await expect(
              psp.applyUpdate(
                targetDao.address,
                proxy,
                setupV3.address,
                pluginRepo.address,
                initDataV3,
                permissionsV3
              )
            ).to.emit(psp, EVENTS.UpdateApplied);
          });
        });
      });
    });
  });
});

async function installV1(
  psp: PluginSetupProcessor,
  targetDao: DAO,
  setupV1: PluginUUPSUpgradeableSetupV1Mock,
  pluginRepo: PluginRepo
): Promise<{
  proxy: string;
  helpersV1: string[];
  permissionsV1: PermissionOperation[];
}> {
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

  return {
    proxy,
    helpersV1,
    permissionsV1,
  };
}

async function updateV1toV2(
  proxy: string,
  psp: PluginSetupProcessor,
  targetDao: DAO,
  setupV1: PluginUUPSUpgradeableSetupV1Mock,
  setupV2: PluginUUPSUpgradeableSetupV2Mock,
  pluginRepo: PluginRepo,
  helpersV1: string[],
  data: BytesLike
): Promise<{
  proxy: string;
  helpersV2: string[];
  permissionsV2: PermissionOperation[];
  initDataV2: BytesLike;
}> {
  let returnedPluginAddress: string;
  let helpersV2: string[];
  let permissionsV2: PermissionOperation[];
  let initDataV2: BytesLike;

  // Check that proxy points the right implementation
  ({
    returnedPluginAddress: returnedPluginAddress,
    updatedHelpers: helpersV2,
    permissions: permissionsV2,
    initData: initDataV2,
  } = await prepareUpdate(
    psp,
    targetDao.address,
    proxy,
    setupV1.address,
    setupV2.address,
    pluginRepo.address,
    helpersV1,
    data
  ));

  expect(proxy).to.equal(returnedPluginAddress);

  await psp.applyUpdate(
    targetDao.address,
    proxy,
    setupV2.address,
    pluginRepo.address,
    //helpersV2, //TODO why are they not checked again?
    initDataV2,
    permissionsV2
  );

  return {
    proxy,
    helpersV2,
    permissionsV2,
    initDataV2,
  };
}
