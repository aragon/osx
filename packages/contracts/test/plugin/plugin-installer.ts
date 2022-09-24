import {expect} from 'chai';
import {zeroAddress} from 'ethereumjs-util';
import {BytesLike} from 'ethers';
import {ethers} from 'hardhat';
import {
  PluginSetupProcessor,
  PluginSetupV1Mock,
  PluginSetupV2Mock,
  PluginRepoFactory,
  AragonPluginRegistry,
} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';

import {deployNewDAO} from '../test-utils/dao';

enum Op {
  Grant,
  Revoke,
  Freeze,
  GrantWithOracle,
}

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
  InstallationPrepared: 'InstallationPrepared',
  InstallationProcessed: 'InstallationProcessed',
  PluginUninstalled: 'PluginUninstalled',
  Granted: 'Granted',
  Revoked: 'Revoked',
};

const abiCoder = ethers.utils.defaultAbiCoder;
const AddressZero = ethers.constants.AddressZero;
// default oracle address emitted from permission manager
const ADDRESS_TWO = `0x${'00'.repeat(19)}02`;

const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION');
const PROCESS_SETUP_PERMISSION_ID = ethers.utils.id('PROCESS_SETUP_PERMISSION');
const SET_REPO_REGISTRY_PERMISSION_ID = ethers.utils.id(
  'SET_REPO_REGISTRY_PERMISSION'
);
const PLUGIN_REGISTER_PERMISSION_ID = ethers.utils.id(
  'PLUGIN_REGISTER_PERMISSION'
);

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

async function decodeEvent(tx: any, eventName: string) {
  const {events} = await tx.wait();
  const event = events.find(({event}: {event: any}) => event === eventName);

  return event;
}

