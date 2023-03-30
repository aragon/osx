import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {anyValue} from '@nomicfoundation/hardhat-chai-matchers/withArgs';

import {
  DAORegistry,
  PluginSetupProcessor,
  PluginUUPSUpgradeableSetupV1Mock,
  PluginRepoRegistry,
  DAOFactory,
  DAOFactory__factory,
  PluginRepoFactory,
  PluginUUPSUpgradeableSetupV2Mock,
  AdminSetup,
  PluginSetupProcessor__factory,
  DAO__factory,
  PluginRepo,
  Admin,
  DAO,
} from '../../../typechain';

import {deployENSSubdomainRegistrar} from '../../test-utils/ens';
import {deployPluginSetupProcessor} from '../../test-utils/plugin-setup-processor';
import {
  deployPluginRepoFactory,
  deployPluginRepoRegistry,
} from '../../test-utils/repo';
import adminMetadata from '../../../src/plugins/governance/admin/build-metadata.json';

import {findEvent} from '../../../utils/event';
import {getMergedABI} from '../../../utils/abi';
import {daoExampleURI, deployNewDAO} from '../../test-utils/dao';
import {deployWithProxy} from '../../test-utils/proxy';
import {getAppliedSetupId} from '../../test-utils/psp/hash-helpers';
import {PluginRepoPointer} from '../../test-utils/psp/types';
import {
  createApplyInstallationParams,
  createApplyUninstallationParams,
  createApplyUpdateParams,
  createPrepareInstallationParams,
} from '../../test-utils/psp/create-params';
import {
  prepareInstallation,
  prepareUninstallation,
  prepareUpdate,
} from '../../test-utils/psp/wrappers';
import {PluginRepoRegisteredEvent} from '../../../typechain/PluginRepoRegistry';
import {InstallationPreparedEvent} from '../../../typechain/PluginSetupProcessor';

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
  DAORegistered: 'DAORegistered',
  InstallationPrepared: 'InstallationPrepared',
  InstallationApplied: 'InstallationApplied',
  UpdateApplied: 'UpdateApplied',
  UninstallationApplied: 'UninstallationApplied',
  MetadataSet: 'MetadataSet',
  TrustedForwarderSet: 'TrustedForwarderSet',
  NewURI: 'NewURI',
  Revoked: 'Revoked',
  Granted: 'Granted',
};

const APPLY_INSTALLATION_PERMISSION_ID = ethers.utils.id(
  'APPLY_INSTALLATION_PERMISSION'
);
const ROOT_PERMISSION_ID = ethers.utils.id('ROOT_PERMISSION');
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

const REGISTER_STANDARD_CALLBACK_PERMISSION_ID = ethers.utils.id(
  'REGISTER_STANDARD_CALLBACK_PERMISSION'
);

const REGISTER_DAO_PERMISSION_ID = ethers.utils.id('REGISTER_DAO_PERMISSION');

const ALLOW_FLAG = '0x0000000000000000000000000000000000000002';
const daoDummySubdomain = 'dao1';
const registrarManagedDomain = 'dao.eth';
const daoDummyMetadata = '0x0000';
const EMPTY_DATA = '0x';
const AddressZero = ethers.constants.AddressZero;

async function extractInfoFromCreateDaoTx(tx: any): Promise<{
  dao: any;
  creator: any;
  subdomain: any;
  plugin: any;
  helpers: any;
  permissions: any;
}> {
  const data = await tx.wait();
  const {events} = data;
  const {dao, creator, subdomain} = events.find(
    ({event}: {event: any}) => event === EVENTS.DAORegistered
  ).args;

  const {
    plugin,
    preparedSetupData: {permissions, helpers},
  } = events.find(
    ({event}: {event: any}) => event === EVENTS.InstallationPrepared
  ).args;

  return {
    dao: dao,
    creator: creator,
    subdomain: subdomain,
    plugin: plugin,
    helpers: helpers,
    permissions: permissions,
  };
}

async function getAnticipatedAddress(from: string) {
  let nonce = await ethers.provider.getTransactionCount(from);
  const anticipatedAddress = ethers.utils.getContractAddress({
    from: from,
    nonce,
  });
  return anticipatedAddress;
}

