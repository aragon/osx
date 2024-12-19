import {
  DAO,
  DAORegistry,
  DAORegistry__factory,
  DAO__factory,
  ENSSubdomainRegistrar,
  ENSSubdomainRegistrar__factory,
  PluginRepoRegistry,
  PluginRepoRegistry__factory,
  PluginRepo__factory,
} from '../../typechain';
import {initializeDeploymentFixture} from '../test-utils/fixture';
import {
  DAO_PERMISSIONS,
  DAO_REGISTRY_PERMISSIONS,
  ENS_REGISTRAR_PERMISSIONS,
  PLUGIN_REGISTRY_PERMISSIONS,
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

  let managementDaoDeployment: Deployment;
  let managementDao: DAO;
  let daoRegistryDeployment: Deployment;
  let daoRegistry: DAORegistry;
  let pluginRepoRegistryDeployment: Deployment;
  let pluginRepoRegistry: PluginRepoRegistry;
  let ensSubdomainRegistrars: {
    pluginRegistrar: ENSSubdomainRegistrar;
    daoRegistrar: ENSSubdomainRegistrar;
  };

  before(async () => {
    [deployer] = await ethers.getSigners();

    // deployment should be empty
    expect(await deployments.all()).to.be.empty;

    // deploy framework
    await deployAll();

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
  });

  it.only('has deployments', async function () {
    
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
  });
});
