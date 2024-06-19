import {expect} from 'chai';
import hre, {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {anyValue} from '@nomicfoundation/hardhat-chai-matchers/withArgs';

import {
  PluginSetupProcessor,
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
  PluginRepo__factory,
  PluginRepoRegistry__factory,
  PluginUUPSUpgradeable__factory,
  PluginUUPSUpgradeableV1Mock__factory,
  PluginUUPSUpgradeableV2Mock__factory,
  PluginUUPSUpgradeableV3Mock__factory,
  PluginUUPSUpgradeableSetupV1Mock__factory,
  PluginSetupProcessorUpgradeable,
  PluginSetupProcessor__factory,
  PluginSetupProcessorUpgradeable__factory
} from '../../../typechain';
import {PluginRepoRegisteredEvent} from '../../../typechain/PluginRepoRegistry';

import {deployENSSubdomainRegistrar} from '../../test-utils/ens';
import {deployNewDAO, ZERO_BYTES32} from '../../test-utils/dao';
import {
  deployPluginSetupProcessor,
  deployUpgradeablePluginSetupProcessor,
} from '../../test-utils/plugin-setup-processor';
import {findEventTopicLog} from '../../../utils/event';
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
import {
  installPlugin,
  updatePlugin,
  uninstallPlugin,
} from '../../test-utils/psp/atomic-helpers';
import {UPGRADE_PERMISSIONS} from '../../test-utils/permissions';
import {ozUpgradeCheckManagedContract} from '../../test-utils/uups-upgradeable';
import { readImplementationValueFromSlot } from '../../../utils/storage';

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

const runs = [
  {artifact: 'PluginSetupProcessor', upgradeable: false},
  {artifact: 'PluginSetupProcessorUpgradeable', upgradeable: true},
];

runs.forEach(options => {
  describe(options.artifact, function () {
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
    let setupCV1Bad: PluginCloneableSetupV1MockBad;
    let setupCV2: PluginCloneableSetupV2Mock;
    let ownerAddress: string;
    let targetDao: DAO;
    let managingDao: DAO;
    let pluginRepoFactory: PluginRepoFactory;
    let pluginRepoRegistry: PluginRepoRegistry;

    before(async () => {
      signers = await ethers.getSigners();
      ownerAddress = await signers[0].getAddress();

      PluginUV1 = new PluginUUPSUpgradeableV1Mock__factory(signers[0]);
      PluginUV2 = new PluginUUPSUpgradeableV2Mock__factory(signers[0]);
      PluginUV3 = new PluginUUPSUpgradeableV3Mock__factory(signers[0]);

      // Deploy PluginUUPSUpgradeableSetupMock
      setupUV1 = await hre.wrapper.deploy('PluginUUPSUpgradeableSetupV1Mock');
      setupUV1Bad = await hre.wrapper.deploy(
        'PluginUUPSUpgradeableSetupV1MockBad'
      );
      setupUV2 = await hre.wrapper.deploy('PluginUUPSUpgradeableSetupV2Mock');
      setupUV3 = await hre.wrapper.deploy('PluginUUPSUpgradeableSetupV3Mock');
      setupUV4 = await hre.wrapper.deploy('PluginUUPSUpgradeableSetupV4Mock', {
        args: [await setupUV3.implementation()],
      });

      // Deploy PluginCloneableSetupMock
      setupCV1 = await hre.wrapper.deploy('PluginCloneableSetupV1Mock');
      setupCV1Bad = await hre.wrapper.deploy('PluginCloneableSetupV1MockBad');
      setupCV2 = await hre.wrapper.deploy('PluginCloneableSetupV2Mock');

      // Deploy yhe managing DAO having permission to manage `PluginSetupProcessor`
      managingDao = await deployNewDAO(signers[0]);

      // Deploy ENS subdomain Registry
      const ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
        signers[0],
        managingDao,
        'dao.eth'
      );

      // Deploy Plugin Repo Registry
      pluginRepoRegistry = await deployPluginRepoRegistry(
        managingDao,
        ensSubdomainRegistrar,
        signers[0]
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
      if (options.upgradeable) {
        psp = await deployUpgradeablePluginSetupProcessor(
          managingDao,
          pluginRepoRegistry
        );
      } else {
        psp = await deployPluginSetupProcessor(pluginRepoRegistry);
      }
      
      // Create and register a plugin on the PluginRepoRegistry
      let tx = await pluginRepoFactory.createPluginRepoWithFirstVersion(
        `plugin-uups-upgradeable-mock`,
        setupUV1.address, // build 1
        ownerAddress,
        releaseMetadata,
        buildMetadata
      );

      const PluginRepoRegisteredEvent1 =
        await findEventTopicLog<PluginRepoRegisteredEvent>(
          tx,
          PluginRepoRegistry__factory.createInterface(),
          EVENTS.PluginRepoRegistered
        );
      const PluginRepo = new PluginRepo__factory(signers[0]);
      repoU = PluginRepo.attach(PluginRepoRegisteredEvent1.args.pluginRepo);

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

      const PluginRepoRegisteredEvent2 =
        await findEventTopicLog<PluginRepoRegisteredEvent>(
          tx,
          PluginRepoRegistry__factory.createInterface(),
          EVENTS.PluginRepoRegistered
        );
      repoC = PluginRepo.attach(PluginRepoRegisteredEvent2.args.pluginRepo);
      await repoC.createVersion(1, setupCV1Bad.address, EMPTY_DATA, EMPTY_DATA);
      await repoC.createVersion(1, setupCV2.address, EMPTY_DATA, EMPTY_DATA);
    });

    beforeEach(async function () {
      // Target DAO to be used as an example DAO
      targetDao = await deployNewDAO(signers[0]);

      // Grant
      await targetDao.grant(targetDao.address, psp.address, ROOT_PERMISSION_ID);
    });

    if (options.upgradeable) {
      // PSP stops upgradability after `hardcodedTimestamp`.
      let hardcodedTimestamp = 1719048022;
      describe('Upgrades', async () => {
        beforeEach(async () => {
          await managingDao
          .connect(signers[0])
          .grant(psp.address, signers[0].address, UPGRADE_PERMISSIONS.UPGRADE_PSP_PERMISSION_ID);
        })
        it('upgrades the contract', async () => {
          const newPSP = await hre.wrapper.deploy('PluginSetupProcessorUpgradeable')

          // @ts-ignore
          await psp.upgradeTo(newPSP.address)

          const toImplementation = await readImplementationValueFromSlot(psp.address);
          expect(toImplementation).to.equal(newPSP.address)
        });
        
        it("upgrades the contract even if current block number is very close to the specified timestamp", async () => {
          const newPSP = await hre.wrapper.deploy('PluginSetupProcessorUpgradeable')

          const snapshotId = await ethers.provider.send("evm_snapshot", []);
          
          await ethers.provider.send('evm_setNextBlockTimestamp', [hardcodedTimestamp - 40000])
          await ethers.provider.send('evm_mine', [])
          
          // @ts-ignore
          await psp.upgradeTo(newPSP.address)

          await ethers.provider.send('evm_revert', [snapshotId])
        })
        it("doesn't allow upgrade if block number exceeds the specified number", async () => {
          const newPSP = await hre.wrapper.deploy('PluginSetupProcessorUpgradeable')

          const snapshotId = await ethers.provider.send("evm_snapshot", []);
          
          await ethers.provider.send('evm_setNextBlockTimestamp', [hardcodedTimestamp])
          await ethers.provider.send('evm_mine', [])
          
          // @ts-ignore
          await expect(psp.upgradeTo(newPSP.address)).to.be.revertedWithCustomError(
            psp,
            'PSPNonupgradeable'
          );
          
          await ethers.provider.send('evm_revert', [snapshotId])
        })
      });
    }

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

          await expect(
            psp.prepareInstallation(
              targetDao.address,
              createPrepareInstallationParams(pluginRepoPointer, data)
            )
          )
            .to.emit(setupUV1, 'InstallationPrepared')
            .withArgs(targetDao.address, data);
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
                expect(val).to.deep.equal([
                  expectedHelpers,
                  expectedPermissions,
                ])
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
            .withArgs(
              targetDao.address,
              plugin,
              preparedSetupId,
              appliedSetupId
            );
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

          await setupUV1Bad.mockPermissionIndexes(0, 2);

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

          await setupUV1Bad.reset();
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
          await setupUV1.mockPermissionIndexes(0, 2);

          await prepareUninstallation(
            psp,
            targetDao.address,
            proxy,
            pluginRepoPointer,
            helpersUV1,
            EMPTY_DATA
          );

          // Clean up
          await setupUV1.reset();
        });

        it("successfully calls plugin setup's prepareUninstallation with correct arguments", async () => {
          const data = '0x11';

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
            .to.emit(setupUV1, 'UninstallationPrepared')
            .withArgs(targetDao.address, (val: any) =>
              expect(val).to.deep.equal([proxy, helpersUV1, data])
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
              (val: any) =>
                expect(val).to.deep.equal([proxy, helpersUV1, data]),
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
          await setupUV1.mockPermissionIndexes(0, 2);

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

          await setupUV1.reset();
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
          await setupUV2.mockHelperCount(1);

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
          await setupUV2.reset();
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

          const tx = psp.prepareUpdate(
            targetDao.address,
            createPrepareUpdateParams(
              proxy,
              currentVersion,
              newVersion,
              currentPluginRepoPointer[0],
              helpers,
              EMPTY_DATA
            )
          );
          await expect(tx).to.not.emit(setupUV4, 'UpdatePrepared');
          await expect(tx).to.emit(psp, EVENTS.UpdatePrepared);
        });

        it("successfully calls plugin setup's prepareUpdate with correct arguments", async () => {
          const data = '0x11';

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
            .to.emit(setupUV1, 'UninstallationPrepared')
            .withArgs(targetDao.address, (val: any) =>
              expect(val).to.deep.equal([proxy, helpersUV1, data])
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
                expect(val).to.deep.equal([
                  expectedHelpers,
                  expectedPermissions,
                ]),
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
          .withArgs(
            targetDao.address,
            ownerAddress,
            APPLY_UPDATE_PERMISSION_ID
          );
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
        await targetDao.revoke(
          proxy,
          psp.address,
          UPGRADE_PLUGIN_PERMISSION_ID
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
          .to.be.revertedWithCustomError(psp, 'PluginProxyUpgradeFailed')
          .withArgs(
            proxy,
            await setupUV2.callStatic.implementation(),
            initData
          );
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

          const {
            initData,
            preparedSetupData: {permissions, helpers: helpersUpdate},
          } = await prepareUpdate(
            psp,
            targetDao.address,
            plugin,
            currentV,
            newV,
            repoU.address,
            helpers,
            EMPTY_DATA
          );

          const pluginInstance = PluginUUPSUpgradeable__factory.connect(
            plugin,
            signers[0]
          );

          await expect(
            psp.applyUpdate(
              targetDao.address,
              createApplyUpdateParams(
                plugin,
                [repoU.address, ...newV],
                initData,
                permissions,
                helpersUpdate
              )
            )
          ).to.not.emit(pluginInstance, 'Upgraded');
        });

        it('successfully calls `upgradeToAndCall` on plugin if initData was provided by pluginSetup', async () => {
          const {
            initData,
            preparedSetupData: {permissions, helpers: helpersUpdate},
          } = await prepareUpdate(
            psp,
            targetDao.address,
            proxy,
            currentVersion,
            newVersion,
            repoU.address,
            helpersUV1,
            EMPTY_DATA
          );

          const pluginInstance = PluginUUPSUpgradeable__factory.connect(
            proxy,
            signers[0]
          );
          const newImpl = await setupUV2.implementation();

          await expect(
            psp.applyUpdate(
              targetDao.address,
              createApplyUpdateParams(
                proxy,
                [repoU.address, ...newVersion],
                initData,
                permissions,
                helpersUpdate
              )
            )
          )
            .to.emit(pluginInstance, 'Upgraded')
            .withArgs(newImpl);
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

          await targetDao.grant(
            proxy,
            psp.address,
            UPGRADE_PLUGIN_PERMISSION_ID
          );
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

          await targetDao.grant(
            proxy,
            psp.address,
            UPGRADE_PLUGIN_PERMISSION_ID
          );
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

          await targetDao.grant(
            proxy,
            psp.address,
            UPGRADE_PLUGIN_PERMISSION_ID
          );
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

    const signers = await ethers.getSigners();

    const PluginRepoFactory = new PluginRepo__factory(signers[0]);
    const repo = PluginRepoFactory.attach(pluginRepo);

    const currentVersion = await repo['getVersion((uint8,uint16))']({
      release: currentVersionTag[0],
      build: currentVersionTag[1],
    });
    const newVersion = await repo['getVersion((uint8,uint16))']({
      release: newVersionTag[0],
      build: newVersionTag[1],
    });

    const PluginSetupFactory = new PluginUUPSUpgradeableSetupV1Mock__factory(
      signers[0]
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
      const proxyContract = PluginUUPSUpgradeable__factory.connect(
        proxy,
        signers[0]
      );

      expect(await proxyContract.implementation()).to.equal(newImpl);
    }
  }
});
