import {expect} from 'chai';
import {ethers} from 'hardhat';
import {
  PluginSetupProcessor,
  PluginSetupV1Mock,
  PluginSetupV2Mock,
  PluginRepoFactory,
  AragonPluginRegistry,
  PluginRepo,
} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';

import {deployNewDAO} from '../test-utils/dao';
import {decodeEvent} from '../test-utils/event';
import {prepareInstallation} from '../test-utils/plugin-setup-processor';

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
  UninstallationApplied: 'UninstallationApplied',
  PluginRepoRegistered: 'PluginRepoRegistered',
  Granted: 'Granted',
  Revoked: 'Revoked',
};

const EMPTY_DATA = '0x';

const AddressZero = ethers.constants.AddressZero;
// default oracle address emitted from permission manager
const ADDRESS_TWO = `0x${'00'.repeat(19)}02`;

const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION');
const PROCESS_INSTALL_PERMISSION_ID = ethers.utils.id(
  'PROCESS_INSTALL_PERMISSION'
);
const PROCESS_UPDATE_PERMISSION_ID = ethers.utils.id(
  'PROCESS_UPDATE_PERMISSION'
);
const PROCESS_UNINSTALL_PERMISSION_ID = ethers.utils.id(
  'PROCESS_UNINSTALL_PERMISSION'
);
const SET_REPO_REGISTRY_PERMISSION_ID = ethers.utils.id(
  'SET_REPO_REGISTRY_PERMISSION'
);
const PLUGIN_REGISTER_PERMISSION_ID = ethers.utils.id(
  'PLUGIN_REGISTER_PERMISSION'
);
const UPGRADE_PERMISSION_ID = ethers.utils.id('UPGRADE_PERMISSION');

// Util Helper Functions
async function getPluginRepoFactoryMergedABI() {
  // @ts-ignore
  const AragonPluginRegistryArtifact = await hre.artifacts.readArtifact(
    'AragonPluginRegistry'
  );
  // @ts-ignore
  const PluginRepoFactoryArtifact = await hre.artifacts.readArtifact(
    'PluginRepoFactory'
  );

  const _merged = [
    ...PluginRepoFactoryArtifact.abi,
    ...AragonPluginRegistryArtifact.abi.filter((f: any) => f.type === 'event'),
  ];

  // remove duplicated events
  const merged = _merged.filter(
    (value, index, self) =>
      index === self.findIndex(event => event.name === value.name)
  );

  return {
    abi: merged,
    bytecode: PluginRepoFactoryArtifact.bytecode,
  };
}

