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
import {
  managementDaoMultisigApproversEnv,
  managementDaoMultisigListedOnlyEnv,
  managementDaoMultisigMinApprovalsEnv,
} from '../../utils/environment';
import {initializeDeploymentFixture} from '../test-utils/fixture';
import {
  DAO_PERMISSIONS,
  DAO_REGISTRY_PERMISSIONS,
  ENS_REGISTRAR_PERMISSIONS,
  PLUGIN_REGISTRY_PERMISSIONS,
  PLUGIN_REPO_PERMISSIONS,
} from '@aragon/osx-commons-sdk';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import hre, {ethers, deployments} from 'hardhat';
import {Deployment} from 'hardhat-deploy/dist/types';

async function deployAll() {
  await initializeDeploymentFixture('New');
}

describe('Management DAO', function () {
  let deployer: SignerWithAddress;
  let approvers: SignerWithAddress[];
  let minApprovals: number;
  let listedOnly: boolean;

  let managementDaoDeployment: Deployment;
  let managementDao: DAO;
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

    const approversEnv = managementDaoMultisigApproversEnv(hre.network);

    minApprovals = parseInt(managementDaoMultisigMinApprovalsEnv(hre.network));
    listedOnly = managementDaoMultisigListedOnlyEnv(hre.network) === 'true';

    if (!approversEnv || !minApprovals || !listedOnly) {
      throw new Error(
        'Management DAO Multisig settings not set in .env or fallbacks'
      );
    }

    // Get approver addresses
    const approverAddresses = approversEnv.split(',');

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

    // ManagementDAO
    managementDaoDeployment = await deployments.get('ManagementDAOProxy');
    managementDao = DAO__factory.connect(
      managementDaoDeployment.address,
      deployer
    );

    // DAORegistry
    daoRegistryDeployment = await deployments.get('DAORegistryProxy');
    daoRegistry = DAORegistry__factory.connect(
      daoRegistryDeployment.address,
      deployer
    );

    // PluginRepoRegistry
    pluginRepoRegistryDeployment = await deployments.get(
      'PluginRepoRegistryProxy'
    );
    pluginRepoRegistry = PluginRepoRegistry__factory.connect(
      pluginRepoRegistryDeployment.address,
      deployer
    );

    // ENSSubdomainRegistrar
    ensSubdomainRegistrars = {
      daoRegistrar: ENSSubdomainRegistrar__factory.connect(
        (await deployments.get('DAOENSSubdomainRegistrarProxy')).address,
        deployer
      ),
      pluginRegistrar: ENSSubdomainRegistrar__factory.connect(
        (await deployments.get('PluginENSSubdomainRegistrarProxy')).address,
        deployer
      ),
    };

    pluginsRepos = {
      tokenVoting: PluginRepo__factory.connect(
        hre.aragonPluginRepos.TokenVotingRepoProxy,
        deployer
      ),
      addresslistVoting: PluginRepo__factory.connect(
        hre.aragonPluginRepos.AddresslistVotingRepoProxy,
        deployer
      ),
      admin: PluginRepo__factory.connect(
        hre.aragonPluginRepos.AdminRepoProxy,
        deployer
      ),
      multisig: PluginRepo__factory.connect(
        hre.aragonPluginRepos.MultisigRepoProxy,
        deployer
      ),
    };

    multisig = Multisig__factory.connect(
      hre.managementDAOMultisigPluginAddress,
      deployer
    );
  });

  it('has deployments', async function () {
    expect(await deployments.all()).to.not.be.empty;
  });

  it('has the `ROOT_PERMISSION_ID` permission on itself', async function () {
    expect(
      await managementDao.hasPermission(
        managementDao.address,
        managementDao.address,
        DAO_PERMISSIONS.ROOT_PERMISSION_ID,
        []
      )
    ).to.be.true;
  });

  describe('Associated Multisig Plugin', function () {
    it('has the `EXECUTE_PERMISSION_ID` permission on the DAO', async function () {
      expect(
        await managementDao.hasPermission(
          managementDao.address,
          multisig.address,
          DAO_PERMISSIONS.EXECUTE_PERMISSION_ID,
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
        await managementDao.hasPermission(
          managementDao.address,
          managementDao.address,
          DAO_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID,
          []
        )
      ).to.be.true;
    });

    it('has permission to upgrade DaoRegistry', async function () {
      expect(
        await managementDao.hasPermission(
          daoRegistry.address,
          managementDao.address,
          DAO_REGISTRY_PERMISSIONS.UPGRADE_REGISTRY_PERMISSION_ID,
          []
        )
      ).to.be.true;
    });

    it('has permission to upgrade PluginRepoRegistry', async function () {
      expect(
        await managementDao.hasPermission(
          pluginRepoRegistry.address,
          managementDao.address,
          PLUGIN_REGISTRY_PERMISSIONS.UPGRADE_REGISTRY_PERMISSION_ID,
          []
        )
      ).to.be.true;
    });

    it('has permission to upgrade DAO_ENSSubdomainRegistrar', async function () {
      expect(
        await managementDao.hasPermission(
          ensSubdomainRegistrars.daoRegistrar.address,
          managementDao.address,
          ENS_REGISTRAR_PERMISSIONS.UPGRADE_REGISTRAR_PERMISSION_ID,
          []
        )
      ).to.be.true;
    });
    it('has permission to upgrade Plugin_ENSSubdomainRegistrar', async function () {
      expect(
        await managementDao.hasPermission(
          ensSubdomainRegistrars.pluginRegistrar.address,
          managementDao.address,
          ENS_REGISTRAR_PERMISSIONS.UPGRADE_REGISTRAR_PERMISSION_ID,
          []
        )
      ).to.be.true;
    });

    context('Multisig Repo', async function () {
      it('has permission to upgrade the TokenVoting PluginRepo', async function () {
        expect(
          await pluginsRepos.tokenVoting.isGranted(
            pluginsRepos.tokenVoting.address,
            managementDao.address,
            PLUGIN_REPO_PERMISSIONS.UPGRADE_REPO_PERMISSION_ID,
            []
          )
        ).to.be.true;
      });

      it('has permission to maintain the repo', async function () {
        expect(
          await pluginsRepos.tokenVoting.isGranted(
            pluginsRepos.tokenVoting.address,
            managementDao.address,
            PLUGIN_REPO_PERMISSIONS.MAINTAINER_PERMISSION_ID,
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
            managementDao.address,
            PLUGIN_REPO_PERMISSIONS.UPGRADE_REPO_PERMISSION_ID,
            []
          )
        ).to.be.true;
      });
      it('has permission to maintain the repo', async function () {
        expect(
          await pluginsRepos.addresslistVoting.isGranted(
            pluginsRepos.addresslistVoting.address,
            managementDao.address,
            PLUGIN_REPO_PERMISSIONS.MAINTAINER_PERMISSION_ID,
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
            managementDao.address,
            PLUGIN_REPO_PERMISSIONS.UPGRADE_REPO_PERMISSION_ID,
            []
          )
        ).to.be.true;
      });
      it('has permission to maintain the repo', async function () {
        expect(
          await pluginsRepos.admin.isGranted(
            pluginsRepos.admin.address,
            managementDao.address,
            PLUGIN_REPO_PERMISSIONS.MAINTAINER_PERMISSION_ID,
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
            managementDao.address,
            PLUGIN_REPO_PERMISSIONS.UPGRADE_REPO_PERMISSION_ID,
            []
          )
        ).to.be.true;
      });

      it('has permission to maintain the repo', async function () {
        expect(
          await pluginsRepos.multisig.isGranted(
            pluginsRepos.multisig.address,
            managementDao.address,
            PLUGIN_REPO_PERMISSIONS.MAINTAINER_PERMISSION_ID,
            []
          )
        ).to.be.true;
      });
    });
  });
});
