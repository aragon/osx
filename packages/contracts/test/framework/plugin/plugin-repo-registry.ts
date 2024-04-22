import {
  DAO,
  PluginRepo,
  ENSSubdomainRegistrar,
  PluginRepoRegistry,
  PluginRepoRegistry__factory,
} from '../../../typechain';
import {PluginRepoRegistry__factory as PluginRepoRegistry_V1_0_0__factory} from '../../../typechain/@aragon/osx-v1.0.1/framework/plugin/repo/PluginRepoRegistry.sol';
import {PluginRepoRegistry__factory as PluginRepoRegistry_V1_3_0__factory} from '../../../typechain/@aragon/osx-v1.3.0/framework/plugin/repo/PluginRepoRegistry.sol';
import {ensDomainHash} from '../../../utils/ens';
import {deployNewDAO} from '../../test-utils/dao';
import {deployENSSubdomainRegistrar} from '../../test-utils/ens';
import {osxContractsVersion} from '../../test-utils/protocol-version';
import {deployWithProxy} from '../../test-utils/proxy';
import {deployNewPluginRepo} from '../../test-utils/repo';
import {
  deployAndUpgradeFromToCheck,
  deployAndUpgradeSelfCheck,
} from '../../test-utils/uups-upgradeable';
import {
  PLUGIN_REGISTRY_PERMISSIONS,
  getProtocolVersion,
} from '@aragon/osx-commons-sdk';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ContractFactory} from 'ethers';
import {ethers} from 'hardhat';

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
};

