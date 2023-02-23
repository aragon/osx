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
} from '../../../typechain';

import {deployENSSubdomainRegistrar} from '../../test-utils/ens';
import {deployPluginSetupProcessor} from '../../test-utils/plugin-setup-processor';
import {
  deployPluginRepoFactory,
  deployPluginRepoRegistry,
} from '../../test-utils/repo';
import {findEvent} from '../../../utils/event';
import {getMergedABI} from '../../../utils/abi';
import {daoExampleURI, deployNewDAO} from '../../test-utils/dao';
import {deployWithProxy} from '../../test-utils/proxy';
import {getAppliedSetupId} from '../../test-utils/psp/hash-helpers';
import {PluginRepoPointer} from '../../test-utils/psp/types';
import {createPrepareInstallationParams} from '../../test-utils/psp/create-params';

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
  DAORegistered: 'DAORegistered',
  InstallationPrepared: 'InstallationPrepared',
  InstallationApplied: 'InstallationApplied',
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
  let pluginRepoFactory: PluginRepoFactory;
  let pluginSetupMockRepoAddress: any;
  let daoRegistry: DAORegistry;
  let daoSettings: any;
  let votingPluginInstallationData: any;

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
    const event = await findEvent(tx, EVENTS.PluginRepoRegistered);
    pluginSetupMockRepoAddress = event.args.pluginRepo;

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
    votingPluginInstallationData = createPrepareInstallationParams(
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

    expect(
      await daoFactory.createDao(daoSettings, [votingPluginInstallationData])
    )
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
      votingPluginInstallationData.data
    );

    const tx = await daoFactory.createDao(daoSettings, [
      votingPluginInstallationData,
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
      votingPluginInstallationData,
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
      votingPluginInstallationData,
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
      votingPluginInstallationData,
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
    const factory = await ethers.getContractFactory('PluginRepo');
    const pluginRepo = factory.attach(pluginSetupMockRepoAddress);
    await pluginRepo.createVersion(
      1,
      // We can use the same plugin setup as each time,
      // it returns the different plugin address, hence
      // wil generate unique/different plugin installation id.
      pluginSetupV1Mock.address,
      '0x11',
      '0x11'
    );

    const plugin1 = {...votingPluginInstallationData};

    const plugin2 = {...votingPluginInstallationData};
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
});
