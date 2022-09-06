import {expect} from 'chai';
import {BytesLike} from 'ethers';
import {ethers} from 'hardhat';
import {PluginInstaller, PluginManagerMock} from '../../typechain';

import {deployNewDAO} from '../test-utils/dao';

const abiCoder = ethers.utils.defaultAbiCoder;

const EVENTS = {
  PluginInstalled: 'PluginInstalled',
};

const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION');

const INSTALL_PERMISSION_ID = ethers.utils.id('INSTALL_PERMISSION');
const UPDATE_PERMISSION_ID = ethers.utils.id('UPDATE_PERMISSION');

describe('Plugin Installer', function () {
  let pluginInstaller: PluginInstaller;
  let pluginManagerMock: PluginManagerMock;
  let ownerAddress: string;
  let targetDao: any;

  before(async () => {
    const signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // Target DAO to be used as an example DAO
    targetDao = await deployNewDAO(ownerAddress);

    // DAO PluginInstaller
    const PluginInstaller = await ethers.getContractFactory('PluginInstaller');
    pluginInstaller = await PluginInstaller.deploy();

    // DAO PluginInstaller
    const PluginManagerMock = await ethers.getContractFactory(
      'PluginManagerMock'
    );
    pluginManagerMock = await PluginManagerMock.deploy();

    // Grant the `INSTALL_PERMISSION_ID` permission to `ownerAddress`
    await targetDao.grant(
      pluginInstaller.address,
      ownerAddress,
      INSTALL_PERMISSION_ID
    );

    await targetDao.grant(
      targetDao.address,
      pluginInstaller.address,
      ROOT_PERMISSION_ID
    );
  });

  it('Install a plugin on DAO', async function () {
    // Prepare plugin to install on `targetDao`.
    const pluginParams = '0x';

    const plugin = {
      manager: pluginManagerMock.address,
      data: pluginParams,
    };

    // Any salt that passed by a consumer such as the UI.
    const uiSalt = ethers.utils.id('salt');

    // Prepare the `newSalt` that `PluginInstaller` passes to `PluginManager`.
    // Pack the same params similar to the `PluginInstaller`.
    const packedSalt = ethers.utils.solidityPack(
      ['bytes32', 'address', 'address', 'address', 'bytes32'],
      [
        uiSalt,
        targetDao.address,
        pluginInstaller.address,
        plugin.manager,
        ethers.utils.keccak256(plugin.data),
      ]
    );

    // Hash the packed salt.
    const pISalt = ethers.utils.keccak256(packedSalt);

    // Get install instruction using `PluginInstaller`'s salt.
    const instruction = await pluginManagerMock.getInstallInstruction(
      targetDao.address,
      pISalt,
      pluginInstaller.address,
      pluginParams
    );

    // Predict Plugin's address.
    const predictedPluginAddress = ethers.utils.getCreate2Address(
      pluginInstaller.address,
      pISalt,
      ethers.utils.keccak256(instruction.plugins[0].initCode)
    );

    // Predict Helpers' address.
    const predictedHelpersAddresses = instruction.helpers.map(helper =>
      ethers.utils.getCreate2Address(
        pluginInstaller.address,
        pISalt,
        ethers.utils.keccak256(helper.initCode)
      )
    );

    // Check that the predicted addresses are the same as the ones installed by the `PluginInstaller`.
    expect(
      await pluginInstaller.installPlugin(targetDao.address, plugin, uiSalt)
    )
      .to.emit(pluginInstaller, EVENTS.PluginInstalled)
      .withArgs(
        targetDao.address,
        predictedPluginAddress,
        predictedHelpersAddresses
      );
  });
});