describe('PluginRepoRegistry', function () {
  let signers: SignerWithAddress[];
  let ensSubdomainRegistrar: ENSSubdomainRegistrar;
  let pluginRepoRegistry: PluginRepoRegistry;
  let ownerAddress: string;
  let managingDAO: DAO;
  let pluginRepo: PluginRepo;

  const topLevelDomain = 'dao.eth';
  const pluginRepoSubdomain = 'my-plugin-repo';

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    // DAO
    managingDAO = await deployNewDAO(signers[0]);
  });

  beforeEach(async function () {
    // ENS subdomain Registry
    ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
      signers[0],
      managingDAO,
      topLevelDomain
    );

    // deploy and initialize PluginRepoRegistry
    const PluginRepoRegistry = new PluginRepoRegistry__factory(signers[0]);
    pluginRepoRegistry = await deployWithProxy<PluginRepoRegistry>(
      PluginRepoRegistry
    );

    await pluginRepoRegistry.initialize(
      managingDAO.address,
      ensSubdomainRegistrar.address
    );

    // deploy a pluginRepo and initialize
    pluginRepo = await deployNewPluginRepo(signers[0]);

    // grant REGISTER_PLUGIN_REPO_PERMISSION_ID to ownerAddress
    await managingDAO.grant(
      pluginRepoRegistry.address,
      ownerAddress,
      PLUGIN_REGISTRY_PERMISSIONS.REGISTER_PLUGIN_REPO_PERMISSION_ID
    );

    // grant REGISTER_ENS_SUBDOMAIN_PERMISSION_ID to pluginRepoRegistry
    await managingDAO.grant(
      ensSubdomainRegistrar.address,
      pluginRepoRegistry.address,
      PLUGIN_REGISTRY_PERMISSIONS.ENS_REGISTRAR_PERMISSIONS
        .REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
    );
  });

  it('successfully sets subdomainregistrar', async () => {
    expect(await pluginRepoRegistry.subdomainRegistrar()).to.equal(
      ensSubdomainRegistrar.address
    );
  });

  it('Should register a new pluginRepo successfully', async function () {
    await expect(
      await pluginRepoRegistry.registerPluginRepo(
        pluginRepoSubdomain,
        pluginRepo.address
      )
    )
      .to.emit(pluginRepoRegistry, EVENTS.PluginRepoRegistered)
      .withArgs(pluginRepoSubdomain, pluginRepo.address);

    expect(await pluginRepoRegistry.entries(pluginRepo.address)).to.equal(true);
  });

  it('fail to register if the sender lacks the required role', async () => {
    // Register a plugin successfully
    await pluginRepoRegistry.registerPluginRepo(
      pluginRepoSubdomain,
      pluginRepo.address
    );

    // Revoke the permission
    await managingDAO.revoke(
      pluginRepoRegistry.address,
      ownerAddress,
      PLUGIN_REGISTRY_PERMISSIONS.REGISTER_PLUGIN_REPO_PERMISSION_ID
    );

    // deploy a pluginRepo
    const newPluginRepo = await deployNewPluginRepo(signers[0]);

    await expect(
      pluginRepoRegistry.registerPluginRepo(
        pluginRepoSubdomain,
        newPluginRepo.address
      )
    )
      .to.be.revertedWithCustomError(pluginRepoRegistry, 'DaoUnauthorized')
      .withArgs(
        managingDAO.address,
        pluginRepoRegistry.address,
        ownerAddress,
        PLUGIN_REGISTRY_PERMISSIONS.REGISTER_PLUGIN_REPO_PERMISSION_ID
      );
  });

  it('reverts the registration if the plugin repo already exists in the registry', async function () {
    await pluginRepoRegistry.registerPluginRepo('repo-1', pluginRepo.address);

    await expect(
      pluginRepoRegistry.registerPluginRepo('repo-2', pluginRepo.address)
    )
      .to.be.revertedWithCustomError(
        pluginRepoRegistry,
        'ContractAlreadyRegistered'
      )
      .withArgs(pluginRepo.address);
  });

  it("reverts the registration if the plugin repo's ENS subdomain is already taken", async function () {
    await pluginRepoRegistry.registerPluginRepo(
      pluginRepoSubdomain,
      pluginRepo.address
    );

    const pluginRepoSubdomainDomainHash = ensDomainHash(
      pluginRepoSubdomain + '.' + topLevelDomain
    );

    await expect(
      pluginRepoRegistry.registerPluginRepo(
        pluginRepoSubdomain,
        pluginRepo.address
      )
    )
      .to.be.revertedWithCustomError(ensSubdomainRegistrar, 'AlreadyRegistered')
      .withArgs(pluginRepoSubdomainDomainHash, ensSubdomainRegistrar.address);
  });

  // without mocking we have to repeat the tests here to make sure the validation is correct
  describe('subdomain validation', () => {
    it('should validate the passed subdomain correctly (< 32 bytes long subdomain)', async () => {
      const baseSubdomain = 'this-is-my-super-valid-subdomain';

      // loop through the ascii table
      for (let i = 0; i < 127; i++) {
        // deploy a pluginRepo and initialize
        const newPluginRepo = await deployNewPluginRepo(signers[0]);

        // replace the 10th char in the baseSubdomain
        const subdomainName =
          baseSubdomain.substring(0, 10) +
          String.fromCharCode(i) +
          baseSubdomain.substring(10 + 1);

        // test success if it is a valid char [0-9a-z\-]
        if ((i > 47 && i < 58) || (i > 96 && i < 123) || i === 45) {
          await expect(
            pluginRepoRegistry.registerPluginRepo(
              subdomainName,
              newPluginRepo.address
            )
          ).to.emit(pluginRepoRegistry, EVENTS.PluginRepoRegistered);
          continue;
        }

        await expect(
          pluginRepoRegistry.registerPluginRepo(
            subdomainName,
            newPluginRepo.address
          )
        )
          .to.be.revertedWithCustomError(
            pluginRepoRegistry,
            'InvalidPluginSubdomain'
          )
          .withArgs(subdomainName);
      }
    }).timeout(120000);

    it('should validate the passed subdomain correctly (> 32 bytes long subdomain)', async () => {
      const baseSubdomain =
        'this-is-my-super-looooooooooooooooooooooooooong-valid-subdomain';

      // loop through the ascii table
      for (let i = 0; i < 127; i++) {
        // deploy a pluginRepo and initialize
        const newPluginRepo = await deployNewPluginRepo(signers[0]);

        // replace the 40th char in the baseSubdomain
        const subdomainName =
          baseSubdomain.substring(0, 40) +
          String.fromCharCode(i) +
          baseSubdomain.substring(40 + 1);

        // test success if it is a valid char [0-9a-z\-]
        if ((i > 47 && i < 58) || (i > 96 && i < 123) || i === 45) {
          await expect(
            pluginRepoRegistry.registerPluginRepo(
              subdomainName,
              newPluginRepo.address
            )
          ).to.emit(pluginRepoRegistry, EVENTS.PluginRepoRegistered);
          continue;
        }

        await expect(
          pluginRepoRegistry.registerPluginRepo(
            subdomainName,
            newPluginRepo.address
          )
        )
          .to.be.revertedWithCustomError(
            pluginRepoRegistry,
            'InvalidPluginSubdomain'
          )
          .withArgs(subdomainName);
      }
    }).timeout(120000);
  });

  describe('Protocol version', async () => {
    it('returns the current protocol version', async () => {
      expect(await pluginRepoRegistry.protocolVersion()).to.deep.equal(
        osxContractsVersion()
      );
    });
  });

  describe('Upgrades', () => {
    let legacyContractFactory: ContractFactory;
    let currentContractFactory: ContractFactory;
    let initArgs: any;

    before(() => {
      currentContractFactory = new PluginRepoRegistry__factory(signers[0]);
    });

    beforeEach(() => {
      initArgs = {
        dao: managingDAO.address,
        ensSubdomainRegistrar: ensSubdomainRegistrar.address,
      };
    });

    it('upgrades to a new implementation', async () => {
      await deployAndUpgradeSelfCheck(
        signers[0],
        signers[1],
        initArgs,
        'initialize',
        currentContractFactory,
        PLUGIN_REGISTRY_PERMISSIONS.UPGRADE_REGISTRY_PERMISSION_ID,
        managingDAO
      );
    });

    it('upgrades from v1.0.0', async () => {
      legacyContractFactory = new PluginRepoRegistry_V1_0_0__factory(
        signers[0]
      );

      const {fromImplementation, toImplementation} =
        await deployAndUpgradeFromToCheck(
          signers[0],
          signers[1],
          initArgs,
          'initialize',
          legacyContractFactory,
          currentContractFactory,
          PLUGIN_REGISTRY_PERMISSIONS.UPGRADE_REGISTRY_PERMISSION_ID,
          managingDAO
        );
      expect(toImplementation).to.not.equal(fromImplementation);

      const fromProtocolVersion = await getProtocolVersion(
        ethers.provider.connection.url,
        legacyContractFactory.attach(fromImplementation).address
      );
      const toProtocolVersion = await getProtocolVersion(
        ethers.provider.connection.url,
        currentContractFactory.attach(toImplementation).address
      );

      expect(fromProtocolVersion).to.not.deep.equal(toProtocolVersion);
      expect(fromProtocolVersion).to.deep.equal([1, 0, 0]);
      expect(toProtocolVersion).to.deep.equal(osxContractsVersion());
    });

    it('from v1.3.0', async () => {
      legacyContractFactory = new PluginRepoRegistry_V1_3_0__factory(
        signers[0]
      );

      const {fromImplementation, toImplementation} =
        await deployAndUpgradeFromToCheck(
          signers[0],
          signers[1],
          initArgs,
          'initialize',
          legacyContractFactory,
          currentContractFactory,
          PLUGIN_REGISTRY_PERMISSIONS.UPGRADE_REGISTRY_PERMISSION_ID,
          managingDAO
        );
      expect(toImplementation).to.not.equal(fromImplementation);

      const fromProtocolVersion = await getProtocolVersion(
        ethers.provider.connection.url,
        legacyContractFactory.attach(fromImplementation).address
      );
      const toProtocolVersion = await getProtocolVersion(
        ethers.provider.connection.url,
        currentContractFactory.attach(toImplementation).address
      );

      expect(fromProtocolVersion).to.not.deep.equal(toProtocolVersion);
      expect(fromProtocolVersion).to.deep.equal([1, 0, 0]);
      expect(toProtocolVersion).to.deep.equal(osxContractsVersion());
    });
  });
});