describe('DAOFactory: ', function () {
  let daoFactory: DAOFactory;
  let managingDao: any;

  let psp: PluginSetupProcessor;
  let pluginRepoRegistry: PluginRepoRegistry;

  let pluginSetupV1Mock: PluginUUPSUpgradeableSetupV1Mock;
  let pluginRepoMock: PluginRepo;
  let pluginSetupMockRepoAddress: any;

  let pluginRepoFactory: PluginRepoFactory;
  let daoRegistry: DAORegistry;
  let daoSettings: any;
  let pluginInstallationData: any;

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
    managingDao = await deployNewDAO(ownerAddress);

    // ENS subdomain Registry
    const ensSubdomainRegistrar = await deployENSSubdomainRegistrar(
      signers[0],
      managingDao,
      registrarManagedDomain
    );

    // DAO Registry
    const DAORegistry = await ethers.getContractFactory('DAORegistry');
    daoRegistry = await deployWithProxy(DAORegistry);
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
    psp = await deployPluginSetupProcessor(pluginRepoRegistry);

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
    ) as DAOFactory__factory;
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

    const tx = await pluginRepoFactory.createPluginRepoWithFirstVersion(
      'plugin-uupsupgradeable-setup-v1-mock',
      pluginSetupV1Mock.address,
      ownerAddress,
      '0x00',
      '0x00'
    );
    const event = await findEvent<PluginRepoRegisteredEvent>(
      tx,
      EVENTS.PluginRepoRegistered
    );
    pluginSetupMockRepoAddress = event.args.pluginRepo;

    const factory = await ethers.getContractFactory('PluginRepo');
    pluginRepoMock = factory.attach(pluginSetupMockRepoAddress);

    // default params
    daoSettings = {
      trustedForwarder: AddressZero,
      subdomain: daoDummySubdomain,
      metadata: daoDummyMetadata,
      daoURI: daoExampleURI,
    };

    const pluginRepoPointer: PluginRepoPointer = [
      pluginSetupMockRepoAddress,
      1,
      1,
    ];
    pluginInstallationData = createPrepareInstallationParams(
      pluginRepoPointer,
      EMPTY_DATA
    );
  });

  it('reverts if no plugin is provided', async () => {
    await expect(
      daoFactory.createDao(daoSettings, [])
    ).to.be.revertedWithCustomError(daoFactory, 'NoPluginProvided');
  });

  it('creates a dao and initializes with correct args', async () => {
    const dao = await getAnticipatedAddress(daoFactory.address);

    const factory = await ethers.getContractFactory('DAO');
    const daoContract = factory.attach(dao);

    expect(await daoFactory.createDao(daoSettings, [pluginInstallationData]))
      .to.emit(daoContract, EVENTS.MetadataSet)
      .withArgs(daoSettings.metadata)
      .to.emit(daoContract, EVENTS.TrustedForwarderSet)
      .withArgs(daoSettings.trustedForwarder)
      .to.emit(daoContract, EVENTS.NewURI)
      .withArgs(daoSettings.daoURI);
  });

  it('creates a dao with a plugin and emits correct events', async () => {
    const expectedDao = await getAnticipatedAddress(daoFactory.address);
    const expectedPlugin = await getAnticipatedAddress(
      pluginSetupV1Mock.address
    );

    const {
      plugin,
      preparedSetupData: {permissions, helpers},
    } = await pluginSetupV1Mock.callStatic.prepareInstallation(
      expectedDao,
      pluginInstallationData.data
    );

    const tx = await daoFactory.createDao(daoSettings, [
      pluginInstallationData,
    ]);
    const {dao} = await extractInfoFromCreateDaoTx(tx);

    const pluginRepoPointer: PluginRepoPointer = [
      pluginSetupMockRepoAddress,
      1,
      1,
    ];

    expect(dao).to.equal(expectedDao);
    expect(plugin).to.equal(expectedPlugin);

    await expect(tx)
      .to.emit(daoRegistry, EVENTS.DAORegistered)
      .withArgs(dao, ownerAddress, daoSettings.subdomain)
      .to.emit(psp, EVENTS.InstallationPrepared)
      .withArgs(
        daoFactory.address,
        dao,
        anyValue,
        pluginSetupMockRepoAddress,
        (val: any) => expect(val).to.deep.equal([1, 1]),
        EMPTY_DATA,
        expectedPlugin,
        (val: any) => expect(val).to.deep.equal([helpers, permissions])
      )
      .to.emit(psp, EVENTS.InstallationApplied)
      .withArgs(
        dao,
        expectedPlugin,
        anyValue,
        getAppliedSetupId(pluginRepoPointer, helpers)
      );
  });

  it('creates a dao with a plugin and sets plugin permissions on dao correctly', async () => {
    const tx = await daoFactory.createDao(daoSettings, [
      pluginInstallationData,
    ]);
    const {dao, permissions} = await extractInfoFromCreateDaoTx(tx);

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

  it('creates a dao and sets its own permissions correctly on itself', async () => {
    const tx = await daoFactory.createDao(daoSettings, [
      pluginInstallationData,
    ]);
    const {dao} = await extractInfoFromCreateDaoTx(tx);

    const factory = await ethers.getContractFactory('DAO');
    const daoContract = factory.attach(dao);

    await expect(tx)
      .to.emit(daoContract, EVENTS.Granted)
      .withArgs(ROOT_PERMISSION_ID, daoFactory.address, dao, dao, ALLOW_FLAG)
      .to.emit(daoContract, EVENTS.Granted)
      .withArgs(
        UPGRADE_DAO_PERMISSION_ID,
        daoFactory.address,
        dao,
        dao,
        ALLOW_FLAG
      )
      .to.emit(daoContract, EVENTS.Granted)
      .withArgs(
        SET_SIGNATURE_VALIDATOR_PERMISSION_ID,
        daoFactory.address,
        dao,
        dao,
        ALLOW_FLAG
      )
      .to.emit(daoContract, EVENTS.Granted)
      .withArgs(
        SET_TRUSTED_FORWARDER_PERMISSION_ID,
        daoFactory.address,
        dao,
        dao,
        ALLOW_FLAG
      )
      .to.emit(daoContract, EVENTS.Granted)
      .withArgs(
        SET_METADATA_PERMISSION_ID,
        daoFactory.address,
        dao,
        dao,
        ALLOW_FLAG
      )
      .to.emit(daoContract, EVENTS.Granted)
      .withArgs(
        REGISTER_STANDARD_CALLBACK_PERMISSION_ID,
        daoFactory.address,
        dao,
        dao,
        ALLOW_FLAG
      );
  });

  it('revokes all temporarly granted permissions', async () => {
    const tx = await daoFactory.createDao(daoSettings, [
      pluginInstallationData,
    ]);
    const {dao} = await extractInfoFromCreateDaoTx(tx);

    const factory = await ethers.getContractFactory('DAO');
    const daoContract = factory.attach(dao);

    // Check that events were emitted.
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

    // Direct check to ensure since these permissions are extra dangerous to stay on.
    expect(
      await daoContract.hasPermission(
        dao,
        daoFactory.address,
        ROOT_PERMISSION_ID,
        '0x'
      )
    ).to.be.false;
    expect(
      await daoContract.hasPermission(
        dao,
        psp.address,
        ROOT_PERMISSION_ID,
        '0x'
      )
    ).to.be.false;

    expect(
      await daoContract.hasPermission(
        psp.address,
        daoFactory.address,
        APPLY_INSTALLATION_PERMISSION_ID,
        '0x'
      )
    ).to.be.false;
  });

  it('creates a dao with multiple plugins installed', async () => {
    // add new plugin setup to the repo ! it will become build 2.
    await pluginRepoMock.createVersion(
      1,
      // We can use the same plugin setup as each time,
      // it returns the different plugin address, hence
      // wil generate unique/different plugin installation id.
      pluginSetupV1Mock.address,
      '0x11',
      '0x11'
    );

    const plugin1 = {...pluginInstallationData};

    const plugin2 = {...pluginInstallationData};
    plugin2.pluginSetupRef.versionTag = {
      release: 1,
      build: 2,
    };

    const plugins = [plugin1, plugin2];
    const tx = await daoFactory.createDao(daoSettings, plugins);
    const {events} = await tx.wait();

    let installEventCount = 0;

    // @ts-ignore
    events.forEach(event => {
      if (event.event == EVENTS.InstallationApplied) installEventCount++;
    });

    expect(installEventCount).to.equal(2);
  });

  describe('E2E: Install,Update,Uninstall Plugin through Admin Plugin', async () => {
    let pluginSetupV2Mock: PluginUUPSUpgradeableSetupV2Mock;
    let adminPluginSetup: AdminSetup;
    let adminPluginRepoAddress: string;
    let adminPlugin: Admin;
    let dao: DAO;

    beforeEach(async () => {
      // create 2nd version of PluginUUPSUpgradeableSetupV1.
      const PluginUUPSUpgradeableSetupV2Mock = await ethers.getContractFactory(
        'PluginUUPSUpgradeableSetupV2Mock'
      );
      pluginSetupV2Mock = await PluginUUPSUpgradeableSetupV2Mock.deploy();
      {
        await pluginRepoMock.createVersion(
          1,
          pluginSetupV2Mock.address,
          '0x11',
          '0x11'
        );
      }

      // Create admin plugin repo so we can install it with dao
      // This will help us execute installation/update calldatas through dao's execute.
      const AdminPluginSetupFactory = await ethers.getContractFactory(
        'AdminSetup'
      );
      adminPluginSetup = await AdminPluginSetupFactory.deploy();

      let tx = await pluginRepoFactory.createPluginRepoWithFirstVersion(
        'admin',
        adminPluginSetup.address,
        ownerAddress,
        '0x11',
        '0x11'
      );
      let event = await findEvent<PluginRepoRegisteredEvent>(
        tx,
        EVENTS.PluginRepoRegistered
      );
      adminPluginRepoAddress = event.args.pluginRepo;

      // create dao with admin plugin.
      const adminPluginRepoPointer: PluginRepoPointer = [
        adminPluginRepoAddress,
        1,
        1,
      ];

      let data = ethers.utils.defaultAbiCoder.encode(
        adminMetadata.pluginSetupABI.prepareInstallation,
        [ownerAddress]
      );

      let adminPluginInstallation = createPrepareInstallationParams(
        adminPluginRepoPointer,
        data
      );
      tx = await daoFactory.createDao(daoSettings, [adminPluginInstallation]);
      {
        const event = await findEvent<InstallationPreparedEvent>(
          tx,
          EVENTS.InstallationPrepared
        );
        const adminFactory = await ethers.getContractFactory('Admin');
        adminPlugin = adminFactory.attach(event.args.plugin);

        const daoFactory = await ethers.getContractFactory('DAO');
        dao = daoFactory.attach(event.args.dao);
      }
    });

    it('installs,updates and uninstalls plugin through dao', async () => {
      // Prepare Installation
      let {
        plugin,
        preparedSetupData: {permissions, helpers},
      } = await prepareInstallation(
        psp,
        dao.address,
        [pluginSetupMockRepoAddress, 1, 1],
        EMPTY_DATA
      );

      let DAO_INTERFACE = DAO__factory.createInterface();
      let PSP_INTERFACE = PluginSetupProcessor__factory.createInterface();

      // Prepare actions for apply Installation.
      let applyInstallationActions = [
        {
          to: dao.address,
          value: 0,
          data: DAO_INTERFACE.encodeFunctionData('grant', [
            dao.address,
            psp.address,
            ethers.utils.id('ROOT_PERMISSION'),
          ]),
        },
        {
          to: psp.address,
          value: 0,
          data: PSP_INTERFACE.encodeFunctionData('applyInstallation', [
            dao.address,
            createApplyInstallationParams(
              plugin,
              [pluginSetupMockRepoAddress, 1, 1],
              permissions,
              helpers
            ),
          ]),
        },
      ];

      await expect(
        adminPlugin.executeProposal('0x', applyInstallationActions, 0)
      ).to.emit(psp, EVENTS.InstallationApplied);

      // Prepare Update
      const {
        initData,
        preparedSetupData: {
          permissions: updatePermissions,
          helpers: updateHelpers,
        },
      } = await prepareUpdate(
        psp,
        dao.address,
        plugin,
        [1, 1],
        [1, 2],
        pluginSetupMockRepoAddress,
        helpers,
        EMPTY_DATA
      );

      // Prepare actions for applyUpdate to succeed.
      let applyUpdateActions = [
        {
          to: dao.address,
          value: 0,
          data: DAO_INTERFACE.encodeFunctionData('grant', [
            plugin,
            psp.address,
            ethers.utils.id('UPGRADE_PLUGIN_PERMISSION'),
          ]),
        },
        {
          to: psp.address,
          value: 0,
          data: PSP_INTERFACE.encodeFunctionData('applyUpdate', [
            dao.address,
            createApplyUpdateParams(
              plugin,
              [pluginSetupMockRepoAddress, 1, 2],
              initData,
              updatePermissions,
              updateHelpers
            ),
          ]),
        },
      ];

      await expect(
        adminPlugin.executeProposal('0x', applyUpdateActions, 0)
      ).to.emit(psp, EVENTS.UpdateApplied);

      // Uninstall the plugin
      let {permissions: uninstallPermissions} = await prepareUninstallation(
        psp,
        dao.address,
        plugin,
        [pluginSetupMockRepoAddress, 1, 2],
        updateHelpers,
        EMPTY_DATA
      );

      // Prepare actions for apply Uninstallation.
      let applyUninstallationActions = [
        {
          to: psp.address,
          value: 0,
          data: PSP_INTERFACE.encodeFunctionData('applyUninstallation', [
            dao.address,
            createApplyUninstallationParams(
              plugin,
              [pluginSetupMockRepoAddress, 1, 2],
              uninstallPermissions
            ),
          ]),
        },
      ];

      await expect(
        adminPlugin.executeProposal('0x', applyUninstallationActions, 0)
      ).to.emit(psp, EVENTS.UninstallationApplied);
    });
  });
});
