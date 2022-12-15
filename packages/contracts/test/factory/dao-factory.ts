import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  DAORegistry,
  PluginSetupProcessor,
  PluginUUPSUpgradeableSetupV1Mock,
  PluginRepoRegistry,
} from '../../typechain';

import {deployENSSubdomainRegistrar} from '../test-utils/ens';
import {customError} from '../test-utils/custom-error-helper';
import {deployPluginSetupProcessor} from '../test-utils/plugin-setup-processor';
import {
  deployPluginRepoFactory,
  deployPluginRepoRegistry,
} from '../test-utils/repo';
import {findEvent} from '../../utils/event';
import {getMergedABI} from '../../utils/abi';

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
  DAORegistered: 'DAORegistered',
  InstallationPrepared: 'InstallationPrepared',
  InstallationApplied: 'InstallationApplied',
  Revoked: 'Revoked',
  Granted: 'Granted',
};

const APPLY_INSTALLATION_PERMISSION_ID = ethers.utils.id(
  'APPLY_INSTALLATION_PERMISSION'
);
const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION');
const WITHDRAW_PERMISSION_ID = ethers.utils.id('WITHDRAW_PERMISSION');
const UPGRADE_DAO_PERMISSION_ID = ethers.utils.id('UPGRADE_DAO_PERMISSION');
const SET_SIGNATURE_VALIDATOR_PERMISSION_ID = ethers.utils.id(
  'SET_SIGNATURE_VALIDATOR_PERMISSION'
);
const SET_TRUSTED_FORWARDER_PERMISSION_ID = ethers.utils.id(
  'SET_TRUSTED_FORWARDER_PERMISSION'
);
const SET_METADATA_PERMISSION_ID = ethers.utils.id('SET_METADATA_PERMISSION');
const REGISTER_PLUGIN_REPO_PERMISSION_ID = ethers.utils.id(
  'REGISTER_PLUGIN_REPO_PERMISSION'
);
const REGISTER_ENS_SUBDOMAIN_PERMISSION_ID = ethers.utils.id(
  'REGISTER_ENS_SUBDOMAIN_PERMISSION'
);

const REGISTER_DAO_PERMISSION_ID = ethers.utils.id('REGISTER_DAO_PERMISSION');

const PermissionManagerAllowFlagAddress =
  '0x0000000000000000000000000000000000000002';
const daoDummyName = 'dao1';
const registrarManagedDomain = 'dao.eth';
const daoDummyMetadata = '0x0000';
const EMPTY_DATA = '0x';
const AddressZero = ethers.constants.AddressZero;

async function extractInfoFromCreateDaoTx(tx: any): Promise<{
  dao: any;
  creator: any;
  name: any;
  plugin: any;
  helpers: any;
  permissions: any;
}> {
  const data = await tx.wait();
  const {events} = data;
  const {dao, creator, name} = events.find(
    ({event}: {event: any}) => event === EVENTS.DAORegistered
  ).args;

  const {plugin, helpers, permissions} = events.find(
    ({event}: {event: any}) => event === EVENTS.InstallationPrepared
  ).args;

  return {
    dao: dao,
    creator: creator,
    name: name,
    plugin: plugin,
    helpers: helpers,
    permissions: permissions,
  };
}

