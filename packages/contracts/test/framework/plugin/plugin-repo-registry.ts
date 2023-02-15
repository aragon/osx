import {expect} from 'chai';
import {ethers} from 'hardhat';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {
  DAO,
  PluginRepo,
  ENSSubdomainRegistrar,
  PluginRepoRegistry,
} from '../../../typechain';
import {deployNewDAO} from '../../test-utils/dao';
import {deployNewPluginRepo} from '../../test-utils/repo';
import {deployENSSubdomainRegistrar} from '../../test-utils/ens';
import {ensDomainHash} from '../../../utils/ens';
import {deployWithProxy} from '../../test-utils/proxy';
import {shouldUpgradeCorrectly} from '../../test-utils/uups-upgradeable';
import {UPGRADE_PERMISSIONS} from '../../test-utils/permissions';

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

  const REGISTER_PLUGIN_REPO_PERMISSION_ID = ethers.utils.id(
    'REGISTER_PLUGIN_REPO_PERMISSION'
  );

  const REGISTER_ENS_SUBDOMAIN_PERMISSION_ID = ethers.utils.id(
    'REGISTER_ENS_SUBDOMAIN_PERMISSION'
  );

  const topLevelDomain = 'dao.eth';
  const pluginRepoSubdomain = 'my-plugin-repo';

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    // DAO
    managingDAO = await deployNewDAO(ownerAddress);

    // ENS subdomain Registry
    ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
      signers[0],
      managingDAO,
      topLevelDomain
    );

    // deploy and initialize PluginRepoRegistry
    const PluginRepoRegistry = await ethers.getContractFactory(
      'PluginRepoRegistry'
    );
    pluginRepoRegistry = await deployWithProxy(PluginRepoRegistry);

    await pluginRepoRegistry.initialize(
      managingDAO.address,
      ensSubdomainRegistrar.address
    );

    // deploy a pluginRepo and initialize
    pluginRepo = await deployNewPluginRepo(ownerAddress);

    // grant REGISTER_PERMISSION_ID to registrer
    managingDAO.grant(
      pluginRepoRegistry.address,
      ownerAddress,
      REGISTER_PLUGIN_REPO_PERMISSION_ID
    );

    // grant REGISTER_PERMISSION_ID to registrer
    managingDAO.grant(
      ensSubdomainRegistrar.address,
      pluginRepoRegistry.address,
      REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
    );

    this.upgrade = {
      contract: pluginRepoRegistry,
      dao: managingDAO,
      user: signers[8],
    };
  });

  shouldUpgradeCorrectly(
    UPGRADE_PERMISSIONS.UPGRADE_REGISTRY_PERMISSION_ID,
    'DaoUnauthorized'
  );

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
      REGISTER_PLUGIN_REPO_PERMISSION_ID
    );

    // deploy a pluginRepo
    const newPluginRepo = await deployNewPluginRepo(ownerAddress);

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
        REGISTER_PLUGIN_REPO_PERMISSION_ID
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
        const newPluginRepo = await deployNewPluginRepo(ownerAddress);

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
    });

    it('should validate the passed subdomain correctly (> 32 bytes long subdomain)', async () => {
      const baseSubdomain =
        'this-is-my-super-looooooooooooooooooooooooooong-valid-subdomain';

      // loop through the ascii table
      for (let i = 0; i < 127; i++) {
        // deploy a pluginRepo and initialize
        const newPluginRepo = await deployNewPluginRepo(ownerAddress);

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
    });
  });
});