describe('Plugin Setup Processor', function () {
  let signers: any;
  let psp: PluginSetupProcessor;
  let pluginRepo: PluginRepo;
  let pluginSetupV1Mock: PluginSetupV1Mock;
  let pluginSetupMockRepoAddress: any;
  let pluginSetupV2Mock: PluginSetupV2Mock;
  let ownerAddress: string;
  let targetDao: any;
  let managingDao: any;
  let pluginRepoFactory: any;
  let aragonPluginRegistry: AragonPluginRegistry;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  before(async () => {
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

    // AragonPluginRegistry
    const AragonPluginRegistry = await ethers.getContractFactory(
      'AragonPluginRegistry'
    );
    aragonPluginRegistry = await AragonPluginRegistry.deploy();
    await aragonPluginRegistry.initialize(managingDao.address);

    // PluginRepoFactory
    const {abi, bytecode} = await getPluginRepoFactoryMergedABI();
    const PluginRepoFactory = new ethers.ContractFactory(
      abi,
      bytecode,
      signers[0]
    );

    pluginRepoFactory = await PluginRepoFactory.deploy(
      aragonPluginRegistry.address
    );

    // Grant `PLUGIN_REGISTER_PERMISSION` to `PluginRepoFactory`.
    await managingDao.grant(
      aragonPluginRegistry.address,
      pluginRepoFactory.address,
      PLUGIN_REGISTER_PERMISSION_ID
    );

    // PluginSetupProcessor
    const PluginSetupProcessor = await ethers.getContractFactory(
      'PluginSetupProcessor'
    );
    psp = await PluginSetupProcessor.deploy(
      managingDao.address,
      aragonPluginRegistry.address
    );
  });

  beforeEach(async function () {
    // Target DAO to be used as an example DAO
    targetDao = await deployNewDAO(ownerAddress);

    // Create and register a plugin on the AragonPluginRegistry
    const tx = await pluginRepoFactory.createPluginRepoWithVersion(
      'PluginSetupV1Mock',
      [1, 0, 0],
      pluginSetupV1Mock.address,
      '0x00',
      ownerAddress
    );

    const event = await decodeEvent(tx, EVENTS.PluginRepoRegistered);

    pluginSetupMockRepoAddress = event.args.pluginRepo;

    // Add PluginSetupV2Mock to the PluginRepo.
    const PluginRepo = await ethers.getContractFactory('PluginRepo');
    pluginRepo = PluginRepo.attach(pluginSetupMockRepoAddress);
    await pluginRepo.createVersion(
      [2, 0, 0],
      pluginSetupV2Mock.address,
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
        PROCESS_INSTALL_PERMISSION_ID
      );
    });

    it('prepareInstallation: reverts if `PluginSetupRepo` do not exist on `AragonPluginRegistry`', async () => {
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

    it('prepareInstallation: retrun correctly the permissions', async () => {
      const {plugin, helpers, prepareInstallpermissions} =
        await prepareInstallation(
          psp,
          targetDao.address,
          pluginSetupV1Mock.address,
          pluginSetupMockRepoAddress,
          EMPTY_DATA
        );

      expect(plugin).not.to.be.equal(AddressZero);
      expect(helpers.length).to.be.equal(1);
      expect(prepareInstallpermissions).to.deep.equal([
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

    it('applyInstallation: reverts if caller does not have `PROCESS_INSTALL_PERMISSION`', async () => {
      // revoke `PROCESS_INSTALL_PERMISSION_ID` on dao for plugin installer
      // to see that it can't set permissions without it.
      await targetDao.revoke(
        psp.address,
        ownerAddress,
        PROCESS_INSTALL_PERMISSION_ID
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
          plugin,
          prepareInstallpermissions
        )
      ).to.be.revertedWith(
        customError(
          'SetupNotAllowed',
          ownerAddress,
          PROCESS_INSTALL_PERMISSION_ID
        )
      );
    });

    it("applyInstallation: reverts if PluginSetupProcessor does not have DAO's `ROOT_PERMISSION`", async () => {
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

    it('applyInstallation: reverts if plugin setup return the same address', async () => {
      const PluginSetupV1MockBad = await ethers.getContractFactory(
        'PluginSetupV1MockBad'
      );
      const pluginSetupV1MockBad = await PluginSetupV1MockBad.deploy();

      const pluginSetupBad = pluginSetupV1MockBad.address;

      // register the bad plugin setup on `AragonPluginRegistry`.
      await pluginRepo.createVersion([3, 0, 0], pluginSetupBad, '0x00');

      // user1 normally prepares a plugin installation.
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
          secondPreparation.plugin,
          secondPreparation.prepareInstallpermissions
        )
      ).to.be.revertedWith(customError('PluginAlreadyApplied'));
    });

    it('applyInstallation: correctly complete an instaltion process', async () => {
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
          plugin,
          prepareInstallpermissions
        )
      )
        .to.emit(psp, EVENTS.InstallationApplied)
        .withArgs(targetDao.address, plugin);
    });
  });

  describe('Plugin Uninstall', function () {
    beforeEach(async () => {
      // Grant necessary permission to `ownerAddress` so it can install/uninstall plugin on behalf of the DAO,
      // this way we don't have to create DAO execute call.
      await targetDao.grant(
        psp.address,
        ownerAddress,
        PROCESS_INSTALL_PERMISSION_ID
      );
      await targetDao.grant(
        psp.address,
        ownerAddress,
        PROCESS_UNINSTALL_PERMISSION_ID
      );
    });

    it('ProcessUninstallation: reverts if caller does not have `PROCESS_UNINSTALL_PERMISSION`', async () => {
      // revoke `PROCESS_INSTALL_PERMISSION_ID` on dao for plugin installer
      // to see that it can't set permissions without it.
      await targetDao.revoke(
        psp.address,
        ownerAddress,
        PROCESS_UNINSTALL_PERMISSION_ID
      );

      const data = '0x';

      await expect(
        psp.applyUninstallation(
          targetDao.address,
          AddressZero,
          AddressZero,
          AddressZero,
          [],
          EMPTY_DATA
        )
      ).to.be.revertedWith(
        customError(
          'SetupNotAllowed',
          ownerAddress,
          PROCESS_UNINSTALL_PERMISSION_ID
        )
      );
    });

    it('ProcessUninstallation: reverts if `PluginSetupRepo` do not exist on `AragonPluginRegistry`', async () => {
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
        plugin,
        prepareInstallpermissions
      );

      const pluginSetupRepoAddr = ADDRESS_TWO;

      await expect(
        psp.applyUninstallation(
          targetDao.address,
          plugin,
          pluginSetup,
          pluginSetupRepoAddr,
          helpers,
          EMPTY_DATA
        )
      ).to.be.revertedWith(customError('EmptyPluginRepo'));
    });

    it('ProcessUninstallation: correctly complete an uninstallation process', async () => {
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
        plugin,
        prepareInstallpermissions
      );

      await expect(
        psp.applyUninstallation(
          targetDao.address,
          plugin,
          pluginSetup,
          pluginSetupMockRepoAddress,
          helpers,
          EMPTY_DATA
        )
      )
        .to.emit(psp, EVENTS.UninstallationApplied)
        .withArgs(targetDao.address, plugin);
    });
  });

  describe('Plugin Update', function () {
    beforeEach(async () => {
      await targetDao.grant(
        psp.address,
        ownerAddress,
        PROCESS_INSTALL_PERMISSION_ID
      );
      await targetDao.grant(
        psp.address,
        ownerAddress,
        PROCESS_UPDATE_PERMISSION_ID
      );
    });

    it('PrepareUpdate: reverts if plugin does not support `PluginUUPSUpgradeable` interface', async () => {
      const pluginSetupRepoAddr = ADDRESS_TWO;
      const plugin = AddressZero;
      const pluginUpdateParams = {
        plugin: plugin,
        pluginSetupRepo: pluginSetupRepoAddr,
        oldPluginSetup: AddressZero,
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
      ).to.be.revertedWith(customError('PluginNonupgradeable', plugin));
    });

    it('PrepareUpdate: reverts if `PluginSetupRepo` do not exist on `AragonPluginRegistry`', async () => {
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
        oldPluginSetup: pluginSetupV1,
        newPluginSetup: pluginSetupV2Mock.address,
      };

      await expect(
        psp.prepareUpdate(daoAddress, pluginUpdateParams, helpers, EMPTY_DATA)
      ).to.be.revertedWith(customError('EmptyPluginRepo'));
    });

    it('PrepareUpdate: correctly retrun permissions and initData', async () => {
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
        oldPluginSetup: pluginSetupV1,
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

    it('PrepareUpdate: revert if helpers passed are missmatched', async () => {
      const daoAddress = targetDao.address;
      const pluginSetupV1 = pluginSetupV1Mock.address;

      const {plugin} = await prepareInstallation(
        psp,
        daoAddress,
        pluginSetupV1,
        pluginSetupMockRepoAddress,
        EMPTY_DATA
      );

      const pluginUpdateParams = {
        plugin: plugin,
        pluginSetupRepo: pluginSetupMockRepoAddress,
        oldPluginSetup: pluginSetupV1,
        newPluginSetup: pluginSetupV2Mock.address,
      };

      await expect(
        psp.prepareUpdate(daoAddress, pluginUpdateParams, [], EMPTY_DATA)
      ).to.be.revertedWith(customError('HelpersMismatch'));
    });

    it('PrepareUpdate: correctly prepare an update', async () => {
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
        oldPluginSetup: pluginSetupV1,
        newPluginSetup: pluginSetupV2Mock.address,
      };

      await expect(
        psp.prepareUpdate(daoAddress, pluginUpdateParams, helpers, EMPTY_DATA)
      ).to.emit(psp, EVENTS.UpdatePrepared);
    });

    it('applyUpdate: reverts if caller does not have `PROCESS_UPDATE_PERMISSION`', async () => {
      // revoke `PROCESS_INSTALL_PERMISSION_ID` on dao for plugin installer
      // to see that it can't set permissions without it.
      await targetDao.revoke(
        psp.address,
        ownerAddress,
        PROCESS_UPDATE_PERMISSION_ID
      );

      await expect(
        psp.applyUpdate(
          targetDao.address,
          AddressZero,
          AddressZero,
          EMPTY_DATA,
          []
        )
      ).to.be.revertedWith(
        customError(
          'SetupNotAllowed',
          ownerAddress,
          PROCESS_UPDATE_PERMISSION_ID
        )
      );
    });

    it('applyUpdate: revert if permissions are mismatched', async () => {
      const permissions: any[] = [];

      await expect(
        psp.applyUpdate(
          targetDao.address,
          AddressZero,
          AddressZero,
          EMPTY_DATA,
          permissions
        )
      ).to.be.revertedWith(customError('UpdatePermissionsMismatch'));
    });

    // TODO: Find a way to test upgradeProxy
    // also chack this function's errors as they might be missleading
    // it also get threw if UPGRADE_PERMISSION is not granted
    // it('applyUpdate: reverts if PluginNonupgradeable', async () => {});

    it('applyUpdate: Correctly process an update', async () => {
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
        plugin,
        prepareInstallpermissions
      );

      const pluginUpdateParams = {
        plugin: plugin,
        pluginSetupRepo: pluginSetupMockRepoAddress,
        oldPluginSetup: pluginSetupV1,
        newPluginSetup: pluginSetupV2Mock.address,
      };
      const prepareUpdateTx = await psp.prepareUpdate(
        targetDao.address,
        pluginUpdateParams,
        helpers,
        EMPTY_DATA
      );
      const prepareUpdateEvent = await decodeEvent(
        prepareUpdateTx,
        EVENTS.UpdatePrepared
      );
      const {permissions, initData} = prepareUpdateEvent.args;

      await targetDao.grant(plugin, psp.address, UPGRADE_PERMISSION_ID);

      await expect(
        psp.applyUpdate(
          targetDao.address,
          plugin,
          pluginSetupV2Mock.address,
          initData,
          permissions
        )
      ).to.emit(psp, EVENTS.UpdateApplied);
    });
  });
});
