import {
  PluginRepoRegistry,
  DAO,
  PluginRepoFactory,
  PluginRepoFactory__factory,
  PluginRepo__factory,
  IProtocolVersion__factory,
  IERC165__factory,
} from '../../../typechain';
import {deployNewDAO} from '../../test-utils/dao';
import {deployENSSubdomainRegistrar} from '../../test-utils/ens';
import {osxContractsVersion} from '../../test-utils/protocol-version';
import {
  deployMockPluginSetup,
  deployPluginRepoRegistry,
} from '../../test-utils/repo';
import {
  PLUGIN_REGISTRY_PERMISSIONS,
  getInterfaceId,
} from '@aragon/osx-commons-sdk';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ethers} from 'hardhat';

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
  VersionCreated: 'VersionCreated',
  ReleaseMetadataUpdated: 'ReleaseMetadataUpdated',
};

async function getExpectedRepoAddress(from: string) {
  const nonce = await ethers.provider.getTransactionCount(from);
  const expectedAddress = ethers.utils.getContractAddress({
    from: from,
    nonce,
  });

  return expectedAddress;
}

describe('PluginRepoFactory: ', function () {
  let signers: SignerWithAddress[];
  let pluginRepoRegistry: PluginRepoRegistry;
  let ownerAddress: string;
  let managingDao: DAO;
  let pluginRepoFactory: PluginRepoFactory;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // DAO
    managingDao = await deployNewDAO(signers[0]);

    // ENS subdomain Registry
    const ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
      signers[0],
      managingDao,
      'dao.eth'
    );

    // deploy and initialize PluginRepoRegistry
    pluginRepoRegistry = await deployPluginRepoRegistry(
      managingDao,
      ensSubdomainRegistrar,
      signers[0]
    );

    // deploy PluginRepoFactory
    const PluginRepoFactory = new PluginRepoFactory__factory(
      signers[0]
    ) as PluginRepoFactory__factory;

    pluginRepoFactory = await PluginRepoFactory.deploy(
      pluginRepoRegistry.address
    );

    // grant REGISTER_PERMISSION_ID to pluginRepoFactory
    await managingDao.grant(
      pluginRepoRegistry.address,
      pluginRepoFactory.address,
      PLUGIN_REGISTRY_PERMISSIONS.REGISTER_PLUGIN_REPO_PERMISSION_ID
    );

    // grant REGISTER_PERMISSION_ID to pluginRepoFactory
    await managingDao.grant(
      ensSubdomainRegistrar.address,
      pluginRepoRegistry.address,
      PLUGIN_REGISTRY_PERMISSIONS.ENS_REGISTRAR_PERMISSIONS
        .REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
    );
  });

  describe('ERC-165', async () => {
    it('does not support the empty interface', async () => {
      expect(await pluginRepoFactory.supportsInterface('0xffffffff')).to.be
        .false;
    });

    it('supports the `IERC165` interface', async () => {
      const iface = IERC165__factory.createInterface();
      expect(await pluginRepoFactory.supportsInterface(getInterfaceId(iface)))
        .to.be.true;
    });

    it('supports the `IProtocolVersion` interface', async () => {
      const iface = IProtocolVersion__factory.createInterface();
      expect(await pluginRepoFactory.supportsInterface(getInterfaceId(iface)))
        .to.be.true;
    });
  });

  describe('Protocol version', async () => {
    it('returns the current protocol version', async () => {
      expect(await pluginRepoFactory.protocolVersion()).to.deep.equal(
        osxContractsVersion()
      );
    });
  });

  describe('CreatePluginRepo', async () => {
    it('fail to create new pluginRepo with no PLUGIN_REGISTER_PERMISSION', async () => {
      await managingDao.revoke(
        pluginRepoRegistry.address,
        pluginRepoFactory.address,
        PLUGIN_REGISTRY_PERMISSIONS.REGISTER_PLUGIN_REPO_PERMISSION_ID
      );

      await expect(
        pluginRepoFactory.createPluginRepo('my-pluginRepo', ownerAddress)
      )
        .to.be.revertedWithCustomError(pluginRepoRegistry, 'DaoUnauthorized')
        .withArgs(
          managingDao.address,
          pluginRepoRegistry.address,
          pluginRepoFactory.address,
          PLUGIN_REGISTRY_PERMISSIONS.REGISTER_PLUGIN_REPO_PERMISSION_ID
        );
    });

    it('creates new pluginRepo and sets up correct permissions', async () => {
      const pluginRepoSubdomain = 'my-plugin-repo';
      const expectedRepoAddress = await getExpectedRepoAddress(
        pluginRepoFactory.address
      );
      const PluginRepo = new PluginRepo__factory(signers[0]);
      const pluginRepo = PluginRepo.attach(expectedRepoAddress);

      let tx = await pluginRepoFactory.createPluginRepo(
        pluginRepoSubdomain,
        ownerAddress
      );

      await expect(tx)
        .to.emit(pluginRepoRegistry, EVENTS.PluginRepoRegistered)
        .withArgs(pluginRepoSubdomain, expectedRepoAddress)
        .to.not.emit(pluginRepo, EVENTS.VersionCreated)
        .to.not.emit(pluginRepo, EVENTS.ReleaseMetadataUpdated);

      const permissions = [
        ethers.utils.id('MAINTAINER_PERMISSION'),
        ethers.utils.id('UPGRADE_REPO_PERMISSION'),
        ethers.utils.id('ROOT_PERMISSION'),
      ];

      for (let i = 0; i < permissions.length; i++) {
        expect(
          await pluginRepo.isGranted(
            pluginRepo.address,
            ownerAddress,
            permissions[i],
            '0x'
          )
        ).to.be.true;

        expect(
          await pluginRepo.isGranted(
            pluginRepo.address,
            pluginRepoFactory.address,
            permissions[i],
            '0x'
          )
        ).to.be.false;
      }
    });
  });

  describe('CreatePluginRepoWithFirstVersion', async () => {
    it('fail to create new pluginRepo with no PLUGIN_REGISTER_PERMISSION', async () => {
      await managingDao.revoke(
        pluginRepoRegistry.address,
        pluginRepoFactory.address,
        PLUGIN_REGISTRY_PERMISSIONS.REGISTER_PLUGIN_REPO_PERMISSION_ID
      );

      await expect(
        pluginRepoFactory.createPluginRepoWithFirstVersion(
          'my-pluginRepo',
          ownerAddress,
          ownerAddress,
          '0x',
          '0x'
        )
      )
        .to.be.revertedWithCustomError(pluginRepoRegistry, 'DaoUnauthorized')
        .withArgs(
          managingDao.address,
          pluginRepoRegistry.address,
          pluginRepoFactory.address,
          PLUGIN_REGISTRY_PERMISSIONS.REGISTER_PLUGIN_REPO_PERMISSION_ID
        );
    });

    it('creates new pluginRepo with correct permissions', async () => {
      const pluginRepoSubdomain = 'my-plugin-repo';
      const pluginSetupMock = await deployMockPluginSetup(signers[0]);
      const expectedRepoAddress = await getExpectedRepoAddress(
        pluginRepoFactory.address
      );
      const PluginRepo = new PluginRepo__factory(signers[0]);
      const pluginRepo = PluginRepo.attach(expectedRepoAddress);

      let tx = await pluginRepoFactory.createPluginRepoWithFirstVersion(
        pluginRepoSubdomain,
        pluginSetupMock.address,
        ownerAddress,
        '0x11',
        '0x11'
      );

      await expect(tx)
        .to.emit(pluginRepoRegistry, EVENTS.PluginRepoRegistered)
        .withArgs(pluginRepoSubdomain, expectedRepoAddress)
        .to.emit(pluginRepo, EVENTS.VersionCreated)
        .withArgs(1, 1, pluginSetupMock.address, '0x11')
        .to.emit(pluginRepo, EVENTS.ReleaseMetadataUpdated)
        .withArgs(1, '0x11');

      const permissions = [
        ethers.utils.id('MAINTAINER_PERMISSION'),
        ethers.utils.id('UPGRADE_REPO_PERMISSION'),
        ethers.utils.id('ROOT_PERMISSION'),
      ];

      for (let i = 0; i < permissions.length; i++) {
        expect(
          await pluginRepo.isGranted(
            pluginRepo.address,
            ownerAddress,
            permissions[i],
            '0x'
          )
        ).to.be.true;

        expect(
          await pluginRepo.isGranted(
            pluginRepo.address,
            pluginRepoFactory.address,
            permissions[i],
            '0x'
          )
        ).to.be.false;
      }
    });
  });
});
