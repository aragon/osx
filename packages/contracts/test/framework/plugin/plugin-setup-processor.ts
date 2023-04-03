import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {anyValue} from '@nomicfoundation/hardhat-chai-matchers/withArgs';

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
  PluginCloneableSetupV1MockBad,
  PluginCloneableSetupV2Mock,
  PluginRepoFactory,
  PluginRepoRegistry,
  PluginRepo,
  DAO,
  PluginUUPSUpgradeableSetupV2Mock__factory,
  PluginUUPSUpgradeableSetupV1MockBad__factory,
  PluginUUPSUpgradeableSetupV4Mock__factory,
  PluginCloneableSetupV2Mock__factory,
  PluginCloneableSetupV1MockBad__factory,
  PluginUUPSUpgradeableSetupV1Mock__factory,
  PluginCloneableSetupV1Mock__factory,
} from '../../../typechain';

import {deployENSSubdomainRegistrar} from '../../test-utils/ens';
import {deployNewDAO, ZERO_BYTES32} from '../../test-utils/dao';
import {deployPluginSetupProcessor} from '../../test-utils/plugin-setup-processor';
import {findEvent} from '../../../utils/event';
import {Operation} from '../../../utils/types';

import {
  mockPermissionsOperations,
  mockHelpers,
} from '../../test-utils/psp/mock-helpers';

import {
  prepareInstallation,
  prepareUpdate,
  prepareUninstallation,
  applyInstallation,
  applyUpdate,
  applyUninstallation,
} from '../../test-utils/psp/wrappers';
import {
  createPrepareInstallationParams,
  createApplyInstallationParams,
  createPrepareUninstallationParams,
  createApplyUninstallationParams,
  createPrepareUpdateParams,
  createApplyUpdateParams,
} from '../../test-utils/psp/create-params';

import {
  deployPluginRepoFactory,
  deployPluginRepoRegistry,
} from '../../test-utils/repo';
import {BytesLike} from 'ethers';
import {
  PluginRepoPointer,
  PreparationType,
  VersionTag,
} from '../../test-utils/psp/types';
import {PermissionOperation} from '../../test-utils/psp/types';
import {
  getAppliedSetupId,
  getPluginInstallationId,
  getPreparedSetupId,
} from '../../test-utils/psp/hash-helpers';
import {MockContract, smock} from '@defi-wonderland/smock';
import {
  installPlugin,
  updatePlugin,
  uninstallPlugin,
} from '../../test-utils/psp/atomic-helpers';
import {UPGRADE_PERMISSIONS} from '../../test-utils/permissions';
import {PluginRepoRegisteredEvent} from '../../../typechain/PluginRepoRegistry';

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

const REGISTER_ENS_SUBDOMAIN_PERMISSION_ID = ethers.utils.id(
  'REGISTER_ENS_SUBDOMAIN_PERMISSION'
);

const {UPGRADE_PLUGIN_PERMISSION_ID} = UPGRADE_PERMISSIONS;

