import {
  IERC165__factory,
  IPluginSetup__factory,
  IProtocolVersion__factory,
  PluginCloneableV1Mock__factory,
  PluginCloneableSetupV1Mock,
  PluginCloneableSetupV1Mock__factory,
} from '../../../typechain';
import {osxContractsVersion} from '../../test-utils/protocol-version';
import {getInterfaceId} from '@aragon/osx-commons-sdk';
import {expect} from 'chai';
import {ethers} from 'hardhat';

describe('PluginSetup', function () {
  let setupMock: PluginCloneableSetupV1Mock;

  before(async () => {
    const signers = await ethers.getSigners();
    const pluginImplementation = await new PluginCloneableV1Mock__factory(
      signers[0]
    ).deploy();
    setupMock = await new PluginCloneableSetupV1Mock__factory(
      signers[0]
    ).deploy(pluginImplementation.address);
  });

  describe('ERC-165', async () => {
    it('does not support the empty interface', async () => {
      expect(await setupMock.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165` interface', async () => {
      const iface = IERC165__factory.createInterface();
      expect(await setupMock.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `IPluginSetup` interface', async () => {
      const iface = IPluginSetup__factory.createInterface();
      expect(await setupMock.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `IProtocolVersion` interface', async () => {
      const iface = IProtocolVersion__factory.createInterface();
      expect(await setupMock.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });
  });

  describe('Protocol version', async () => {
    it('returns the current protocol version', async () => {
      expect(await setupMock.protocolVersion()).to.deep.equal(
        osxContractsVersion()
      );
    });
  });
});
