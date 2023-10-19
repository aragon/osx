import {
  DAO,
  DAORegistry,
  DAORegistry__factory,
  DAO__factory,
  ENSSubdomainRegistrar,
  ENSSubdomainRegistrar__factory,
  Multisig,
  Multisig__factory,
  PluginRepo,
  PluginRepoRegistry,
  PluginRepoRegistry__factory,
  PluginRepo__factory,
} from '../../typechain';
import {initializeDeploymentFixture} from '../test-utils/fixture';
import {
  EXECUTE_PERMISSION_ID,
  MAINTAINER_PERMISSION_ID,
  ROOT_PERMISSION_ID,
  UPGRADE_PERMISSIONS,
} from '../test-utils/permissions';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import hre, {ethers, deployments} from 'hardhat';
import {Deployment} from 'hardhat-deploy/dist/types';

async function deployAll() {
  await initializeDeploymentFixture('New');
}

describe('Managing DAO', function () {
  let deployer: SignerWithAddress;
  let approvers: SignerWithAddress[];
  let minApprovals: number;
  let listedOnly: boolean;

  let managingDaoDeployment: Deployment;
  let managingDao: DAO;
  let multisig: Multisig;
  let daoRegistryDeployment: Deployment;
  let daoRegistry: DAORegistry;
  let pluginRepoRegistryDeployment: Deployment;
  let pluginRepoRegistry: PluginRepoRegistry;
  let ensSubdomainRegistrars: {
    pluginRegistrar: ENSSubdomainRegistrar;
    daoRegistrar: ENSSubdomainRegistrar;
  };

  let pluginsRepos: {
    tokenVoting: PluginRepo;
    addresslistVoting: PluginRepo;
    admin: PluginRepo;
    multisig: PluginRepo;
  };

  before(async () => {
    [deployer] = await ethers.getSigners();

    // deployment should be empty
    expect(await deployments.all()).to.be.empty;

    // deploy framework
    await deployAll();

    if (
      process.env.MANAGINGDAO_MULTISIG_APPROVERS === undefined ||
      process.env.MANAGINGDAO_MULTISIG_MINAPPROVALS === undefined ||
      process.env.MANAGINGDAO_MULTISIG_LISTEDONLY === undefined
    ) {
      throw new Error('Managing DAO Multisig settings not set in .env');
    }

    listedOnly = process.env.MANAGINGDAO_MULTISIG_LISTEDONLY === 'true';

    minApprovals = parseInt(process.env.MANAGINGDAO_MULTISIG_MINAPPROVALS);

    // Get approver addresses
    const approverAddresses =
      process.env.MANAGINGDAO_MULTISIG_APPROVERS.split(',');

    // Impersonate them as signers
    approvers = await Promise.all(
      approverAddresses.map(async approverAddr =>
        ethers.getImpersonatedSigner(approverAddr)
      )
    );

    // Fund their wallets
    await Promise.all(
      approvers.map(async approver =>
        deployer.sendTransaction({
          to: approver.address,
          value: ethers.utils.parseEther('1'),
        })
      )
    );

    // ManagingDAO
    managingDaoDeployment = await deployments.get('DAO');
    managingDao = DAO__factory.connect(managingDaoDeployment.address, deployer);

    // DAORegistry
    daoRegistryDeployment = await deployments.get('DAORegistry');
    daoRegistry = DAORegistry__factory.connect(
      daoRegistryDeployment.address,
      deployer
    );

    // PluginRepoRegistry
    pluginRepoRegistryDeployment = await deployments.get('PluginRepoRegistry');
    pluginRepoRegistry = PluginRepoRegistry__factory.connect(
      pluginRepoRegistryDeployment.address,
      deployer
    );

    // ENSSubdomainRegistrar
    ensSubdomainRegistrars = {
      daoRegistrar: ENSSubdomainRegistrar__factory.connect(
        (await deployments.get('DAO_ENSSubdomainRegistrar')).address,
        deployer
      ),
      pluginRegistrar: ENSSubdomainRegistrar__factory.connect(
        (await deployments.get('Plugin_ENSSubdomainRegistrar')).address,
        deployer
      ),
    };

    pluginsRepos = {
      tokenVoting: PluginRepo__factory.connect(
        hre.aragonPluginRepos['token-voting'],
        deployer
      ),
      addresslistVoting: PluginRepo__factory.connect(
        hre.aragonPluginRepos['address-list-voting'],
        deployer
      ),
      admin: PluginRepo__factory.connect(
        hre.aragonPluginRepos['admin'],
        deployer
      ),
      multisig: PluginRepo__factory.connect(
        hre.aragonPluginRepos['multisig'],
        deployer
      ),
    };

    multisig = Multisig__factory.connect(
      hre.managingDAOMultisigPluginAddress,
      deployer
    );
  });

  it('has deployments', async function () {
    expect(await deployments.all()).to.not.be.empty;
  });

  it('has the `ROOT_PERMISSION_ID` permission on itself', async function () {
    expect(
      await managingDao.hasPermission(
        managingDao.address,
        managingDao.address,
        ROOT_PERMISSION_ID,
        []
      )
    ).to.be.true;
  });

  describe('Associated Multisig Plugin', function () {
    it('has the `EXECUTE_PERMISSION_ID` permission on the DAO', async function () {
      expect(
        await managingDao.hasPermission(
          managingDao.address,
          multisig.address,
          EXECUTE_PERMISSION_ID,
          []
        )
      ).to.be.true;
    });

    it('has the correct signers', async function () {
      expect(await multisig.addresslistLength()).to.equal(approvers.length);

      const results = await Promise.all(
        approvers.map(async approver => multisig.isListed(approver.address))
      );
      results.forEach(res => expect(res).to.be.true);
    });

    it('has the correct settings', async function () {
      const settings = await multisig.multisigSettings();
      expect(settings.onlyListed).to.equal(listedOnly);
      expect(settings.minApprovals).to.eq(minApprovals);
    });
  });

  describe('permissions', function () {
    it('has permission to upgrade itself', async function () {
      expect(
        await managingDao.hasPermission(
          managingDao.address,
          managingDao.address,
          UPGRADE_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID,
          []
        )
      ).to.be.true;
    });

    it('has permission to upgrade DaoRegistry', async function () {
      expect(
        await managingDao.hasPermission(
          daoRegistry.address,
          managingDao.address,
          UPGRADE_PERMISSIONS.UPGRADE_REGISTRY_PERMISSION_ID,
          []
        )
      ).to.be.true;
    });

    it('has permission to upgrade PluginRepoRegistry', async function () {
      expect(
        await managingDao.hasPermission(
          pluginRepoRegistry.address,
          managingDao.address,
          UPGRADE_PERMISSIONS.UPGRADE_REGISTRY_PERMISSION_ID,
          []
        )
      ).to.be.true;
    });

    it('has permission to upgrade DAO_ENSSubdomainRegistrar', async function () {
      expect(
        await managingDao.hasPermission(
          ensSubdomainRegistrars.daoRegistrar.address,
          managingDao.address,
          UPGRADE_PERMISSIONS.UPGRADE_REGISTRAR_PERMISSION_ID,
          []
        )
      ).to.be.true;
    });
    it('has permission to upgrade Plugin_ENSSubdomainRegistrar', async function () {
      expect(
        await managingDao.hasPermission(
          ensSubdomainRegistrars.pluginRegistrar.address,
          managingDao.address,
          UPGRADE_PERMISSIONS.UPGRADE_REGISTRAR_PERMISSION_ID,
          []
        )
      ).to.be.true;
    });

    context('Multisig Repo', async function () {
      it('has permission to upgrade the TokenVoting PluginRepo', async function () {
        expect(
          await pluginsRepos.tokenVoting.isGranted(
            pluginsRepos.tokenVoting.address,
            managingDao.address,
            UPGRADE_PERMISSIONS.UPGRADE_REPO_PERMISSION_ID,
            []
          )
        ).to.be.true;
      });

      it('has permission to maintain the repo', async function () {
        expect(
          await pluginsRepos.tokenVoting.isGranted(
            pluginsRepos.tokenVoting.address,
            managingDao.address,
            MAINTAINER_PERMISSION_ID,
            []
          )
        ).to.be.true;
      });
    });

    context('AddresslistVoting Repo', async function () {
      it('has permission to upgrade the repo', async function () {
        expect(
          await pluginsRepos.addresslistVoting.isGranted(
            pluginsRepos.addresslistVoting.address,
            managingDao.address,
            UPGRADE_PERMISSIONS.UPGRADE_REPO_PERMISSION_ID,
            []
          )
        ).to.be.true;
      });
      it('has permission to maintain the repo', async function () {
        expect(
          await pluginsRepos.addresslistVoting.isGranted(
            pluginsRepos.addresslistVoting.address,
            managingDao.address,
            MAINTAINER_PERMISSION_ID,
            []
          )
        ).to.be.true;
      });
    });

    context('Admin Repo', async function () {
      it('has permission to upgrade the repo', async function () {
        expect(
          await pluginsRepos.admin.isGranted(
            pluginsRepos.admin.address,
            managingDao.address,
            UPGRADE_PERMISSIONS.UPGRADE_REPO_PERMISSION_ID,
            []
          )
        ).to.be.true;
      });
      it('has permission to maintain the repo', async function () {
        expect(
          await pluginsRepos.admin.isGranted(
            pluginsRepos.admin.address,
            managingDao.address,
            MAINTAINER_PERMISSION_ID,
            []
          )
        ).to.be.true;
      });
    });

    context('Multisig Repo', async function () {
      it('has permission to upgrade the repo', async function () {
        expect(
          await pluginsRepos.multisig.isGranted(
            pluginsRepos.multisig.address,
            managingDao.address,
            UPGRADE_PERMISSIONS.UPGRADE_REPO_PERMISSION_ID,
            []
          )
        ).to.be.true;
      });

      it('has permission to maintain the repo', async function () {
        expect(
          await pluginsRepos.multisig.isGranted(
            pluginsRepos.multisig.address,
            managingDao.address,
            MAINTAINER_PERMISSION_ID,
            []
          )
        ).to.be.true;
      });
    });
  });
});