describe('DAOFactory: ', function () {
  let daoFactory: any;
  let managingDao: any;

  let psp: PluginSetupProcessor;
  let pluginRepoRegistry: PluginRepoRegistry;
  let pluginSetupV1Mock: PluginUUPSUpgradeableSetupV1Mock;
  let pluginRepoFactory: any;
  let pluginSetupMockRepoAddress: any;
  let daoRegistry: DAORegistry;
  let daoSettings: any;
  let majorityVotingSettings: any;

  let signers: SignerWithAddress[];
  let ownerAddress: string;

  let mergedABI: any;
  let daoFactoryBytecode: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const {abi, bytecode} = await getMergedABI(
      // @ts-ignore
      hre,
      'DAOFactory',
      ['DAORegistry', 'PluginSetupProcessor', 'DAO']
    );

    mergedABI = abi;
    daoFactoryBytecode = bytecode;
  });

  beforeEach(async function () {
    // Managing DAO
    const ManagingDAO = await ethers.getContractFactory('DAO');
    managingDao = await ManagingDAO.deploy();
    await managingDao.initialize(
      '0x00',
      ownerAddress,
      ethers.constants.AddressZero
    );

    // ENS subdomain Registry
    const ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
      signers[0],
      managingDao,
      registrarManagedDomain
    );

    // DAO Registry
    const DAORegistry = await ethers.getContractFactory('DAORegistry');
    daoRegistry = await DAORegistry.deploy();
    await daoRegistry.initialize(
      managingDao.address,
      ensSubdomainRegistrar.address
    );

    // Plugin Repo Registry
    pluginRepoRegistry = await deployPluginRepoRegistry(
      managingDao,
      ensSubdomainRegistrar
    );

    // Plugin Setup Processor
    psp = await deployPluginSetupProcessor(managingDao, pluginRepoRegistry);

    // Plugin Repo Factory
    pluginRepoFactory = await deployPluginRepoFactory(
      signers,
      pluginRepoRegistry
    );

    // Deploy DAO Factory
    const DAOFactory = new ethers.ContractFactory(
      mergedABI,
      daoFactoryBytecode,
      signers[0]
    );
    daoFactory = await DAOFactory.deploy(daoRegistry.address, psp.address);

    // Grant the `REGISTER_DAO_PERMISSION` permission to the `daoFactory`
    await managingDao.grant(
      daoRegistry.address,
      daoFactory.address,
      REGISTER_DAO_PERMISSION_ID
    );

    // Grant the `REGISTER_ENS_SUBDOMAIN_PERMISSION` permission on the ENS subdomain registrar to the DAO registry contract
    await managingDao.grant(
      ensSubdomainRegistrar.address,
      daoRegistry.address,
      REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
    );

    // Grant `PLUGIN_REGISTER_PERMISSION` to `pluginRepoFactory`.
    await managingDao.grant(
      pluginRepoRegistry.address,
      pluginRepoFactory.address,
      REGISTER_PLUGIN_REPO_PERMISSION_ID
    );

    // Grant `REGISTER_ENS_SUBDOMAIN_PERMISSION` to `PluginRepoFactory`.
    await managingDao.grant(
      ensSubdomainRegistrar.address,
      pluginRepoRegistry.address,
      REGISTER_ENS_SUBDOMAIN_PERMISSION_ID
    );

    // Create and register a plugin on the `PluginRepoRegistry`.
    // PluginSetupV1
    const PluginUUPSUpgradeableSetupV1Mock = await ethers.getContractFactory(
      'PluginUUPSUpgradeableSetupV1Mock'
    );
    pluginSetupV1Mock = await PluginUUPSUpgradeableSetupV1Mock.deploy();
    const tx = await pluginRepoFactory.createPluginRepoWithVersion(
      'PluginUUPSUpgradeableSetupV1Mock',
      [1, 0, 0],
      pluginSetupV1Mock.address,
      '0x00',
      ownerAddress
    );
    const event = await findEvent(tx, EVENTS.PluginRepoRegistered);
    pluginSetupMockRepoAddress = event.args.pluginRepo;

    // default params
    daoSettings = {
      trustedForwarder: AddressZero,
      name: daoDummyName,
      metadata: daoDummyMetadata,
    };

    majorityVotingSettings = {
      pluginSetup: pluginSetupV1Mock.address,
      pluginSetupRepo: pluginSetupMockRepoAddress,
      data: EMPTY_DATA,
    };
  });

  it('reverts if no plugin is provided', async () => {
    await expect(daoFactory.createDao(daoSettings, [])).to.be.revertedWith(
      customError('NoPluginProvided')
    );
  });

  it('correctly creates a DAO with one plugin', async () => {
    const tx = await daoFactory.createDao(daoSettings, [
      majorityVotingSettings,
    ]);
    const {dao, plugin, helpers, permissions} =
      await extractInfoFromCreateDaoTx(tx);

    await expect(tx)
      .to.emit(daoRegistry, EVENTS.DAORegistered)
      .withArgs(dao, ownerAddress, daoSettings.name);

    const event = await findEvent(tx, EVENTS.InstallationPrepared);

    expect(event.args.sender).to.equal(daoFactory.address);
    expect(event.args.dao).to.equal(dao);
    expect(event.args.plugin).to.equal(plugin);
    expect(event.args.pluginSetup).to.equal(pluginSetupV1Mock.address);
    expect(event.args.helpers).to.deep.equal(helpers);
    expect(event.args.permissions).to.deep.equal(permissions);
    expect(event.args.data).to.equal(EMPTY_DATA);

    await expect(tx)
      .to.emit(psp, EVENTS.InstallationApplied)
      .withArgs(dao, plugin);

    const factory = await ethers.getContractFactory('DAO');
    const daoContract = factory.attach(dao);

    for (let i = 0; i < permissions.length; i++) {
      const permission = permissions[i];
      expect(
        await daoContract.hasPermission(
          permission.where,
          permission.who,
          permission.permissionId,
          EMPTY_DATA
        )
      ).to.equal(true);
    }
  });

  it('revokes all temporarly granted permissions', async () => {
    const tx = await daoFactory.createDao(daoSettings, [
      majorityVotingSettings,
    ]);
    const {dao} = await extractInfoFromCreateDaoTx(tx);

    const factory = await ethers.getContractFactory('DAO');
    const daoContract = factory.attach(dao);

    await expect(tx)
      .to.emit(daoContract, EVENTS.Revoked)
      .withArgs(ROOT_PERMISSION_ID, daoFactory.address, dao, psp.address);

    await expect(tx)
      .to.emit(daoContract, EVENTS.Revoked)
      .withArgs(
        APPLY_INSTALLATION_PERMISSION_ID,
        daoFactory.address,
        psp.address,
        daoFactory.address
      );

    await expect(tx)
      .to.emit(daoContract, EVENTS.Revoked)
      .withArgs(
        ROOT_PERMISSION_ID,
        daoFactory.address,
        dao,
        daoFactory.address
      );
  });

  it('emits events containing all the correct permissions to be set in the created DAO', async () => {
    const tx = await daoFactory.createDao(daoSettings, [
      majorityVotingSettings,
    ]);
    const {dao} = await extractInfoFromCreateDaoTx(tx);

    const factory = await ethers.getContractFactory('DAO');
    const daoContract = factory.attach(dao);

    await expect(tx)
      .to.emit(daoContract, EVENTS.Granted)
      .withArgs(
        ROOT_PERMISSION_ID,
        daoFactory.address,
        dao,
        dao,
        PermissionManagerAllowFlagAddress
      );
    await expect(tx)
      .to.emit(daoContract, EVENTS.Granted)
      .withArgs(
        WITHDRAW_PERMISSION_ID,
        daoFactory.address,
        dao,
        dao,
        PermissionManagerAllowFlagAddress
      );
    await expect(tx)
      .to.emit(daoContract, EVENTS.Granted)
      .withArgs(
        UPGRADE_DAO_PERMISSION_ID,
        daoFactory.address,
        dao,
        dao,
        PermissionManagerAllowFlagAddress
      );
    await expect(tx)
      .to.emit(daoContract, EVENTS.Granted)
      .withArgs(
        SET_SIGNATURE_VALIDATOR_PERMISSION_ID,
        daoFactory.address,
        dao,
        dao,
        PermissionManagerAllowFlagAddress
      );
    await expect(tx)
      .to.emit(daoContract, EVENTS.Granted)
      .withArgs(
        SET_TRUSTED_FORWARDER_PERMISSION_ID,
        daoFactory.address,
        dao,
        dao,
        PermissionManagerAllowFlagAddress
      );
    await expect(tx)
      .to.emit(daoContract, EVENTS.Granted)
      .withArgs(
        SET_METADATA_PERMISSION_ID,
        daoFactory.address,
        dao,
        dao,
        PermissionManagerAllowFlagAddress
      );
  });
});
