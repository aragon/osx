import {expect} from 'chai';
import {ethers} from 'hardhat';

import {
  IERC165__factory,
  IPlugin__factory,
  IProtocolVersion__factory,
  PluginV1Mock,
  PluginV1Mock__factory,
} from '../../../typechain';
import {CURRENT_PROTOCOL_VERSION} from '../../test-utils/protocol-version';
import {getInterfaceID} from '../../test-utils/interfaces';

describe('Plugin Base Contracts', function () {
  describe('Plugin', function () {
    let plugin: PluginV1Mock;

    before(async () => {
      const deployer = (await ethers.getSigners())[0];
      plugin = await new PluginV1Mock__factory(deployer).deploy(
        ethers.constants.AddressZero
      );
    });

    describe('ERC-165', async () => {
      it('does not support the empty interface', async () => {
        expect(await plugin.supportsInterface('0xffffffff')).to.be.false;
      });

      it('supports the `IERC165` interface', async () => {
        const iface = IERC165__factory.createInterface();
        expect(await plugin.supportsInterface(getInterfaceID(iface))).to.be
          .true;
      });

      it('supports the `IPlugin` interface', async () => {
        const iface = IPlugin__factory.createInterface();
        expect(await plugin.supportsInterface(getInterfaceID(iface))).to.be
          .true;
      });

      it('supports the `IProtocolVersion` interface', async () => {
        const iface = IProtocolVersion__factory.createInterface();
        expect(await plugin.supportsInterface(getInterfaceID(iface))).to.be
          .true;
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
});
