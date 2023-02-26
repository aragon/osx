import {expect} from 'chai';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';

import {
  deployMockPluginSetup,
  deployPluginRepoRegistry,
} from '../../test-utils/repo';
import {deployENSSubdomainRegistrar} from '../../test-utils/ens';
import {deployNewDAO} from '../../test-utils/dao';

import {
  PluginRepoRegistry,
  DAO,
  PluginRepoFactory,
  PluginRepoFactory__factory,
} from '../../../typechain';
import {getMergedABI} from '../../../utils/abi';

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
  VersionCreated: 'VersionCreated',
  ReleaseMetadataUpdated: 'ReleaseMetadataUpdated',
};

const REGISTER_PLUGIN_REPO_PERMISSION_ID = ethers.utils.id(
  'REGISTER_PLUGIN_REPO_PERMISSION'
);

const REGISTER_ENS_SUBDOMAIN_PERMISSION_ID = ethers.utils.id(
  'REGISTER_ENS_SUBDOMAIN_PERMISSION'
);

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

  let mergedABI: any;
  let pluginRepoFactoryBytecode: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const {abi, bytecode} = await getMergedABI(
      // @ts-ignore
      hre,
      'PluginRepoFactory',
      ['PluginRepoRegistry']
    );

    mergedABI = abi;
    pluginRepoFactoryBytecode = bytecode;
  });

  beforeEach(async function () {
    // DAO
    managingDao = await deployNewDAO(ownerAddress);

    // ENS subdomain Registry
    const ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
      signers[0],
      managingDao,
      'dao.eth'
    );

    // deploy and initialize PluginRepoRegistry
    pluginRepoRegistry = await deployPluginRepoRegistry(
      managingDao,
      ensSubdomainRegistrar
    );

    // deploy PluginRepoFactory
    const PluginRepoFactory = new ethers.ContractFactory(
      mergedABI,
      pluginRepoFactoryBytecode,
      signers[0]
    ) as PluginRepoFactory__factory;

    pluginRepoFactory = await PluginRepoFactory.deploy(
      pluginRepoRegistry.address
    );

    // grant REGISTER_PERMISSION_ID to pluginRepoFactory
    await managingDao.grant(
      pluginRepoRegistry.address,
      pluginRepoFactory.address,
      REGISTER_PLUGIN_REPO_PERMISSION_ID
    );

    // grant REGISTER_PERMISSION_ID to pluginRepoFactory
    await managingDao.grant(
      ensSubdomainRegistrar.address,
      pluginRepoRegistry.address,
      REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
    );
  });

  describe('CreatePluginRepo', async () => {
    it('fail to create new pluginRepo with no PLUGIN_REGISTER_PERMISSION', async () => {
      await managingDao.revoke(
        pluginRepoRegistry.address,
        pluginRepoFactory.address,
        REGISTER_PLUGIN_REPO_PERMISSION_ID
      );

      await expect(
        pluginRepoFactory.createPluginRepo('my-pluginRepo', ownerAddress)
      )
        .to.be.revertedWithCustomError(pluginRepoRegistry, 'DaoUnauthorized')
        .withArgs(
          managingDao.address,
          pluginRepoRegistry.address,
          pluginRepoFactory.address,
          REGISTER_PLUGIN_REPO_PERMISSION_ID
        );
    });

    it('fail to create new pluginRepo with empty subdomain', async () => {
      const pluginRepoSubdomain = '';

      await expect(
        pluginRepoFactory.createPluginRepo(pluginRepoSubdomain, ownerAddress)
      ).to.be.revertedWithCustomError(
        pluginRepoRegistry,
        'EmptyPluginRepoSubdomain'
      );
    });

    it('creates new pluginRepo and sets up correct permissions', async () => {
      const pluginRepoSubdomain = 'my-plugin-repo';
      const expectedRepoAddress = await getExpectedRepoAddress(
        pluginRepoFactory.address
      );
      const PluginRepo = await ethers.getContractFactory('PluginRepo');
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
        REGISTER_PLUGIN_REPO_PERMISSION_ID
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
          REGISTER_PLUGIN_REPO_PERMISSION_ID
        );
    });

    it('fail to create new pluginRepo with empty subdomain', async () => {
      const pluginRepoSubdomain = '';

      await expect(
        pluginRepoFactory.createPluginRepoWithFirstVersion(
          pluginRepoSubdomain,
          ownerAddress,
          ownerAddress,
          '0x',
          '0x'
        )
      ).to.be.revertedWithCustomError(
        pluginRepoRegistry,
        'EmptyPluginRepoSubdomain'
      );
    });

    it('creates new pluginRepo with correct permissions', async () => {
      const pluginRepoSubdomain = 'my-plugin-repo';
      const pluginSetupMock = await deployMockPluginSetup();
      const expectedRepoAddress = await getExpectedRepoAddress(
        pluginRepoFactory.address
      );
      const PluginRepo = await ethers.getContractFactory('PluginRepo');
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