describe('Plugin Setup Processor', function () {
  let signers: SignerWithAddress[];
  let psp: PluginSetupProcessor;
  let repoU: PluginRepo;
  let PluginUV1: PluginUUPSUpgradeableV1Mock__factory;
  let PluginUV2: PluginUUPSUpgradeableV2Mock__factory;
  let PluginUV3: PluginUUPSUpgradeableV3Mock__factory;
  let setupUV1: MockContract<PluginUUPSUpgradeableSetupV1Mock>;
  let setupUV2: MockContract<PluginUUPSUpgradeableSetupV2Mock>;
  let setupUV3: MockContract<PluginUUPSUpgradeableSetupV3Mock>;
  let setupUV4: MockContract<PluginUUPSUpgradeableSetupV4Mock>;
  let setupUV1Bad: MockContract<PluginUUPSUpgradeableSetupV1MockBad>;
  let repoC: PluginRepo;
  let setupCV1: MockContract<PluginCloneableSetupV1Mock>;
  let setupCV1Bad: MockContract<PluginCloneableSetupV1MockBad>;
  let setupCV2: MockContract<PluginCloneableSetupV2Mock>;
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

    const SetupV1 = await smock.mock<PluginUUPSUpgradeableSetupV1Mock__factory>(
      'PluginUUPSUpgradeableSetupV1Mock'
    );
    setupUV1 = await SetupV1.deploy();

    const PluginUUPSUpgradeableSetupV1MockBad =
      await smock.mock<PluginUUPSUpgradeableSetupV1MockBad__factory>(
        'PluginUUPSUpgradeableSetupV1MockBad'
      );
    setupUV1Bad = await PluginUUPSUpgradeableSetupV1MockBad.deploy();

    const SetupV2 = await smock.mock<PluginUUPSUpgradeableSetupV2Mock__factory>(
      'PluginUUPSUpgradeableSetupV2Mock'
    );
    setupUV2 = await SetupV2.deploy();

    const SetupV3 = await smock.mock<PluginCloneableSetupV2Mock__factory>(
      'PluginUUPSUpgradeableSetupV3Mock'
    );
    setupUV3 = await SetupV3.deploy();

    const SetupV4 = await smock.mock<PluginUUPSUpgradeableSetupV4Mock__factory>(
      'PluginUUPSUpgradeableSetupV4Mock'
    );
    setupUV4 = await SetupV4.deploy(await setupUV3.implementation());

    // Deploy PluginCloneableSetupMock
    const SetupC1 = await smock.mock<PluginCloneableSetupV1Mock__factory>(
      'PluginCloneableSetupV1Mock'
    );
    setupCV1 = await SetupC1.deploy();

    const SetupC1Bad = await smock.mock<PluginCloneableSetupV1MockBad__factory>(
      'PluginCloneableSetupV1MockBad'
    );
    setupCV1Bad = await SetupC1Bad.deploy();

    const SetupC2 = await smock.mock<PluginCloneableSetupV2Mock__factory>(
      'PluginCloneableSetupV2Mock'
    );
    setupCV2 = await SetupC2.deploy();

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

    const releaseMetadata = '0x11';
    const buildMetadata = '0x11';

    // Plugin Setup Processor
    psp = await deployPluginSetupProcessor(pluginRepoRegistry);

    // Create and register a plugin on the PluginRepoRegistry
    let tx = await pluginRepoFactory.createPluginRepoWithFirstVersion(
      `plugin-uups-upgradeable-mock`,
      setupUV1.address, // build 1
      ownerAddress,
      releaseMetadata,
      buildMetadata
    );

    let event = await findEvent<PluginRepoRegisteredEvent>(
      tx,
      EVENTS.PluginRepoRegistered
    );
    const PluginRepo = await ethers.getContractFactory('PluginRepo');
    repoU = PluginRepo.attach(event.args.pluginRepo);

    // Add setups
    await repoU.createVersion(1, setupUV2.address, EMPTY_DATA, EMPTY_DATA); // build 2
    await repoU.createVersion(1, setupUV3.address, EMPTY_DATA, EMPTY_DATA); // build 3
    await repoU.createVersion(1, setupUV1Bad.address, EMPTY_DATA, EMPTY_DATA); // build 4
    await repoU.createVersion(1, setupUV4.address, EMPTY_DATA, EMPTY_DATA); // build 5
    await repoU.createVersion(1, setupUV4.address, EMPTY_DATA, EMPTY_DATA); // buidl 6.

    tx = await pluginRepoFactory.createPluginRepoWithFirstVersion(
      `plugin-clonable-mock`,
      setupCV1.address,
      ownerAddress,
      releaseMetadata,
      buildMetadata
    );

    event = await findEvent<PluginRepoRegisteredEvent>(
      tx,
      EVENTS.PluginRepoRegistered
    );
    repoC = PluginRepo.attach(event.args.pluginRepo);
    await repoC.createVersion(1, setupCV1Bad.address, EMPTY_DATA, EMPTY_DATA);
    await repoC.createVersion(1, setupCV2.address, EMPTY_DATA, EMPTY_DATA);
  });

  beforeEach(async function () {
    // Target DAO to be used as an example DAO
    targetDao = await deployNewDAO(ownerAddress);

    // Grant
    await targetDao.grant(targetDao.address, psp.address, ROOT_PERMISSION_ID);
  });

  // They end up in the same pluginRepo with
  // the same release - 1, but different builds - 1,2,3.
  describe('PluginUUPSUpgradeableSetupMock', function () {
    it('points to the V1 implementation', async () => {
      await checkImplementation(setupUV1, PluginUV1, 1);
    });

    it('points to the V2 implementation', async () => {
      await checkImplementation(setupUV2, PluginUV2, 2);
    });

    it('points to the V3 implementation', async () => {
      await checkImplementation(setupUV3, PluginUV3, 3);
    });

    async function checkImplementation(
      setup: any,
      pluginFactory: any,
      build: number
    ) {
      const {plugin} = await prepareInstallation(
        psp,
        targetDao.address,
        [repoU.address, 1, build],
        EMPTY_DATA
      );

      const proxy = await pluginFactory
        .attach(plugin)
        .callStatic.implementation();

      expect(proxy).to.equal(await setup.callStatic.implementation());
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
      it('reverts if `PluginSetupRepo` does not exist on `PluginRepoRegistry`', async () => {
        await expect(
          psp.prepareInstallation(
            targetDao.address,
            createPrepareInstallationParams([ADDRESS_TWO, 1, 1], '0x')
          )
        ).to.be.revertedWithCustomError(psp, 'PluginRepoNonexistent');
      });

      it('reverts if the plugin version does not exist on `PluginRepoRegistry`', async () => {
        // non-existent build which should cause error.
        const pluginRepoPointer: PluginRepoPointer = [repoU.address, 1, 15];

        await expect(
          psp.prepareInstallation(
            targetDao.address,
            createPrepareInstallationParams(pluginRepoPointer, '0x')
          )
        ).to.be.revertedWithCustomError(repoU, 'VersionHashDoesNotExist');
      });

      it('reverts if plugin with the same setupId is already prepared.', async () => {
        // uses plugin setup that returns the same plugin address and dependencies
        // each time you call it. Useful to generate the same setup id
        // which should revert.
        const pluginRepoPointer: PluginRepoPointer = [repoU.address, 1, 4];

        const {preparedSetupId} = await prepareInstallation(
          psp,
          targetDao.address,
          pluginRepoPointer,
          '0x'
        );

        await expect(
          psp.prepareInstallation(
            targetDao.address,
            createPrepareInstallationParams(pluginRepoPointer, '0x')
          )
        )
          .to.be.revertedWithCustomError(psp, 'SetupAlreadyPrepared')
          .withArgs(preparedSetupId);
      });

      it('reverts if plugin with the same address is already installed.', async () => {
        // uses plugin setup that returns the same plugin address and dependencies
        // each time you call it. Useful to generate the same plugin address
        // which should revert.
        const pluginRepoPointer: PluginRepoPointer = [repoU.address, 1, 4];

        await installPlugin(
          psp,
          targetDao.address,
          pluginRepoPointer,
          EMPTY_DATA
        );

        await expect(
          psp.prepareInstallation(
            targetDao.address,
            createPrepareInstallationParams(pluginRepoPointer, '0x')
          )
        ).to.be.revertedWithCustomError(psp, 'PluginAlreadyInstalled');
      });

      // 1. prepareInstall for pluginId1 => setupId1
      // 2. applyInstall for pluginId1 => setupId1
      // 3. uninstall the plugin with applyUninstall.
      // 4. prepareInstall for pluginId1 => setupId1 which succeeds.
      it('EDGE-CASE: allows to prepare plugin installation with the same address and setupId if it was installed and then uninstalled', async () => {
        // uses plugin setup that returns the same plugin address and dependencies.
        const pluginRepoPointer: PluginRepoPointer = [repoU.address, 1, 4];

        // Needed so applyUninstallation succeeds
        await targetDao.grant(
          psp.address,
          ownerAddress,
          APPLY_UNINSTALLATION_PERMISSION_ID
        );

        const {plugin, helpers} = await installPlugin(
          psp,
          targetDao.address,
          pluginRepoPointer,
          EMPTY_DATA
        );

        await uninstallPlugin(
          psp,
          targetDao.address,
          plugin,
          helpers,
          pluginRepoPointer,
          EMPTY_DATA
        );

        await expect(
          psp.prepareInstallation(
            targetDao.address,
            createPrepareInstallationParams(pluginRepoPointer, '0x')
          )
        ).not.to.be.reverted;
      });

      it("successfully calls plugin setup's prepareInstallation with correct arguments", async () => {
        // Uses setupUV1
        const pluginRepoPointer: PluginRepoPointer = [repoU.address, 1, 1];

        const data = '0x11';

        // Reset the cache so previus tests don't trick this test that
        // the function was really called, even though it mightn't have been.
        // This is needed because smock contracts are not deployed in beforeEach,
        // but in before, so there's only one instance of them for all tests.
        setupUV1.prepareInstallation.reset();

        await psp.prepareInstallation(
          targetDao.address,
          createPrepareInstallationParams(pluginRepoPointer, data)
        );

        expect(setupUV1.prepareInstallation).to.have.been.calledWith(
          targetDao.address,
          data
        );
      });

      it('successfully prepares a plugin installation with the correct event arguments', async () => {
        const data = '0x11';
        const expectedPermissions = mockPermissionsOperations(
          0,
          2,
          Operation.Grant
        );
        const expectedHelpers = mockHelpers(2);
        const pluginRepoPointer: PluginRepoPointer = [repoU.address, 1, 1];

        const preparedSetupId = getPreparedSetupId(
          pluginRepoPointer,
          expectedHelpers,
          // @ts-ignore
          expectedPermissions,
          '0x',
          PreparationType.Installation
        );

        await expect(
          psp.prepareInstallation(
            targetDao.address,
            createPrepareInstallationParams(pluginRepoPointer, data)
          )
        )
          .to.emit(psp, 'InstallationPrepared')
          .withArgs(
            ownerAddress,
            targetDao.address,
            preparedSetupId,
            pluginRepoPointer[0],
            (val: any) => expect(val).to.deep.equal([1, 1]),
            data,
            anyValue,
            (val: any) =>
              expect(val).to.deep.equal([expectedHelpers, expectedPermissions])
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

        await expect(
          psp.applyInstallation(
            targetDao.address,
            createApplyInstallationParams(
              ethers.constants.AddressZero,
              [ethers.constants.AddressZero, 1, 1],
              [],
              []
            )
          )
        )
          .to.be.revertedWithCustomError(psp, 'SetupApplicationUnauthorized')
          .withArgs(
            targetDao.address,
            ownerAddress,
            APPLY_INSTALLATION_PERMISSION_ID
          );
      });

      it("reverts if PluginSetupProcessor does not have DAO's `ROOT_PERMISSION`", async () => {
        await targetDao.revoke(
          targetDao.address,
          psp.address,
          ROOT_PERMISSION_ID
        );

        const pluginRepoPointer: PluginRepoPointer = [repoU.address, 1, 1];

        const {
          plugin,
          preparedSetupData: {permissions, helpers},
        } = await prepareInstallation(
          psp,
          targetDao.address,
          pluginRepoPointer,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            createApplyInstallationParams(
              plugin,
              pluginRepoPointer,
              permissions,
              helpers
            )
          )
        )
          .to.be.revertedWithCustomError(targetDao, 'Unauthorized')
          .withArgs(targetDao.address, psp.address, ROOT_PERMISSION_ID);
      });

      it("reverts if setupId wasn't prepared by `prepareInstallation` first", async () => {
        const permissions = mockPermissionsOperations(0, 1, Operation.Grant);
        const helpers = mockHelpers(1);

        // really don't matter what we choose here for the plugin address.
        const pluginAddress = ownerAddress;

        const pluginRepoPointer: PluginRepoPointer = [repoU.address, 1, 1];

        // The PSP contract should generate the same setupId and revert with it below.
        const preparedSetupId = getPreparedSetupId(
          pluginRepoPointer,
          helpers,
          // @ts-ignore
          permissions,
          '0x',
          PreparationType.Installation
        );

        // directly tries to apply installation even if `prepareInstallation` wasn't called first.
        await expect(
          psp.applyInstallation(
            targetDao.address,
            createApplyInstallationParams(
              pluginAddress,
              pluginRepoPointer,
              // @ts-ignore
              permissions,
              helpers
            )
          )
        )
          .to.be.revertedWithCustomError(psp, 'SetupNotApplicable')
          .withArgs(preparedSetupId);
      });

      it('reverts if the plugin with the same address is already installed', async () => {
        // uses plugin setup that returns the same plugin address and dependencies
        // each time you call it. Useful to generate the same plugin address
        // which should revert.
        const pluginRepoPointer: PluginRepoPointer = [repoU.address, 1, 4];

        const {plugin, permissions, helpers} = await installPlugin(
          psp,
          targetDao.address,
          pluginRepoPointer,
          EMPTY_DATA
        );

        await expect(
          psp.applyInstallation(
            targetDao.address,
            createApplyInstallationParams(
              plugin,
              pluginRepoPointer,
              permissions,
              helpers
            )
          )
        ).to.be.revertedWithCustomError(psp, 'PluginAlreadyInstalled');
      });

      it('successfully applies installation if setupId was prepared first by `prepareInstallation`', async () => {
        const pluginRepoPointer: PluginRepoPointer = [repoU.address, 1, 1];

        const {
          plugin,
          preparedSetupData: {permissions, helpers},
          preparedSetupId,
        } = await prepareInstallation(
          psp,
          targetDao.address,
          pluginRepoPointer,
          EMPTY_DATA
        );

        const appliedSetupId = getAppliedSetupId(pluginRepoPointer, helpers);

        await expect(
          psp.applyInstallation(
            targetDao.address,
            createApplyInstallationParams(
              plugin,
              pluginRepoPointer,
              permissions,
              helpers
            )
          )
        )
          .to.emit(psp, 'InstallationApplied')
          .withArgs(targetDao.address, plugin, preparedSetupId, appliedSetupId);
      });

      // 1. call prepareinstall 2 times for the same plugin version
      // to get 2 preparations with same plugin address, but different setup ids.
      // 2. call applyInstall for one of them and see that 2nd one
      // would no longer be valid for the installation even though it was valid before.
      it('EDGE-CASE: reverts for all preparation if one of them was already applied for the install', async () => {
        const pluginRepoPointer: PluginRepoPointer = [repoU.address, 1, 4];

        const {
          plugin,
          preparedSetupData: {
            permissions: firstPreparedPermissions,
            helpers: firstPreparedHelpers,
          },
          preparedSetupId: firstPreparedSetupId,
        } = await prepareInstallation(
          psp,
          targetDao.address,
          pluginRepoPointer,
          EMPTY_DATA
        );

        setupUV1Bad.prepareInstallation.returns([
          // Must be the same plugin address that gets returned from pluginRepoPointer's prepareInstallation
          ethers.constants.AddressZero,
          // modify so it generates different setup id.
          [mockHelpers(1), mockPermissionsOperations(0, 2, Operation.Grant)],
        ]);

        const {
          preparedSetupData: {
            permissions: secondPreparedPermissions,
            helpers: secondPreparedHelpers,
          },
          preparedSetupId: secondPreparedSetupId,
        } = await prepareInstallation(
          psp,
          targetDao.address,
          pluginRepoPointer,
          EMPTY_DATA
        );

        const pluginInstallationId = getPluginInstallationId(
          targetDao.address,
          plugin
        );
        // Check that both setupId are valid at this moment as none of them have been applied yet.
        await expect(
          psp.validatePreparedSetupId(
            pluginInstallationId,
            firstPreparedSetupId
          )
        ).not.to.be.reverted;
        await expect(
          psp.validatePreparedSetupId(
            pluginInstallationId,
            secondPreparedSetupId
          )
        ).not.to.be.reverted;
        await expect(
          psp.callStatic.applyInstallation(
            targetDao.address,
            createApplyInstallationParams(
              plugin,
              pluginRepoPointer,
              firstPreparedPermissions,
              firstPreparedHelpers
            )
          )
        ).not.to.be.reverted;
        await expect(
          psp.callStatic.applyInstallation(
            targetDao.address,
            createApplyInstallationParams(
              plugin,
              pluginRepoPointer,
              secondPreparedPermissions,
              secondPreparedHelpers
            )
          )
        ).not.to.be.reverted;

        // Lets install one of them.
        await applyInstallation(
          psp,
          targetDao.address,
          plugin,
          pluginRepoPointer,
          firstPreparedPermissions,
          firstPreparedHelpers
        );

        await expect(
          psp.validatePreparedSetupId(
            pluginInstallationId,
            firstPreparedSetupId
          )
        ).to.be.reverted;
        await expect(
          psp.validatePreparedSetupId(
            pluginInstallationId,
            secondPreparedSetupId
          )
        ).to.be.reverted;

        await expect(
          psp.applyInstallation(
            targetDao.address,
            createApplyInstallationParams(
              plugin,
              pluginRepoPointer,
              firstPreparedPermissions,
              firstPreparedHelpers
            )
          )
        ).to.be.revertedWithCustomError(psp, 'PluginAlreadyInstalled');

        await expect(
          psp.applyInstallation(
            targetDao.address,
            createApplyInstallationParams(
              plugin,
              pluginRepoPointer,
              secondPreparedPermissions,
              secondPreparedHelpers
            )
          )
        ).to.be.revertedWithCustomError(psp, 'PluginAlreadyInstalled');

        // Clean up
        setupUV1Bad.prepareInstallation.reset();
      });
    });
  });

  describe('Uninstallation', function () {
    let proxy: string;
    let helpersUV1: string[];
    let permissionsUV1: PermissionOperation[];
    let pluginRepoPointer: PluginRepoPointer;
    let currentAppliedSetupId: string;

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

      pluginRepoPointer = [repoU.address, 1, 1];

      ({
        plugin: proxy,
        helpers: helpersUV1,
        permissions: permissionsUV1,
        appliedSetupId: currentAppliedSetupId,
      } = await installPlugin(psp, targetDao.address, pluginRepoPointer));
    });

    describe('prepareUninstallation', function () {
      it('reverts if plugin is not installed yet', async () => {
        // For extra safety, let's still call prepareInstall,
        // but it should still revert, as it's not installed yet.
        const {
          plugin,
          preparedSetupData: {helpers},
        } = await prepareInstallation(
          psp,
          targetDao.address,
          pluginRepoPointer,
          EMPTY_DATA
        );

        const appliedSetupId = getAppliedSetupId(pluginRepoPointer, helpers);

        await expect(
          psp.prepareUninstallation(
            targetDao.address,
            createPrepareUninstallationParams(
              plugin,
              pluginRepoPointer,
              helpers,
              EMPTY_DATA
            )
          )
        )
          .to.be.revertedWithCustomError(psp, 'InvalidAppliedSetupId')
          .withArgs(ZERO_BYTES32, appliedSetupId);
      });

      it('reverts if prepare uninstallation params do not match the current `appliedSetupId`', async () => {
        {
          // helpersUV1 contains two helper addresses. Let's remove one
          // to make sure modified helpers will cause test to fail.
          const modifiedHelpers = [...helpersUV1].slice(0, -1);

          const appliedSetupId = getAppliedSetupId(
            pluginRepoPointer,
            modifiedHelpers
          );

          await expect(
            prepareUninstallation(
              psp,
              targetDao.address,
              proxy,
              pluginRepoPointer,
              modifiedHelpers,
              EMPTY_DATA
            )
          )
            .to.be.revertedWithCustomError(psp, 'InvalidAppliedSetupId')
            .withArgs(currentAppliedSetupId, appliedSetupId);
        }

        {
          // Reverse order/sequence which still should cause to revert.
          const modifiedHelpers = [...helpersUV1].reverse();

          const appliedSetupId = getAppliedSetupId(
            pluginRepoPointer,
            modifiedHelpers
          );

          await expect(
            prepareUninstallation(
              psp,
              targetDao.address,
              proxy,
              pluginRepoPointer,
              modifiedHelpers,
              EMPTY_DATA
            )
          )
            .to.be.revertedWithCustomError(psp, 'InvalidAppliedSetupId')
            .withArgs(currentAppliedSetupId, appliedSetupId);
        }

        {
          const modifiedPluginRepoPointer = [
            pluginRepoPointer[0],
            pluginRepoPointer[1],
            2, // change the build to trigger generating different setup id.
          ];

          const appliedSetupId = getAppliedSetupId(
            // @ts-ignore
            modifiedPluginRepoPointer,
            helpersUV1
          );

          await expect(
            prepareUninstallation(
              psp,
              targetDao.address,
              proxy,
              // @ts-ignore
              modifiedPluginRepoPointer,
              helpersUV1,
              EMPTY_DATA
            )
          )
            .to.be.revertedWithCustomError(psp, 'InvalidAppliedSetupId')
            .withArgs(currentAppliedSetupId, appliedSetupId);
        }
      });

      it('reverts if plugin uninstallation with the same setup is already prepared', async () => {
        const {preparedSetupId} = await prepareUninstallation(
          psp,
          targetDao.address,
          proxy,
          pluginRepoPointer,
          helpersUV1,
          EMPTY_DATA
        );

        await expect(
          prepareUninstallation(
            psp,
            targetDao.address,
            proxy,
            pluginRepoPointer,
            helpersUV1,
            EMPTY_DATA
          )
        )
          .to.be.revertedWithCustomError(psp, 'SetupAlreadyPrepared')
          .withArgs(preparedSetupId);
      });

      it('reverts if the plugin was uninstalled and tries to prepare uninstallation for it', async () => {
        // make sure that prepare uninstall doesn't revert before applying uninstall.
        await expect(
          psp.callStatic.prepareUninstallation(
            targetDao.address,
            createPrepareUninstallationParams(
              proxy,
              pluginRepoPointer,
              helpersUV1,
              EMPTY_DATA
            )
          )
        ).not.to.be.reverted;

        await uninstallPlugin(
          psp,
          targetDao.address,
          proxy,
          helpersUV1,
          pluginRepoPointer,
          EMPTY_DATA
        );

        await expect(
          psp.prepareUninstallation(
            targetDao.address,
            createPrepareUninstallationParams(
              proxy,
              pluginRepoPointer,
              helpersUV1,
              EMPTY_DATA
            )
          )
        )
          .to.be.revertedWithCustomError(psp, 'InvalidAppliedSetupId')
          .withArgs(
            ZERO_BYTES32,
            getAppliedSetupId(pluginRepoPointer, helpersUV1)
          );
      });

      it('allows to prepare multiple uninstallation as long as setup is different', async () => {
        await prepareUninstallation(
          psp,
          targetDao.address,
          proxy,
          pluginRepoPointer,
          helpersUV1,
          EMPTY_DATA
        );

        // Mock the contract call so it returns different
        // permissions than the above `prepareUninstallation` by default.
        // Needed to generate different setup.
        setupUV1.prepareUninstallation.returns(
          mockPermissionsOperations(0, 2, Operation.Revoke)
        );

        await prepareUninstallation(
          psp,
          targetDao.address,
          proxy,
          pluginRepoPointer,
          helpersUV1,
          EMPTY_DATA
        );

        // Clean up
        setupUV1.prepareUninstallation.reset();
      });

      it("successfully calls plugin setup's prepareUninstallation with correct arguments", async () => {
        const data = '0x11';

        // Reset the cache so previus tests don't trick this test that
        // the function was really called, even though it mightn't have been.
        // This is needed because smock contracts are not deployed in beforeEach,
        // but in before, so there's only one instance of them for all tests.
        setupUV1.prepareUninstallation.reset();

        await prepareUninstallation(
          psp,
          targetDao.address,
          proxy,
          pluginRepoPointer,
          helpersUV1,
          data
        );

        expect(setupUV1.prepareUninstallation).to.have.been.calledWith(
          targetDao.address,
          [proxy, helpersUV1, data]
        );
      });

      it('successfully prepares a plugin uninstallation with the correct event arguments', async () => {
        const data = '0x11';
        const uninstallPermissions = mockPermissionsOperations(
          0,
          1,
          Operation.Revoke
        );

        const preparedSetupId = getPreparedSetupId(
          pluginRepoPointer,
          null,
          // @ts-ignore
          uninstallPermissions,
          EMPTY_DATA,
          PreparationType.Uninstallation
        );

        await expect(
          psp.prepareUninstallation(
            targetDao.address,
            createPrepareUninstallationParams(
              proxy,
              pluginRepoPointer,
              helpersUV1,
              data
            )
          )
        )
          .to.emit(psp, 'UninstallationPrepared')
          .withArgs(
            ownerAddress,
            targetDao.address,
            preparedSetupId,
            pluginRepoPointer[0],
            (val: any) => expect(val).to.deep.equal([1, 1]),
            (val: any) => expect(val).to.deep.equal([proxy, helpersUV1, data]),
            (val: any) => expect(val).to.deep.equal(uninstallPermissions)
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
            createApplyUninstallationParams(
              proxy,
              pluginRepoPointer,
              permissionsUV1
            )
          )
        )
          .to.be.revertedWithCustomError(psp, 'SetupApplicationUnauthorized')
          .withArgs(
            targetDao.address,
            ownerAddress,
            APPLY_UNINSTALLATION_PERMISSION_ID
          );
      });

      it("reverts if PluginSetupProcessor does not have DAO's `ROOT_PERMISSION`", async () => {
        await targetDao.revoke(
          targetDao.address,
          psp.address,
          ROOT_PERMISSION_ID
        );

        const {permissions} = await prepareUninstallation(
          psp,
          targetDao.address,
          proxy,
          pluginRepoPointer,
          helpersUV1,
          EMPTY_DATA
        );

        await expect(
          psp.applyUninstallation(
            targetDao.address,
            createApplyUninstallationParams(
              proxy,
              pluginRepoPointer,
              permissions
            )
          )
        )
          .to.be.revertedWithCustomError(targetDao, 'Unauthorized')
          .withArgs(targetDao.address, psp.address, ROOT_PERMISSION_ID);
      });

      it('reverts if uninstallation is not prepared first', async () => {
        const preparedSetupId = getPreparedSetupId(
          pluginRepoPointer,
          null,
          permissionsUV1,
          EMPTY_DATA,
          PreparationType.Uninstallation
        );
        await expect(
          psp.applyUninstallation(
            targetDao.address,
            createApplyUninstallationParams(
              proxy,
              pluginRepoPointer,
              permissionsUV1
            )
          )
        )
          .to.be.revertedWithCustomError(psp, 'SetupNotApplicable')
          .withArgs(preparedSetupId);
      });

      it('EDGE-CASE: reverts for all uninstall preparations once one of them is applied', async () => {
        // First Preparation
        const {permissions: firstPreparePermissions} =
          await prepareUninstallation(
            psp,
            targetDao.address,
            proxy,
            pluginRepoPointer,
            helpersUV1,
            EMPTY_DATA
          );

        // Confirm that first preparation can be applied.
        await expect(
          psp.callStatic.applyUninstallation(
            targetDao.address,
            createApplyUninstallationParams(
              proxy,
              pluginRepoPointer,
              firstPreparePermissions
            )
          )
        ).not.to.be.reverted;

        // mock the function so it returns different permissions
        // Needed to make sure second preparation results in different setup id and not reverts.
        setupUV1.prepareUninstallation.returns(
          mockPermissionsOperations(0, 2, Operation.Grant)
        );

        // Second Preparation
        const {permissions: secondPreparePermissions} =
          await prepareUninstallation(
            psp,
            targetDao.address,
            proxy,
            pluginRepoPointer,
            helpersUV1,
            EMPTY_DATA
          );

        // Check that second preparation can be applied.
        await expect(
          psp.callStatic.applyUninstallation(
            targetDao.address,
            createApplyUninstallationParams(
              proxy,
              pluginRepoPointer,
              secondPreparePermissions
            )
          )
        ).not.to.be.reverted;

        // apply uninstall for first preparation
        await applyUninstallation(
          psp,
          targetDao.address,
          proxy,
          pluginRepoPointer,
          firstPreparePermissions
        );

        // Confirm that the none of the preparations can be applied anymore.
        await expect(
          psp.applyUninstallation(
            targetDao.address,
            createApplyUninstallationParams(
              proxy,
              pluginRepoPointer,
              firstPreparePermissions
            )
          )
        ).to.be.revertedWithCustomError(psp, 'SetupNotApplicable');

        await expect(
          psp.applyUninstallation(
            targetDao.address,
            createApplyUninstallationParams(
              proxy,
              pluginRepoPointer,
              secondPreparePermissions
            )
          )
        ).to.be.revertedWithCustomError(psp, 'SetupNotApplicable');
      });

      it('successfully uninstalls the plugin and emits the correct event', async () => {
        const {permissions, preparedSetupId} = await prepareUninstallation(
          psp,
          targetDao.address,
          proxy,
          pluginRepoPointer,
          helpersUV1,
          EMPTY_DATA
        );

        await expect(
          psp.applyUninstallation(
            targetDao.address,
            createApplyUninstallationParams(
              proxy,
              pluginRepoPointer,
              permissions
            )
          )
        )
          .to.emit(psp, 'UninstallationApplied')
          .withArgs(targetDao.address, proxy, preparedSetupId);
      });
    });
  });

  describe('Update', function () {
    beforeEach(async () => {
      // Grant necessary permission to `ownerAddress` so it can install and update plugins on behalf of the DAO.
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
      let pluginRepoPointer: PluginRepoPointer;
      let currentAppliedSetupId: string;
      const currentVersion: VersionTag = [1, 1]; // Installs with this in beforeEach below.
      const newVersion: VersionTag = [1, 2];

      beforeEach(async () => {
        pluginRepoPointer = [repoU.address, ...currentVersion];

        ({
          plugin: proxy,
          helpers: helpersUV1,
          permissions: permissionsUV1,
          appliedSetupId: currentAppliedSetupId,
        } = await installPlugin(psp, targetDao.address, pluginRepoPointer));
      });

      it('reverts if plugin does not support `IPlugin` interface', async () => {
        const currentVersion: VersionTag = [1, 2];
        const newVersion: VersionTag = [1, 3];

        // Uses build 2 that doesn't support IPlugin which is an invalid state.
        const pluginRepoPointer: PluginRepoPointer = [
          repoC.address,
          ...currentVersion,
        ];

        const {plugin, helpers} = await installPlugin(
          psp,
          targetDao.address,
          pluginRepoPointer,
          EMPTY_DATA
        );

        await expect(
          psp.prepareUpdate(
            targetDao.address,
            createPrepareUpdateParams(
              plugin,
              currentVersion,
              newVersion,
              pluginRepoPointer[0],
              helpers,
              EMPTY_DATA
            )
          )
        )
          .to.be.revertedWithCustomError(psp, 'IPluginNotSupported')
          .withArgs(plugin);
      });

      it('reverts if plugin supports the `IPlugin` interface, but is non-upgradable', async () => {
        let pluginRepoPointer: PluginRepoPointer = [
          repoC.address,
          ...currentVersion,
        ];

        const {plugin: pluginCloneable, helpers: helpersUV1} =
          await installPlugin(
            psp,
            targetDao.address,
            pluginRepoPointer,
            EMPTY_DATA
          );

        const newVersion: VersionTag = [1, 2];

        await expect(
          psp.prepareUpdate(
            targetDao.address,
            createPrepareUpdateParams(
              pluginCloneable,
              currentVersion,
              newVersion,
              pluginRepoPointer[0],
              helpersUV1,
              EMPTY_DATA
            )
          )
        )
          .to.be.revertedWithCustomError(psp, 'PluginNonupgradeable')
          .withArgs(pluginCloneable);
      });

      it('reverts if release numbers differ or new build is less than or equal to current build', async () => {
        const revert = async (
          currentVersionTag: [number, number],
          newVersionTag: [number, number]
        ) => {
          await expect(
            psp.prepareUpdate(
              targetDao.address,
              createPrepareUpdateParams(
                ownerAddress,
                currentVersionTag,
                newVersionTag,
                ownerAddress,
                helpersUV1,
                EMPTY_DATA
              )
            )
          ).to.be.revertedWithCustomError(psp, 'InvalidUpdateVersion');
        };

        await revert([1, 1], [2, 2]);
        await revert([1, 1], [2, 1]);
        await revert([1, 1], [1, 1]);
      });

      it('reverts if plugin is not installed', async () => {
        const pluginRepoPointer: PluginRepoPointer = [
          repoU.address,
          ...currentVersion,
        ];

        await expect(
          psp.prepareUpdate(
            targetDao.address,
            createPrepareUpdateParams(
              ownerAddress,
              currentVersion,
              newVersion,
              pluginRepoPointer[0],
              helpersUV1,
              EMPTY_DATA
            )
          )
        )
          .to.be.revertedWithCustomError(psp, 'InvalidAppliedSetupId')
          .withArgs(
            ZERO_BYTES32,
            getAppliedSetupId(pluginRepoPointer, helpersUV1)
          );
      });

      it('reverts if prepare update params do not match the current `appliedSetupId`', async () => {
        {
          // Run the prepare update with modified helpers.
          const modifiedHelpers = [...helpersUV1].slice(0, -1);
          await expect(
            psp.prepareUpdate(
              targetDao.address,
              createPrepareUpdateParams(
                proxy,
                currentVersion, // current installed version
                newVersion, // new version
                pluginRepoPointer[0],
                modifiedHelpers,
                EMPTY_DATA
              )
            )
          )
            .to.be.revertedWithCustomError(psp, 'InvalidAppliedSetupId')
            .withArgs(
              currentAppliedSetupId,
              getAppliedSetupId(pluginRepoPointer, modifiedHelpers)
            );
        }
        {
          // Change helpers's sequence which still should still cause revert.
          const modifiedHelpers = [...helpersUV1].reverse();
          await expect(
            psp.prepareUpdate(
              targetDao.address,
              createPrepareUpdateParams(
                proxy,
                currentVersion, // current installed version
                newVersion, // new version
                pluginRepoPointer[0],
                modifiedHelpers,
                EMPTY_DATA
              )
            )
          )
            .to.be.revertedWithCustomError(psp, 'InvalidAppliedSetupId')
            .withArgs(
              currentAppliedSetupId,
              getAppliedSetupId(pluginRepoPointer, modifiedHelpers)
            );
        }

        {
          // Modify it so it believes the current version is newVersion
          // which should cause revert.
          const modifiedPluginRepoPointer: PluginRepoPointer = [
            pluginRepoPointer[0],
            ...newVersion,
          ];

          await expect(
            psp.prepareUpdate(
              targetDao.address,
              createPrepareUpdateParams(
                proxy,
                newVersion,
                [newVersion[0], newVersion[1] + 1], // increase version so it doesn't fail with invalid version update.
                pluginRepoPointer[0],
                helpersUV1,
                EMPTY_DATA
              )
            )
          )
            .to.be.revertedWithCustomError(psp, 'InvalidAppliedSetupId')
            .withArgs(
              currentAppliedSetupId,
              getAppliedSetupId(modifiedPluginRepoPointer, helpersUV1)
            );
        }
      });

      it('reverts if same setup is already prepared', async () => {
        const {preparedSetupId} = await prepareUpdate(
          psp,
          targetDao.address,
          proxy,
          currentVersion,
          newVersion,
          pluginRepoPointer[0],
          helpersUV1,
          EMPTY_DATA
        );

        await expect(
          psp.prepareUpdate(
            targetDao.address,
            createPrepareUpdateParams(
              proxy,
              currentVersion,
              newVersion,
              pluginRepoPointer[0],
              helpersUV1,
              EMPTY_DATA
            )
          )
        )
          .to.be.revertedWithCustomError(psp, 'SetupAlreadyPrepared')
          .withArgs(preparedSetupId);
      });

      it('allows to prepare multiple update as long as setup is different', async () => {
        await prepareUpdate(
          psp,
          targetDao.address,
          proxy,
          currentVersion,
          newVersion,
          pluginRepoPointer[0],
          helpersUV1,
          EMPTY_DATA
        );

        // change prepare update of plugin setup so it returns different struct
        // to make sure different setup id is generated.
        setupUV2.prepareUpdate.returns([
          EMPTY_DATA,
          [mockHelpers(1), mockPermissionsOperations(0, 2, Operation.Grant)], // changed
        ]);

        await prepareUpdate(
          psp,
          targetDao.address,
          proxy,
          currentVersion,
          newVersion,
          pluginRepoPointer[0],
          helpersUV1,
          EMPTY_DATA
        );

        // clean up
        setupUV2.prepareUpdate.reset();
      });

      it('correctly prepares updates when plugin setups are same, but UI different', async () => {
        // plugin setup addresses are the same, so it treats it as UIs are different.
        const currentVersion: VersionTag = [1, 5];
        const newVersion: VersionTag = [1, 6];

        const currentPluginRepoPointer: PluginRepoPointer = [
          repoU.address,
          ...currentVersion,
        ];
        const newPluginRepoPointer: PluginRepoPointer = [
          repoU.address,
          ...newVersion,
        ];

        const {plugin: proxy, helpers} = await installPlugin(
          psp,
          targetDao.address,
          currentPluginRepoPointer
        );

        const preparedSetupId = getPreparedSetupId(
          newPluginRepoPointer,
          helpers,
          [],
          EMPTY_DATA,
          PreparationType.Update
        );

        const event = await prepareUpdate(
          psp,
          targetDao.address,
          proxy,
          currentVersion,
          newVersion,
          currentPluginRepoPointer[0],
          helpers,
          EMPTY_DATA
        );

        // Makes sure it correctly generated setup id.
        expect(event.preparedSetupId).to.equal(preparedSetupId);

        // When there's UI update, prepareUpdate of plugin setup must not be called.
        expect(setupUV4.prepareUpdate).to.have.callCount(0);
      });

      it("successfully calls plugin setup's prepareUpdate with correct arguments", async () => {
        const data = '0x11';

        // Reset the cache so previus tests don't trick this test that
        // the function was really called, even though it mightn't have been.
        // This is needed because smock contracts are not deployed in beforeEach,
        // but in before, so there's only one instance of them for all tests.
        setupUV2.prepareUpdate.reset();

        await prepareUpdate(
          psp,
          targetDao.address,
          proxy,
          currentVersion,
          newVersion,
          pluginRepoPointer[0],
          helpersUV1,
          data
        );

        expect(setupUV2.prepareUpdate).to.have.been.calledWith(
          targetDao.address,
          1, // build
          [proxy, helpersUV1, data]
        );
      });

      it('successfully prepares update and emits the correct arguments', async () => {
        // Helpers,permissions and initData are
        // what `newVersion`'s prepareUpdate is supposed to return.
        const expectedHelpers = mockHelpers(2);
        const expectedPermissions = mockPermissionsOperations(
          1,
          2,
          Operation.Grant
        );
        const initData = '0xe27e9a4e';

        const preparedSetupId = getPreparedSetupId(
          [pluginRepoPointer[0], ...newVersion],
          expectedHelpers,
          // @ts-ignore
          expectedPermissions,
          initData,
          PreparationType.Update
        );

        await expect(
          psp.prepareUpdate(
            targetDao.address,
            createPrepareUpdateParams(
              proxy,
              currentVersion,
              newVersion,
              pluginRepoPointer[0],
              helpersUV1,
              EMPTY_DATA
            )
          )
        )
          .to.emit(psp, 'UpdatePrepared')
          .withArgs(
            ownerAddress,
            targetDao.address,
            preparedSetupId,
            pluginRepoPointer[0],
            (val: any) => expect(val).to.deep.equal(newVersion),
            (val: any) =>
              expect(val).to.deep.equal([proxy, helpersUV1, EMPTY_DATA]),
            (val: any) =>
              expect(val).to.deep.equal([expectedHelpers, expectedPermissions]),
            initData
          );
      });
    });
  });

  describe('applyUpdate', function () {
    let proxy: string;
    let helpersUV1: string[];
    let permissionsUV1: PermissionOperation[];

    let currentPluginRepoPointer: PluginRepoPointer;
    let newPluginRepoPointer: PluginRepoPointer;
    let currentVersion: VersionTag = [1, 1]; // plugin's version it initially installs.
    let newVersion: VersionTag = [1, 2];

    let currentAppliedSetupId: string;

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

      currentPluginRepoPointer = [repoU.address, ...currentVersion];
      newPluginRepoPointer = [repoU.address, ...newVersion];

      ({
        plugin: proxy,
        helpers: helpersUV1,
        permissions: permissionsUV1,
        appliedSetupId: currentAppliedSetupId,
      } = await installPlugin(
        psp,
        targetDao.address,
        currentPluginRepoPointer,
        EMPTY_DATA
      ));

      await targetDao.grant(proxy, psp.address, UPGRADE_PLUGIN_PERMISSION_ID);
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
          createApplyUpdateParams(
            proxy,
            currentPluginRepoPointer,
            EMPTY_DATA,
            permissionsUV1,
            helpersUV1
          )
        )
      )
        .to.be.revertedWithCustomError(psp, 'SetupApplicationUnauthorized')
        .withArgs(targetDao.address, ownerAddress, APPLY_UPDATE_PERMISSION_ID);
    });

    it("reverts if PluginSetupProcessor does not have DAO's `ROOT_PERMISSION`", async () => {
      await targetDao.revoke(
        targetDao.address,
        psp.address,
        ROOT_PERMISSION_ID
      );

      const {
        preparedSetupData: {permissions, helpers},
        initData,
      } = await prepareUpdate(
        psp,
        targetDao.address,
        proxy,
        currentVersion,
        newVersion,
        currentPluginRepoPointer[0],
        helpersUV1,
        EMPTY_DATA
      );

      await expect(
        psp.applyUpdate(
          targetDao.address,
          createApplyUpdateParams(
            proxy,
            newPluginRepoPointer,
            initData,
            permissions,
            helpers
          )
        )
      )
        .to.be.revertedWithCustomError(targetDao, 'Unauthorized')
        .withArgs(targetDao.address, psp.address, ROOT_PERMISSION_ID);
    });

    it('reverts if the plugin setup processor does not have the `UPGRADE_PLUGIN_PERMISSION_ID` permission', async () => {
      await targetDao.revoke(proxy, psp.address, UPGRADE_PLUGIN_PERMISSION_ID);

      const {
        preparedSetupData: {permissions, helpers},
        initData,
      } = await prepareUpdate(
        psp,
        targetDao.address,
        proxy,
        currentVersion,
        newVersion,
        currentPluginRepoPointer[0],
        helpersUV1,
        EMPTY_DATA
      );

      await expect(
        psp.applyUpdate(
          targetDao.address,
          createApplyUpdateParams(
            proxy,
            newPluginRepoPointer,
            initData,
            permissions,
            helpers
          )
        )
      )
        .to.be.revertedWithCustomError(psp, 'PluginProxyUpgradeFailed')
        .withArgs(proxy, await setupUV2.callStatic.implementation(), initData);
    });

    it('reverts if preparation has not happened yet for update', async () => {
      const preparedSetupId = getPreparedSetupId(
        currentPluginRepoPointer,
        helpersUV1,
        permissionsUV1,
        EMPTY_DATA,
        PreparationType.Update
      );
      await expect(
        psp.applyUpdate(
          targetDao.address,
          createApplyUpdateParams(
            proxy,
            currentPluginRepoPointer,
            EMPTY_DATA,
            permissionsUV1,
            helpersUV1
          )
        )
      )
        .to.be.revertedWithCustomError(psp, 'SetupNotApplicable')
        .withArgs(preparedSetupId);
    });

    it('EDGE-CASE: reverts for both preparations once one of them gets applied', async () => {
      // Prepare first which updates to `newVersion`
      const firstPreparationNewVersion = newVersion;
      const {
        preparedSetupData: {
          permissions: firstPreparationPermissions,
          helpers: firstPreparationHelpers,
        },
        initData: firstPreparationInitData,
      } = await prepareUpdate(
        psp,
        targetDao.address,
        proxy,
        currentVersion,
        firstPreparationNewVersion,
        currentPluginRepoPointer[0],
        helpersUV1,
        EMPTY_DATA
      );

      // Prepare second which updates to +1 build number than `newVersion`.
      const secondPreparationNewVersion: VersionTag = [
        newVersion[0],
        newVersion[1] + 1,
      ];
      const {
        preparedSetupData: {
          permissions: secondPreparationPermissions,
          helpers: secondPreparationHelpers,
        },
        initData: secondPreparationInitData,
        preparedSetupId,
      } = await prepareUpdate(
        psp,
        targetDao.address,
        proxy,
        currentVersion,
        secondPreparationNewVersion,
        currentPluginRepoPointer[0],
        helpersUV1,
        EMPTY_DATA
      );

      await expect(
        psp.callStatic.applyUpdate(
          targetDao.address,
          createApplyUpdateParams(
            proxy,
            newPluginRepoPointer,
            firstPreparationInitData,
            firstPreparationPermissions,
            firstPreparationHelpers
          )
        )
      ).not.to.be.reverted;

      await expect(
        psp.callStatic.applyUpdate(
          targetDao.address,
          createApplyUpdateParams(
            proxy,
            [
              newPluginRepoPointer[0],
              secondPreparationNewVersion[0],
              secondPreparationNewVersion[1],
            ],
            secondPreparationInitData,
            secondPreparationPermissions,
            secondPreparationHelpers
          )
        )
      ).not.to.be.reverted;

      // Apply one of the preparation
      await applyUpdate(
        psp,
        targetDao.address,
        proxy,
        [
          newPluginRepoPointer[0],
          secondPreparationNewVersion[0],
          secondPreparationNewVersion[1],
        ],
        secondPreparationInitData,
        secondPreparationPermissions,
        secondPreparationHelpers
      );

      // confirm that now preparations can't be applied anymore
      await expect(
        psp.applyUpdate(
          targetDao.address,
          createApplyUpdateParams(
            proxy,
            newPluginRepoPointer,
            firstPreparationInitData,
            firstPreparationPermissions,
            firstPreparationHelpers
          )
        )
      ).to.be.reverted;
      await expect(
        psp.applyUpdate(
          targetDao.address,
          createApplyUpdateParams(
            proxy,
            [
              newPluginRepoPointer[0],
              secondPreparationNewVersion[0],
              secondPreparationNewVersion[1],
            ],
            secondPreparationInitData,
            secondPreparationPermissions,
            secondPreparationHelpers
          )
        )
      ).to.be.reverted;
    });

    describe('Whether upgrade functions of proxy get called the right way', async () => {
      let fake: any;

      beforeEach(async () => {
        // create a fake on the same plugin(proxy) address.
        fake = await smock.fake('PluginUUPSUpgradeable', {
          address: proxy,
        });

        // Since smock fake will end up having functions that always returns
        // Solidity default values, the below overrides them with the correct data
        // So when PSP calls it, it can expect the same information as if it would call
        // the normal/original `proxy/plugin`.
        fake.supportsInterface.whenCalledWith('0xffffffff').returns(false);
        fake.supportsInterface.whenCalledWith('0x01ffc9a7').returns(true);
        fake.supportsInterface.whenCalledWith('0x41de6830').returns(true);
      });

      it('correctly applies updates when plugin setups are same, but UI different', async () => {
        // plugin setup addresses are the same, so it treats it as UIs are different.
        const currentV: VersionTag = [1, 5];
        const newV: VersionTag = [1, 6];
        const currentPluginRepoPointer: PluginRepoPointer = [
          repoU.address,
          1,
          5,
        ];

        const {plugin, helpers} = await installPlugin(
          psp,
          targetDao.address,
          currentPluginRepoPointer
        );

        await updatePlugin(
          psp,
          targetDao.address,
          plugin,
          currentV,
          newV,
          repoU.address,
          helpers,
          EMPTY_DATA
        );

        expect(fake.upgradeTo).to.have.callCount(0);
        expect(fake.upgradeToAndCall).to.have.callCount(0);
      });

      it('successfully calls `upgradeToAndCall` on plugin if initData was provided by pluginSetup', async () => {
        const {initData} = await updatePlugin(
          psp,
          targetDao.address,
          proxy,
          currentVersion,
          newVersion, // uses setupUV2
          repoU.address,
          helpersUV1,
          EMPTY_DATA
        );

        const newImpl = await setupUV2.implementation();
        expect(fake.upgradeToAndCall).to.have.been.calledWith(
          newImpl,
          initData
        );
      });

      it('successfully calls `upgradeTo` on plugin if no initData was provided', async () => {
        setupUV2.prepareUpdate.returns([
          EMPTY_DATA,
          [mockHelpers(1), mockPermissionsOperations(0, 1, Operation.Grant)],
        ]);

        const {initData} = await updatePlugin(
          psp,
          targetDao.address,
          proxy,
          currentVersion,
          newVersion, // uses setupUV2
          repoU.address,
          helpersUV1,
          EMPTY_DATA
        );

        // Reset so other tests continue using the default/original data
        setupUV2.prepareUpdate.reset();

        const newImpl = await setupUV2.implementation();
        expect(fake.upgradeTo).to.have.been.calledWith(newImpl);
      });
    });

    it('successfuly updates and emits the correct event arguments', async () => {
      const {
        preparedSetupId,
        initData,
        preparedSetupData: {permissions, helpers},
      } = await prepareUpdate(
        psp,
        targetDao.address,
        proxy,
        currentVersion,
        newVersion,
        currentPluginRepoPointer[0],
        helpersUV1,
        EMPTY_DATA
      );

      const appliedSetupId = getAppliedSetupId(newPluginRepoPointer, helpers);

      await expect(
        psp.applyUpdate(
          targetDao.address,
          createApplyUpdateParams(
            proxy,
            newPluginRepoPointer,
            initData,
            permissions,
            helpers
          )
        )
      )
        .to.emit(psp, 'UpdateApplied')
        .withArgs(targetDao.address, proxy, preparedSetupId, appliedSetupId);
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

      let currentVersion: VersionTag = [1, 1];
      let pluginRepoPointer: PluginRepoPointer;

      beforeEach(async () => {
        pluginRepoPointer = [repoU.address, 1, 1];

        ({
          plugin: proxy,
          helpers: helpersUV1,
          permissions: permissionsUV1,
        } = await installPlugin(
          psp,
          targetDao.address,
          pluginRepoPointer,
          EMPTY_DATA
        ));

        await targetDao.grant(proxy, psp.address, UPGRADE_PLUGIN_PERMISSION_ID);
      });

      it('points to the V1 implementation', async () => {
        expect(
          await PluginUV1.attach(proxy).callStatic.implementation()
        ).to.equal(await setupUV1.callStatic.implementation());
      });

      it('initializes the members', async () => {
        expect(await PluginUV1.attach(proxy).state1()).to.equal(1);
      });

      it('sets the V1 helpers', async () => {
        expect(helpersUV1).to.deep.equal(mockHelpers(2));
      });

      it('sets the V1 permissions', async () => {
        expect(permissionsUV1).to.deep.equal(
          mockPermissionsOperations(0, 2, Operation.Grant)
        );
      });

      it('updates to V2: Contract was actually updated', async () => {
        await updateAndValidatePluginUpdate(
          psp,
          targetDao.address,
          proxy,
          currentVersion,
          [1, 2],
          pluginRepoPointer[0],
          helpersUV1,
          EMPTY_DATA
        );
      });

      it('updates to V2: fake (was it called)', async () => {
        await updateAndValidatePluginUpdate(
          psp,
          targetDao.address,
          proxy,
          currentVersion,
          [1, 2],
          pluginRepoPointer[0],
          helpersUV1,
          EMPTY_DATA
        );
      });

      it('updates to V3', async () => {
        await updateAndValidatePluginUpdate(
          psp,
          targetDao.address,
          proxy,
          currentVersion,
          [1, 3],
          pluginRepoPointer[0],
          helpersUV1,
          EMPTY_DATA
        );
      });

      context(`and updated to V2`, function () {
        let helpersV2: string[];
        let permissionsUV1V2: PermissionOperation[];
        let initDataV1V2: BytesLike;
        let currentVersion: VersionTag = [1, 2];

        beforeEach(async () => {
          ({
            updatedHelpers: helpersV2,
            permissions: permissionsUV1V2,
            initData: initDataV1V2,
          } = await updatePlugin(
            psp,
            targetDao.address,
            proxy,
            [1, 1],
            [1, 2],
            pluginRepoPointer[0],
            helpersUV1,
            EMPTY_DATA
          ));
        });

        it('points to the V2 implementation', async () => {
          expect(
            await PluginUV2.attach(proxy).callStatic.implementation()
          ).to.equal(await setupUV2.callStatic.implementation());
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
          await updateAndValidatePluginUpdate(
            psp,
            targetDao.address,
            proxy,
            currentVersion,
            [1, 3],
            pluginRepoPointer[0],
            helpersV2,
            EMPTY_DATA
          );
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
            } = await updatePlugin(
              psp,
              targetDao.address,
              proxy,
              [1, 2],
              [1, 3],
              pluginRepoPointer[0],
              helpersV2,
              EMPTY_DATA
            ));
          });

          it('points to the V3 implementation', async () => {
            expect(
              await PluginUV3.attach(proxy).callStatic.implementation()
            ).to.equal(await setupUV3.callStatic.implementation());
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
          } = await updatePlugin(
            psp,
            targetDao.address,
            proxy,
            [1, 1],
            [1, 3],
            pluginRepoPointer[0],
            helpersUV1,
            EMPTY_DATA
          ));
        });

        it('points to the V3 implementation', async () => {
          expect(
            await PluginUV3.attach(proxy).callStatic.implementation()
          ).to.equal(await setupUV3.callStatic.implementation());
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
      });
    });

    context(`V2 was installed`, function () {
      let proxy: string;
      let helpersV2: string[];
      let permissionsV2: PermissionOperation[];
      let pluginRepoPointer: PluginRepoPointer;
      beforeEach(async () => {
        pluginRepoPointer = [repoU.address, 1, 2];
        ({
          plugin: proxy,
          helpers: helpersV2,
          permissions: permissionsV2,
        } = await installPlugin(
          psp,
          targetDao.address,
          pluginRepoPointer,
          EMPTY_DATA
        ));

        await targetDao.grant(proxy, psp.address, UPGRADE_PLUGIN_PERMISSION_ID);
      });

      it('points to the V2 implementation', async () => {
        expect(
          await PluginUV2.attach(proxy).callStatic.implementation()
        ).to.equal(await setupUV2.callStatic.implementation());
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
        await updateAndValidatePluginUpdate(
          psp,
          targetDao.address,
          proxy,
          [1, 2],
          [1, 3],
          pluginRepoPointer[0],
          helpersV2,
          EMPTY_DATA
        );
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
          } = await updatePlugin(
            psp,
            targetDao.address,
            proxy,
            [1, 2],
            [1, 3],
            pluginRepoPointer[0],
            helpersV2,
            EMPTY_DATA
          ));
        });

        it('points to the V3 implementation', async () => {
          expect(
            await PluginUV3.attach(proxy).callStatic.implementation()
          ).to.equal(await setupUV3.callStatic.implementation());
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
      });
    });

    context(`V3 was installed`, function () {
      let proxy: string;
      let helpersV3: string[];
      let permissionsV3: PermissionOperation[];
      let pluginRepoPointer: PluginRepoPointer;
      beforeEach(async () => {
        pluginRepoPointer = [repoU.address, 1, 3];

        ({
          plugin: proxy,
          helpers: helpersV3,
          permissions: permissionsV3,
        } = await installPlugin(
          psp,
          targetDao.address,
          pluginRepoPointer,
          EMPTY_DATA
        ));

        await targetDao.grant(proxy, psp.address, UPGRADE_PLUGIN_PERMISSION_ID);
      });

      it('points to the V3 implementation', async () => {
        expect(
          await PluginUV3.attach(proxy).callStatic.implementation()
        ).to.equal(await setupUV3.callStatic.implementation());
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
      it('updates to v5', async () => {
        await updateAndValidatePluginUpdate(
          psp,
          targetDao.address,
          proxy,
          [1, 3],
          [1, 5],
          pluginRepoPointer[0],
          helpersV3,
          EMPTY_DATA
        );
      });
    });
  });
});

