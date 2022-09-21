import {expect} from 'chai';
import {zeroAddress} from 'ethereumjs-util';
import {BytesLike} from 'ethers';
import {ethers} from 'hardhat';
import {
  PluginSetupProcessor,
  PluginSetupMock,
  PluginSetupV2Mock,
} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';

import {deployNewDAO} from '../test-utils/dao';

const abiCoder = ethers.utils.defaultAbiCoder;

const EVENTS = {
  PluginInstalled: 'PluginInstalled',
  PluginUpdated: 'PluginUpdated',
  Granted: 'Granted',
  Revoked: 'Revoked',
};

// default oracle address emitted from permission manager
const ADDRESS_TWO = `0x${'00'.repeat(19)}02`;

const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION');
const INSTALL_PERMISSION_ID = ethers.utils.id('INSTALL_PERMISSION');
const UPDATE_PERMISSION_ID = ethers.utils.id('UPDATE_PERMISSION');
const PLUGIN_UPGRADE_PERMISSION_ID = ethers.utils.id('UPGRADE_PERMISSION');

// Util Helper Functions
async function decodeEvent(tx: any, eventName: string) {
  const {events} = await tx.wait();
  const event = events.find(
    ({event}: {event: any}) => event === eventName
  ).args;

  const {plugin} = event;
  return plugin;
}

function predictCreate2(deployer: string, salt: string, initCode: string) {
  return ethers.utils.getCreate2Address(
    deployer,
    salt,
    ethers.utils.keccak256(initCode)
  );
}