describe('Plugin Setup Processor', function () {
  let signers: any;
  let psp: PluginSetupProcessor;
  let pluginSetupV1Mock: PluginSetupV1Mock;
  let pluginSetupV1MockRepoAddress: any;
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
    // DAO PluginSetupProcessor
    const PluginSetupV1Mock = await ethers.getContractFactory(
      'PluginSetupV1Mock'
    );
    pluginSetupV1Mock = await PluginSetupV1Mock.deploy();

    // DAO PluginSetupProcessor
    const PluginSetupV2Mock = await ethers.getContractFactory(
      'PluginSetupV2Mock'
    );
    pluginSetupV2Mock = await PluginSetupV2Mock.deploy();
  });

  beforeEach(async function () {
    // Managing DAO that have permission to manage PluginSetupProcessor
    managingDao = await deployNewDAO(ownerAddress);
    // Target DAO to be used as an example DAO
    targetDao = await deployNewDAO(ownerAddress);

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

    // Grant `PLUGIN_REGISTER_PERMISSION_ID` to `PluginRepoFactory`.
    await managingDao.grant(
      aragonPluginRegistry.address,
      pluginRepoFactory.address,
      PLUGIN_REGISTER_PERMISSION_ID
    );

    // Create and register a plugin on the AragonPluginRegistry
    const tx = await pluginRepoFactory.createPluginRepoWithVersion(
      'PluginSetupV1Mock',
      [1, 0, 0],
      pluginSetupV1Mock.address,
      '0x00',
      managingDao.address
    );

    const event = await decodeEvent(tx, EVENTS.PluginRepoRegistered);

    const {pluginRepo} = event.args;
    pluginSetupV1MockRepoAddress = pluginRepo;

    // PluginSetupProcessor
    const PluginSetupProcessor = await ethers.getContractFactory(
      'PluginSetupProcessor'
    );
    psp = await PluginSetupProcessor.deploy();
    await psp.initialize(aragonPluginRegistry.address, managingDao.address);

    // Grant `PROCESS_SETUP_PERMISSION_ID` to `ownerAddress` so it can install plugin on behalf of the DAO,
    // this way we don't have to create DAO execute call.
    await targetDao.grant(
      psp.address,
      ownerAddress,
      PROCESS_SETUP_PERMISSION_ID
    );
    await targetDao.grant(targetDao.address, psp.address, ROOT_PERMISSION_ID);
  });

  describe('Install Plugin', function () {
    // TODO: create a test testing `PluginWithTheSameAddressExists` error.

    it('PrepareInstallation: reverts if `PluginSetupRepo` do not exist on `AragonPluginRegistry`', async () => {
      const data = '0x';
      const pluginSetupRepoAddr = ADDRESS_TWO;

      await expect(
        psp.PrepareInstallation(
          targetDao.address,
          pluginSetupV1Mock.address,
          pluginSetupRepoAddr,
          data
        )
      ).to.be.revertedWith(customError('PluginRepoNonexistant'));
    });

    it('PrepareInstallation: retrun correctly the permissions', async () => {
      const data = '0x';

      const tx = await psp.PrepareInstallation(
        targetDao.address,
        pluginSetupV1Mock.address,
        pluginSetupV1MockRepoAddress,
        data
      );

      const event = await decodeEvent(tx, EVENTS.InstallationPrepared);

      const {plugin, helpers, permissions} = event.args;

      expect(permissions).to.deep.equal([
        [
          Op.Grant,
          targetDao.address,
          plugin,
          AddressZero,
          ethers.utils.id('EXEC_PERMISSION'),
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

    it("processInstallation: reverts if PluginSetupProcessor doesn't have root permission on the dao", async () => {
      // revoke root permission on dao for plugin installer
      // to see that it can't set permissions without it.
      await targetDao.revoke(
        targetDao.address,
        psp.address,
        ROOT_PERMISSION_ID
      );

      const data = '0x';
      const tx = await psp.PrepareInstallation(
        targetDao.address,
        pluginSetupV1Mock.address,
        pluginSetupV1MockRepoAddress,
        data
      );
      const event = await decodeEvent(tx, EVENTS.InstallationPrepared);
      const {plugin, pluginSetup, helpers, permissions} = event.args;

      await expect(
        psp.processInstallation(
          targetDao.address,
          pluginSetup,
          plugin,
          permissions
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

    it("processInstallation: reverts if PluginSetupProcessor doesn't have `PROCESS_SETUP_PERMISSION` permission", async () => {
      // revoke `PROCESS_SETUP_PERMISSION_ID` on dao for plugin installer
      // to see that it can't set permissions without it.
      await targetDao.revoke(
        psp.address,
        ownerAddress,
        PROCESS_SETUP_PERMISSION_ID
      );

      const data = '0x';
      const tx = await psp.PrepareInstallation(
        targetDao.address,
        pluginSetupV1Mock.address,
        pluginSetupV1MockRepoAddress,
        data
      );
      const event = await decodeEvent(tx, EVENTS.InstallationPrepared);
      const {plugin, pluginSetup, helpers, permissions} = event.args;

      await expect(
        psp.processInstallation(
          targetDao.address,
          pluginSetup,
          plugin,
          permissions
        )
      ).to.be.revertedWith(customError('SetupNotAllowed'));
    });

    it('processInstallation: correctly complete an instaltion process', async () => {
      const data = '0x';
      const tx = await psp.PrepareInstallation(
        targetDao.address,
        pluginSetupV1Mock.address,
        pluginSetupV1MockRepoAddress,
        data
      );
      const event = await decodeEvent(tx, EVENTS.InstallationPrepared);
      const {plugin, pluginSetup, helpers, permissions} = event.args;

      await expect(
        psp.processInstallation(
          targetDao.address,
          pluginSetup,
          plugin,
          permissions
        )
      )
        .to.emit(psp, EVENTS.InstallationProcessed)
        .withArgs(targetDao.address, plugin);
    });
  });

  describe('Plugin Uninstall', function () {
    it('revert if plugin repo does not exist or wrongly passed', async () => {
      const data = '0x';

      const tx = await psp.PrepareInstallation(
        targetDao.address,
        pluginSetupV1Mock.address,
        pluginSetupV1MockRepoAddress,
        data
      );
      const event = await decodeEvent(tx, EVENTS.InstallationPrepared);
      const {plugin, pluginSetup, helpers, permissions} = event.args;

      await psp.processInstallation(
        targetDao.address,
        pluginSetup,
        plugin,
        permissions
      );

      const pluginSetupRepoAddr = ADDRESS_TWO;

      await expect(
        psp.processUninstallation(
          targetDao.address,
          plugin,
          pluginSetup,
          pluginSetupRepoAddr,
          helpers
        )
      ).to.be.revertedWith(customError('PluginRepoNonexistant'));
    });

    it('correctly complete an uninstallation process', async () => {
      const data = '0x';
      const tx = await psp.PrepareInstallation(
        targetDao.address,
        pluginSetupV1Mock.address,
        pluginSetupV1MockRepoAddress,
        data
      );
      const event = await decodeEvent(tx, EVENTS.InstallationPrepared);
      const {plugin, pluginSetup, helpers, permissions} = event.args;

      await psp.processInstallation(
        targetDao.address,
        pluginSetup,
        plugin,
        permissions
      );

      await expect(
        psp.processUninstallation(
          targetDao.address,
          plugin,
          pluginSetup,
          pluginSetupV1MockRepoAddress,
          helpers
        )
      )
        .to.emit(psp, EVENTS.PluginUninstalled)
        .withArgs(targetDao.address, plugin);
    });
  });

  describe('Plugin Update', function () {
    // beforeEach(async () => {
    //   await targetDao.grant(psp.address, ownerAddress, INSTALL_PERMISSION_ID);
    //   await targetDao.grant(psp.address, ownerAddress, UPDATE_PERMISSION_ID);
    //   await targetDao.grant(targetDao.address, psp.address, ROOT_PERMISSION_ID);
    // });
    //   it("reverts if caller is not a dao or doesn't have update permission", async () => {
    //     // revoke UPDATE_PERMISSION_ID permission on plugin update
    //     // to see that caller can't call update
    //     await targetDao.revoke(psp.address, ownerAddress, UPDATE_PERMISSION_ID);
    //     const plugin = {
    //       manager: ethers.constants.AddressZero,
    //       data: '0x',
    //       proxy: ethers.constants.AddressZero,
    //       oldVersion: [1, 1, 1],
    //     };
    //     await expect(
    //       // @ts-ignore TODO:
    //       psp.updatePlugin(targetDao.address, ethers.utils.id(''), plugin)
    //     ).to.be.revertedWith(customError('UpdateNotAllowed'));
    //   });
    //   it(`
    //     reverts if installer doesn't have root permission
    //     on the dao or doesn't have upgrade permission on the plugin
    //   `, async () => {
    //     const installPlugin = {
    //       manager: pluginSetupV1Mock.address,
    //       data: '0x',
    //     };
    //     const tx = await psp.installPlugin(
    //       targetDao.address,
    //       installPlugin,
    //       ethers.utils.id('installSalt')
    //     );
    //     // This pluginAddr ends up UUPSUpgradable proxy
    //     const pluginAddr = await decodeEvent(tx, EVENTS.PluginInstalled);
    //     const updatePlugin = {
    //       manager: pluginSetupV2Mock.address,
    //       data: '0x',
    //       proxy: pluginAddr,
    //       oldVersion: [1, 1, 1],
    //     };
    //     // Should revert if plugin installer doesn't have upgrade permission
    //     // on the plugin itself.
    //     await expect(
    //       // @ts-ignore
    //       psp.updatePlugin(
    //         targetDao.address,
    //         ethers.utils.id('updateSalt'),
    //         updatePlugin
    //       )
    //     ).to.be.revertedWith(
    //       customError(
    //         'Unauthorized',
    //         pluginAddr,
    //         pluginAddr,
    //         psp.address,
    //         PLUGIN_UPGRADE_PERMISSION_ID
    //       )
    //     );
    //     // Grant plugin upgrde permission to installer to move to next step
    //     targetDao.grant(pluginAddr, psp.address, PLUGIN_UPGRADE_PERMISSION_ID);
    //     // Revoke ROOT permission id on dao for plugin installer to check
    //     // it correctly reverts on setting up permissions
    //     await targetDao.revoke(
    //       targetDao.address,
    //       psp.address,
    //       ROOT_PERMISSION_ID
    //     );
    //     // Reverts as installer doesn't have root permission on the dao
    //     await expect(
    //       // @ts-ignore
    //       psp.updatePlugin(
    //         targetDao.address,
    //         ethers.utils.id('updateSalt'),
    //         updatePlugin
    //       )
    //     ).to.be.revertedWith(
    //       customError(
    //         'Unauthorized',
    //         targetDao.address,
    //         targetDao.address,
    //         psp.address,
    //         ROOT_PERMISSION_ID
    //       )
    //     );
    //   });
    //   it('Update a plugin of a DAO', async function () {
    //     // Prepare plugin v1 to install on `targetDao`.
    //     const pluginV1 = {
    //       manager: pluginSetupV1Mock.address,
    //       data: '0x',
    //     };
    //     // Any salt that passed by a consumer such as the UI.
    //     const installSalt = ethers.utils.id('install_salt');
    //     const updateSalt = ethers.utils.id('update_salt');
    //     // Install plugin v1
    //     const tx = await psp.installPlugin(
    //       targetDao.address,
    //       pluginV1,
    //       installSalt
    //     );
    //     const pluginAddr = await decodeEvent(tx, EVENTS.PluginInstalled);
    //     const updatePlugin = {
    //       // V2 plugin manager that holds updated pluginbase
    //       manager: pluginSetupV2Mock.address,
    //       data: '0x',
    //       proxy: pluginAddr,
    //       oldVersion: [1, 1, 1],
    //     };
    //     // Prepare the `newSalt` that `PluginSetupProcessor` passes to `PluginSetup`.
    //     // Pack the same params similar to the `PluginSetupProcessor`.
    //     const packedSalt = ethers.utils.solidityPack(
    //       ['bytes32', 'address', 'address', 'address', 'bytes32'],
    //       [
    //         updateSalt,
    //         targetDao.address,
    //         psp.address,
    //         updatePlugin.manager,
    //         ethers.utils.keccak256(updatePlugin.data),
    //       ]
    //     );
    //     // Hash the packed salt.
    //     const pspSalt = ethers.utils.keccak256(packedSalt);
    //     // Get update instruction using `PluginSetupProcessor`'s salt.
    //     const [instruction, initData] =
    //       await pluginSetupV2Mock.getUpdateInstruction(
    //         // @ts-ignore
    //         updatePlugin.oldVersion,
    //         targetDao.address,
    //         pluginAddr,
    //         pspSalt,
    //         psp.address,
    //         updatePlugin.data
    //       );
    //     expect(instruction.plugins.length).to.be.equal(0);
    //     // Predict Helpers' addresses.
    //     const predictedHelpersAddresses = instruction.helpers.map(helper =>
    //       predictCreate2(psp.address, pspSalt, helper.initCode)
    //     );
    //     // Allow plugin installer to upgrade the plugin.
    //     targetDao.grant(pluginAddr, psp.address, PLUGIN_UPGRADE_PERMISSION_ID);
    //     await expect(
    //       // @ts-ignore
    //       await psp.updatePlugin(targetDao.address, updateSalt, updatePlugin)
    //     )
    //       .to.emit(psp, EVENTS.PluginUpdated)
    //       .withArgs(
    //         targetDao.address,
    //         pluginAddr,
    //         updatePlugin.oldVersion,
    //         updatePlugin.data
    //       )
    //       .to.emit(targetDao, EVENTS.Revoked)
    //       .withArgs(
    //         ethers.utils.id('EXEC_PERMISSION'),
    //         psp.address,
    //         pluginAddr,
    //         targetDao.address
    //       )
    //       .to.emit(targetDao, EVENTS.Granted)
    //       .withArgs(
    //         ethers.utils.id('GRANT_PERMISSION'),
    //         psp.address,
    //         pluginAddr,
    //         predictedHelpersAddresses[0],
    //         ADDRESS_TWO
    //       );
    //     // Plugin is supposed to be updated now..
    //     const pluginContract = await ethers.getContractFactory(
    //       'PluginUUPSUpgradableV2Mock'
    //     );
    //     const plugin = pluginContract.attach(pluginAddr);
    //     expect(await plugin.str()).to.eq('stringExample');
    //   });
  });
});