async function updateAndValidatePluginUpdate(
  psp: PluginSetupProcessor,
  targetDao: string,
  proxy: string,
  currentVersionTag: VersionTag,
  newVersionTag: VersionTag,
  pluginRepo: string,
  currentHelpers: string[],
  data: BytesLike = EMPTY_DATA
) {
  await updatePlugin(
    psp,
    targetDao,
    proxy,
    currentVersionTag,
    newVersionTag,
    pluginRepo,
    currentHelpers,
    data
  );

  const PluginRepoFactory = await ethers.getContractFactory('PluginRepo');
  const repo = PluginRepoFactory.attach(pluginRepo);

  const currentVersion = await repo['getVersion((uint8,uint16))']({
    release: currentVersionTag[0],
    build: currentVersionTag[1],
  });
  const newVersion = await repo['getVersion((uint8,uint16))']({
    release: newVersionTag[0],
    build: newVersionTag[1],
  });

  const PluginSetupFactory = await ethers.getContractFactory(
    'PluginUUPSUpgradeableSetupV1Mock'
  );

  const currentPluginSetup = PluginSetupFactory.attach(
    currentVersion.pluginSetup
  );
  const newPluginSetup = PluginSetupFactory.attach(newVersion.pluginSetup);

  // If the base contracts don't change from current and new plugin setups,
  // PluginSetupProcessor shouldn't call `upgradeTo` or `upgradeToAndCall`
  // on the plugin. The below check for this still is not 100% ensuring,
  // As function `upgradeTo` might be called but event `Upgraded`
  // not thrown(OZ changed the logic or name) which will trick the test to pass..
  const currentImpl = await currentPluginSetup.implementation();
  const newImpl = await newPluginSetup.implementation();

  if (currentImpl != newImpl) {
    const proxyContract = await ethers.getContractAt(
      'PluginUUPSUpgradeable',
      proxy
    );
    expect(await proxyContract.implementation()).to.equal(newImpl);
  }
}
