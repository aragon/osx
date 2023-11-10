import {
  IERC165__factory,
  IPlugin__factory,
  IProtocolVersion__factory,
  PluginCloneableV1Mock,
  PluginCloneableV1Mock__factory,
} from '../../../typechain';
import {getInterfaceID} from '../../test-utils/interfaces';
import {CURRENT_PROTOCOL_VERSION} from '../../test-utils/protocol-version';
import {PluginType} from '../../test-utils/psp/types';
import {expect} from 'chai';
import {ethers} from 'hardhat';

describe('PluginCloneable', function () {
  let plugin: PluginCloneableV1Mock;

  before(async () => {
    const deployer = (await ethers.getSigners())[0];
    plugin = await new PluginCloneableV1Mock__factory(deployer).deploy();
  });

  describe('Plugin Type', async () => {
    it('returns the current protocol version', async () => {
      expect(await plugin.pluginType()).to.equal(PluginType.Cloneable);
    });
  });

  describe('ERC-165', async () => {
    it('does not support the empty interface', async () => {
      expect(await plugin.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165` interface', async () => {
      const iface = IERC165__factory.createInterface();
      expect(await plugin.supportsInterface(getInterfaceID(iface))).to.be.true;
    });

    it('supports the `IPlugin` interface', async () => {
      const iface = IPlugin__factory.createInterface();
      expect(await plugin.supportsInterface(getInterfaceID(iface))).to.be.true;
    });

    it('supports the `IProtocolVersion` interface', async () => {
      const iface = IProtocolVersion__factory.createInterface();
      expect(await plugin.supportsInterface(getInterfaceID(iface))).to.be.true;
    });
  });

  describe('Protocol version', async () => {
    it('returns the current protocol version', async () => {
      expect(await plugin.protocolVersion()).to.deep.equal(
        CURRENT_PROTOCOL_VERSION
      );
    });
  });
});