describe('Plugin Installer', function () {
  let pi: PluginSetupProcessor;
  let pluginSetupV1Mock: PluginSetupMock;
  let pluginSetupV2Mock: PluginSetupV2Mock;
  let ownerAddress: string;
  let targetDao: any;

  before(async () => {
    const signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  before(async () => {
    // DAO PluginSetupProcessor
    const PluginSetupV1Mock = await ethers.getContractFactory(
      'PluginSetupMock'
    );
    pluginSetupV1Mock = await PluginSetupV1Mock.deploy();

    // DAO PluginSetupProcessor
    const PluginSetupV2Mock = await ethers.getContractFactory(
      'PluginSetupV2Mock'
    );
    pluginSetupV2Mock = await PluginSetupV2Mock.deploy();
  });

  beforeEach(async function () {
    // Target DAO to be used as an example DAO
    targetDao = await deployNewDAO(ownerAddress);

    // DAO PluginSetupProcessor
    const PluginSetupProcessor = await ethers.getContractFactory(
      'PluginSetupProcessor'
    );
    pi = await PluginSetupProcessor.deploy();
  });

  describe('Install Plugin', function () {
    beforeEach(async () => {
      await targetDao.grant(pi.address, ownerAddress, INSTALL_PERMISSION_ID);
      await targetDao.grant(targetDao.address, pi.address, ROOT_PERMISSION_ID);
    });

    it("reverts if caller is not a dao or doesn't have install permission", async () => {
      // revoke INSTALL_PERMISSION_ID permission on plugin installer
      // to see that caller can't call install
      await targetDao.revoke(pi.address, ownerAddress, INSTALL_PERMISSION_ID);

      const plugin = {
        manager: ethers.constants.AddressZero,
        data: '0x',
      };

      await expect(
        pi.installPlugin(targetDao.address, plugin, ethers.utils.id(''))
      ).to.be.revertedWith(customError('InstallNotAllowed'));
    });

    it("reverts if installer doesn't have root permission on the dao", async () => {
      // revoke root permission on dao for plugin installer
      // to see that it can't set permissions without it.
      await targetDao.revoke(targetDao.address, pi.address, ROOT_PERMISSION_ID);

      const plugin = {
        manager: pluginSetupV1Mock.address,
        data: '0x',
      };

      await expect(
        pi.installPlugin(targetDao.address, plugin, ethers.utils.id(''))
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          targetDao.address,
          targetDao.address,
          pi.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('installs a plugin and fails if same salt+parameters used again', async function () {
      // Prepare plugin to install on `targetDao`.
      const pluginParams = '0x';

      const plugin = {
        manager: pluginSetupV1Mock.address,
        data: pluginParams,
      };

      // Any salt that passed by a consumer such as the UI.
      const uiSalt = ethers.utils.id('salt');

      // Prepare the `newSalt` that `PluginSetupProcessor` passes to `PluginSetup`.
      // Pack the same params similar to the `PluginSetupProcessor`.
      const packedSalt = ethers.utils.solidityPack(
        ['bytes32', 'address', 'address', 'address', 'bytes32'],
        [
          uiSalt,
          targetDao.address,
          pi.address,
          plugin.manager,
          ethers.utils.keccak256(plugin.data),
        ]
      );

      // Hash the packed salt.
      const pISalt = ethers.utils.keccak256(packedSalt);

      // Get install instruction using `PluginSetupProcessor`'s salt.
      const instruction = await pluginSetupV1Mock.getInstallInstruction(
        targetDao.address,
        pISalt,
        pi.address,
        pluginParams
      );

      // Predict Plugin's address.
      const predictedPluginAddress = predictCreate2(
        pi.address,
        pISalt,
        instruction.plugins[0].initCode
      );

      // Predict Helpers' addresses.
      const predictedHelpersAddresses = instruction.helpers.map(helper =>
        predictCreate2(pi.address, pISalt, helper.initCode)
      );

      // 1. Checks the predicted addresses are the same
      //    as the ones installed by the `PluginSetupProcessor`,
      // 2. Checks final permissions set on dao are the
      //    same as whatever plugin manager returns
      expect(await pi.installPlugin(targetDao.address, plugin, uiSalt))
        .to.emit(pi, EVENTS.PluginInstalled)
        .withArgs(
          targetDao.address,
          predictedPluginAddress,
          predictedHelpersAddresses
        )
        .to.emit(targetDao, EVENTS.Granted)
        .withArgs(
          ethers.utils.id('EXEC_PERMISSION'),
          pi.address,
          predictedPluginAddress,
          targetDao.address,
          ADDRESS_TWO
        )
        .to.emit(targetDao, EVENTS.Granted)
        .withArgs(
          ethers.utils.id('SETTINGS_PERMISSION'),
          pi.address,
          predictedHelpersAddresses[0],
          predictedPluginAddress,
          ADDRESS_TWO
        );

      // Plugin is installed, check if it was initialized correctly.
      const pluginEthersContract = await ethers.getContractFactory(
        'PluginUUPSUpgradableV1Mock'
      );
      const pluginContract = pluginEthersContract.attach(
        predictedPluginAddress
      );
      const initNum = await pluginSetupV1Mock.PLUGIN_INIT_NUMBER();
      expect(await pluginContract.num()).to.eq(initNum);

      // if used the same salt + same parameters, create2 deploy should fail
      await expect(
        pi.installPlugin(targetDao.address, plugin, uiSalt)
      ).to.be.revertedWith('Create2: Failed on deploy');
    });
  });

  describe('Plugin Update', function () {
    beforeEach(async () => {
      await targetDao.grant(pi.address, ownerAddress, INSTALL_PERMISSION_ID);
      await targetDao.grant(pi.address, ownerAddress, UPDATE_PERMISSION_ID);
      await targetDao.grant(targetDao.address, pi.address, ROOT_PERMISSION_ID);
    });

    it("reverts if caller is not a dao or doesn't have update permission", async () => {
      // revoke UPDATE_PERMISSION_ID permission on plugin update
      // to see that caller can't call update
      await targetDao.revoke(pi.address, ownerAddress, UPDATE_PERMISSION_ID);

      const plugin = {
        manager: ethers.constants.AddressZero,
        data: '0x',
        proxy: ethers.constants.AddressZero,
        oldVersion: [1, 1, 1],
      };

      await expect(
        // @ts-ignore TODO:
        pi.updatePlugin(targetDao.address, ethers.utils.id(''), plugin)
      ).to.be.revertedWith(customError('UpdateNotAllowed'));
    });

    it(`
      reverts if installer doesn't have root permission 
      on the dao or doesn't have upgrade permission on the plugin
    `, async () => {
      const installPlugin = {
        manager: pluginSetupV1Mock.address,
        data: '0x',
      };

      const tx = await pi.installPlugin(
        targetDao.address,
        installPlugin,
        ethers.utils.id('installSalt')
      );
      // This pluginAddr ends up UUPSUpgradable proxy
      const pluginAddr = await decodeEvent(tx, EVENTS.PluginInstalled);

      const updatePlugin = {
        manager: pluginSetupV2Mock.address,
        data: '0x',
        proxy: pluginAddr,
        oldVersion: [1, 1, 1],
      };

      // Should revert if plugin installer doesn't have upgrade permission
      // on the plugin itself.
      await expect(
        // @ts-ignore
        pi.updatePlugin(
          targetDao.address,
          ethers.utils.id('updateSalt'),
          updatePlugin
        )
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          pluginAddr,
          pluginAddr,
          pi.address,
          PLUGIN_UPGRADE_PERMISSION_ID
        )
      );

      // Grant plugin upgrde permission to installer to move to next step
      targetDao.grant(pluginAddr, pi.address, PLUGIN_UPGRADE_PERMISSION_ID);

      // Revoke ROOT permission id on dao for plugin installer to check
      // it correctly reverts on setting up permissions
      await targetDao.revoke(targetDao.address, pi.address, ROOT_PERMISSION_ID);

      // Reverts as installer doesn't have root permission on the dao
      await expect(
        // @ts-ignore
        pi.updatePlugin(
          targetDao.address,
          ethers.utils.id('updateSalt'),
          updatePlugin
        )
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          targetDao.address,
          targetDao.address,
          pi.address,
          ROOT_PERMISSION_ID
        )
      );
    });

    it('Update a plugin of a DAO', async function () {
      // Prepare plugin v1 to install on `targetDao`.

      const pluginV1 = {
        manager: pluginSetupV1Mock.address,
        data: '0x',
      };

      // Any salt that passed by a consumer such as the UI.
      const installSalt = ethers.utils.id('install_salt');
      const updateSalt = ethers.utils.id('update_salt');

      // Install plugin v1
      const tx = await pi.installPlugin(
        targetDao.address,
        pluginV1,
        installSalt
      );
      const pluginAddr = await decodeEvent(tx, EVENTS.PluginInstalled);

      const updatePlugin = {
        // V2 plugin manager that holds updated pluginbase
        manager: pluginSetupV2Mock.address,
        data: '0x',
        proxy: pluginAddr,
        oldVersion: [1, 1, 1],
      };

      // Prepare the `newSalt` that `PluginSetupProcessor` passes to `PluginSetup`.
      // Pack the same params similar to the `PluginSetupProcessor`.
      const packedSalt = ethers.utils.solidityPack(
        ['bytes32', 'address', 'address', 'address', 'bytes32'],
        [
          updateSalt,
          targetDao.address,
          pi.address,
          updatePlugin.manager,
          ethers.utils.keccak256(updatePlugin.data),
        ]
      );

      // Hash the packed salt.
      const pISalt = ethers.utils.keccak256(packedSalt);

      // Get update instruction using `PluginSetupProcessor`'s salt.
      const [instruction, initData] =
        await pluginSetupV2Mock.getUpdateInstruction(
          // @ts-ignore
          updatePlugin.oldVersion,
          targetDao.address,
          pluginAddr,
          pISalt,
          pi.address,
          updatePlugin.data
        );

      expect(instruction.plugins.length).to.be.equal(0);

      // Predict Helpers' addresses.
      const predictedHelpersAddresses = instruction.helpers.map(helper =>
        predictCreate2(pi.address, pISalt, helper.initCode)
      );

      // Allow plugin installer to upgrade the plugin.
      targetDao.grant(pluginAddr, pi.address, PLUGIN_UPGRADE_PERMISSION_ID);

      await expect(
        // @ts-ignore
        await pi.updatePlugin(targetDao.address, updateSalt, updatePlugin)
      )
        .to.emit(pi, EVENTS.PluginUpdated)
        .withArgs(
          targetDao.address,
          pluginAddr,
          updatePlugin.oldVersion,
          updatePlugin.data
        )
        .to.emit(targetDao, EVENTS.Revoked)
        .withArgs(
          ethers.utils.id('EXEC_PERMISSION'),
          pi.address,
          pluginAddr,
          targetDao.address
        )
        .to.emit(targetDao, EVENTS.Granted)
        .withArgs(
          ethers.utils.id('GRANT_PERMISSION'),
          pi.address,
          pluginAddr,
          predictedHelpersAddresses[0],
          ADDRESS_TWO
        );

      // Plugin is supposed to be updated now..
      const pluginContract = await ethers.getContractFactory(
        'PluginUUPSUpgradableV2Mock'
      );
      const plugin = pluginContract.attach(pluginAddr);
      expect(await plugin.str()).to.eq('stringExample');
    });
  });
});
