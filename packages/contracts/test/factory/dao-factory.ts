import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {ensDomainHash} from '../../utils/ensHelpers';
import {deployENSSubdomainRegistrar} from '../test-utils/ens';
import {VoteOption} from '../test-utils/voting';
import {customError} from '../test-utils/custom-error-helper';
import {
  AragonPluginRegistry,
  DAORegistry,
  PluginRepoFactory,
  PluginSetupProcessor,
  PluginSetupV1Mock,
} from '../../typechain';
import {
  deployAragonPluginRegistry,
  deployPluginSetupProcessor,
} from '../test-utils/plugin-setup-processor';
import {deployPluginRepoFactory} from '../test-utils/repo';
import {decodeEvent} from '../test-utils/event';

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
  DAORegistered: 'DAORegistered',
  InstallationPrepared: 'InstallationPrepared',
  InstallationApplied: 'InstallationApplied',
};

const SET_CONFIGURATION_PERMISSION_ID = ethers.utils.id(
  'SET_CONFIGURATION_PERMISSION'
);
const MODIFY_ALLOWLIST_PERMISSION_ID = ethers.utils.id(
  'MODIFY_ALLOWLIST_PERMISSION'
);
const EXECUTE_PERMISSION_ID = ethers.utils.id('EXECUTE_PERMISSION');

const zeroAddress = ethers.constants.AddressZero;
const PermissionManagerAnyAddress =
  '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF';
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
  let aragonPluginRegistry: AragonPluginRegistry;
  let pluginSetupV1Mock: PluginSetupV1Mock;
  let pluginRepoFactory: any;
  let pluginSetupMockRepoAddress: any;
  let daoRegistry: DAORegistry;

  let actionExecuteContract: any; // contract

  let signers: SignerWithAddress[];
  let ownerAddress: string;

  let mergedABI: any;
  let daoFactoryBytecode: any;

  async function getMergedABI() {
    // @ts-ignore
    const DAOFactoryArtifact = await hre.artifacts.readArtifact('DAOFactory');
    // @ts-ignore
    const RegistryArtifact = await hre.artifacts.readArtifact('DAORegistry');
    // @ts-ignore
    const PluginSetupProcessorArtifact = await hre.artifacts.readArtifact(
      'PluginSetupProcessor'
    );

    const _merged = [
      ...DAOFactoryArtifact.abi,
      ...RegistryArtifact.abi.filter((f: any) => f.type === 'event'),
      ...PluginSetupProcessorArtifact.abi.filter(
        (f: any) => f.type === 'event'
      ),
    ];

    // remove duplicated events
    const merged = _merged.filter(
      (value, index, self) =>
        index === self.findIndex(event => event.name === value.name)
    );

    return {
      abi: merged,
      bytecode: DAOFactoryArtifact.bytecode,
    };
  }

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const {abi, bytecode} = await getMergedABI();

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

    aragonPluginRegistry = await deployAragonPluginRegistry(managingDao);
    psp = await deployPluginSetupProcessor(managingDao, aragonPluginRegistry);
    pluginRepoFactory = await deployPluginRepoFactory(
      signers,
      managingDao,
      aragonPluginRegistry
    );

    // Create and register a plugin on the AragonPluginRegistry
    // PluginSetupV1
    const PluginSetupV1Mock = await ethers.getContractFactory(
      'PluginSetupV1Mock'
    );
    pluginSetupV1Mock = await PluginSetupV1Mock.deploy();

    const tx = await pluginRepoFactory.createPluginRepoWithVersion(
      'PluginSetupV1Mock',
      [1, 0, 0],
      pluginSetupV1Mock.address,
      '0x00',
      ownerAddress
    );
    const event = await decodeEvent(tx, EVENTS.PluginRepoRegistered);
    pluginSetupMockRepoAddress = event.args.pluginRepo;

    // Deploy DAO Factory
    const DAOFactory = new ethers.ContractFactory(
      mergedABI,
      daoFactoryBytecode,
      signers[0]
    );

    daoFactory = await DAOFactory.deploy(daoRegistry.address, psp.address);

    const ActionExecuteContract = await ethers.getContractFactory(
      'ActionExecute'
    );
    actionExecuteContract = await ActionExecuteContract.deploy();

    // Grant the `REGISTER_DAO_PERMISSION` permission to the `daoFactory`
    await managingDao.grant(
      daoRegistry.address,
      daoFactory.address,
      ethers.utils.id('REGISTER_DAO_PERMISSION')
    );

    // Grant the `REGISTER_ENS_SUBDOMAIN_PERMISSION` permission on the ENS subdomain registrar to the DAO registry contract
    await managingDao.grant(
      ensSubdomainRegistrar.address,
      daoRegistry.address,
      ethers.utils.id('REGISTER_ENS_SUBDOMAIN_PERMISSION')
    );
  });

  it('Revert if no plugin is provided', async () => {
    const daoSettings = {
      name: daoDummyName,
      trustedForwarder: AddressZero,
      metadata: daoDummyMetadata,
    };

    await expect(daoFactory.createDao(daoSettings, [])).to.be.revertedWith(
      customError('NoPluginProvided')
    );
  });

  it('Correclty create a DAO with one plugin', async () => {
    const daoSettings = {
      name: daoDummyName,
      trustedForwarder: AddressZero,
      metadata: daoDummyMetadata,
    };

    const pluginSettings = {
      pluginSetup: pluginSetupV1Mock.address,
      pluginSetupRepo: pluginSetupMockRepoAddress,
      data: EMPTY_DATA,
    };

    const tx = await daoFactory.createDao(daoSettings, [pluginSettings]);
    const {dao, plugin} = await extractInfoFromCreateDaoTx(tx);

    await expect(tx)
      .to.emit(daoRegistry, EVENTS.DAORegistered)
      .withArgs(dao, ownerAddress, daoSettings.name);

    await expect(tx)
      .to.emit(psp, EVENTS.InstallationApplied)
      .withArgs(dao, plugin);
  });

  // it('creates GovernanceWrappedERC20 clone when token is NON-zero', async () => {
  //   const mintAmount = 100;

  //   let tx = await daoFactory.createERC20VotingDAO(
  //     {
  //       name: daoDummyName,
  //       metadata: daoDummyMetadata,
  //     },
  //     dummyVoteSettings,
  //     {
  //       addr: zeroAddress,
  //       name: 'TokenName',
  //       symbol: 'TokenSymbol',
  //     },
  //     {
  //       receivers: [ownerAddress],
  //       amounts: [mintAmount],
  //     },
  //     zeroAddress
  //   );

  //   // get block that tx was mined
  //   const blockNum = await ethers.provider.getBlockNumber();

  //   const {
  //     dao: createdDao,
  //     token,
  //     voting,
  //     creator,
  //     name,
  //   } = await getDeployments(tx, true);

  //   expect(name).to.equal(daoDummyName);

  //   expect(creator).to.equal(ownerAddress);

  //   await ethers.provider.send('evm_mine', []);

  //   expect(await token.getPastVotes(ownerAddress, blockNum)).to.equal(
  //     mintAmount
  //   );

  //   const EXECUTE_PERMISSION_ID = await createdDao.EXECUTE_PERMISSION_ID();

  //   const DAOPermissions = await Promise.all([
  //     createdDao.SET_METADATA_PERMISSION_ID(),
  //     createdDao.ROOT_PERMISSION_ID(),
  //     createdDao.WITHDRAW_PERMISSION_ID(),
  //     createdDao.UPGRADE_PERMISSION_ID(),
  //     createdDao.SET_SIGNATURE_VALIDATOR_PERMISSION_ID(),
  //   ]);

  //   // ======== Test Permission events that were emitted successfully ==========

  //   tx = expect(tx);

  //   // Check if correct PermissionManager events are thrown.
  //   tx = tx.to
  //     .emit(createdDao, EVENTS.MetadataSet)
  //     .withArgs(daoDummyMetadata)
  //     .to.emit(voting, EVENTS.ConfigUpdated)
  //     .withArgs(
  //       dummyVoteSettings.participationRequiredPct,
  //       dummyVoteSettings.supportRequiredPct,
  //       dummyVoteSettings.minDuration
  //     );

  //   // @ts-ignore
  //   DAOPermissions.map(item => {
  //     tx = tx.to
  //       .emit(createdDao, EVENTS.Granted)
  //       .withArgs(
  //         item,
  //         daoFactory.address,
  //         createdDao.address,
  //         createdDao.address,
  //         PermissionManagerAllowFlagAddress
  //       );
  //   });

  //   tx = tx.to
  //     .emit(createdDao, EVENTS.Granted)
  //     .withArgs(
  //       SET_CONFIGURATION_PERMISSION_ID,
  //       daoFactory.address,
  //       createdDao.address,
  //       voting.address,
  //       PermissionManagerAllowFlagAddress
  //     )
  //     .to.emit(createdDao, EVENTS.Revoked)
  //     .withArgs(
  //       DAOPermissions[1],
  //       daoFactory.address,
  //       daoFactory.address,
  //       createdDao.address
  //     )
  //     .to.emit(createdDao, EVENTS.Granted)
  //     .withArgs(
  //       EXECUTE_PERMISSION_ID,
  //       daoFactory.address,
  //       voting.address,
  //       createdDao.address,
  //       PermissionManagerAllowFlagAddress
  //     );

  //   // ===== Test if user can create a vote and execute it ======

  //   // should be only callable by ERC20Voting
  //   await expect(createdDao.execute(0, [])).to.be.revertedWith(
  //     customError(
  //       'Unauthorized',
  //       createdDao.address,
  //       createdDao.address,
  //       ownerAddress,
  //       EXECUTE_PERMISSION_ID
  //     )
  //   );

  //   await expect(voting.setConfiguration(1, 2, 3)).to.be.revertedWith(
  //     customError(
  //       'DaoUnauthorized',
  //       createdDao.address,
  //       voting.address,
  //       voting.address,
  //       ownerAddress,
  //       SET_CONFIGURATION_PERMISSION_ID
  //     )
  //   );

  //   const actions = [
  //     {
  //       to: actionExecuteContract.address,
  //       value: 0,
  //       data: actionExecuteContract.interface.encodeFunctionData('setTest', []),
  //     },
  //     {
  //       to: voting.address,
  //       value: 0,
  //       data: voting.interface.encodeFunctionData(
  //         'setConfiguration',
  //         [3, 4, 5]
  //       ),
  //     },
  //   ];

  //   await voting.createVote('0x', actions, 0, 0, false, VoteOption.Yes);

  //   expect(await voting.vote(0, VoteOption.Yes, true))
  //     .to.emit(createdDao, EVENTS.Executed)
  //     .withArgs(voting.address, 0, [], [])
  //     .to.emit(voting, EVENTS.ConfigUpdated)
  //     .withArgs(3, 4, 5);

  //   expect(await actionExecuteContract.test()).to.equal(true);
  // });

  // it('creates AllowlistVoting DAO', async () => {
  //   let tx = await daoFactory.createAllowlistVotingDAO(
  //     {
  //       name: daoDummyName,
  //       metadata: daoDummyMetadata,
  //     },
  //     dummyVoteSettings,
  //     [ownerAddress],
  //     zeroAddress
  //   );

  //   const {
  //     dao: createdDao,
  //     voting,
  //     creator,
  //     name,
  //   } = await getDeployments(tx, false);

  //   expect(name).to.equal(daoDummyName);

  //   expect(creator).to.equal(ownerAddress);

  //   await ethers.provider.send('evm_mine', []);

  //   const DAOPermissions = await Promise.all([
  //     createdDao.SET_METADATA_PERMISSION_ID(),
  //     createdDao.ROOT_PERMISSION_ID(),
  //     createdDao.WITHDRAW_PERMISSION_ID(),
  //     createdDao.UPGRADE_PERMISSION_ID(),
  //     createdDao.SET_SIGNATURE_VALIDATOR_PERMISSION_ID(),
  //   ]);

  //   // ======== Test Permission events that were emitted successfully ==========

  //   tx = expect(tx);

  //   // Check if correct PermissionManager events are thrown.
  //   tx = tx.to
  //     .emit(createdDao, EVENTS.MetadataSet)
  //     .withArgs(daoDummyMetadata)
  //     .to.emit(voting, EVENTS.ConfigUpdated)
  //     .withArgs(
  //       dummyVoteSettings.participationRequiredPct,
  //       dummyVoteSettings.supportRequiredPct,
  //       dummyVoteSettings.minDuration
  //     );

  //   // @ts-ignore
  //   DAOPermissions.map(item => {
  //     tx = tx.to
  //       .emit(createdDao, EVENTS.Granted)
  //       .withArgs(
  //         item,
  //         daoFactory.address,
  //         createdDao.address,
  //         createdDao.address,
  //         PermissionManagerAllowFlagAddress
  //       );
  //   });

  //   tx = tx.to
  //     .emit(createdDao, EVENTS.Granted)
  //     .withArgs(
  //       SET_CONFIGURATION_PERMISSION_ID,
  //       daoFactory.address,
  //       createdDao.address,
  //       voting.address,
  //       PermissionManagerAllowFlagAddress
  //     )
  //     .to.emit(createdDao, EVENTS.Granted)
  //     .withArgs(
  //       MODIFY_ALLOWLIST_PERMISSION_ID,
  //       daoFactory.address,
  //       createdDao.address,
  //       voting.address,
  //       PermissionManagerAllowFlagAddress
  //     )
  //     .to.emit(createdDao, EVENTS.Revoked)
  //     .withArgs(
  //       DAOPermissions[1],
  //       daoFactory.address,
  //       daoFactory.address,
  //       createdDao.address
  //     )
  //     .to.emit(createdDao, EVENTS.Granted)
  //     .withArgs(
  //       EXECUTE_PERMISSION_ID,
  //       daoFactory.address,
  //       voting.address,
  //       createdDao.address,
  //       PermissionManagerAllowFlagAddress
  //     );

  //   // ===== Test if user can create a vote and execute it ======

  //   // should be only callable by AllowlistVoting
  //   await expect(createdDao.execute(0, [])).to.be.revertedWith(
  //     customError(
  //       'Unauthorized',
  //       createdDao.address,
  //       createdDao.address,
  //       ownerAddress,
  //       EXECUTE_PERMISSION_ID
  //     )
  //   );

  //   await expect(voting.setConfiguration(1, 2, 3)).to.be.revertedWith(
  //     customError(
  //       'DaoUnauthorized',
  //       createdDao.address,
  //       voting.address,
  //       voting.address,
  //       ownerAddress,
  //       SET_CONFIGURATION_PERMISSION_ID
  //     )
  //   );

  //   const actions = [
  //     {
  //       to: actionExecuteContract.address,
  //       value: 0,
  //       data: actionExecuteContract.interface.encodeFunctionData('setTest', []),
  //     },
  //     {
  //       to: voting.address,
  //       value: 0,
  //       data: voting.interface.encodeFunctionData(
  //         'setConfiguration',
  //         [3, 4, 5]
  //       ),
  //     },
  //   ];

  //   await voting.createVote('0x', actions, 0, 0, false, VoteOption.Yes);

  //   expect(await voting.vote(0, VoteOption.Yes, true))
  //     .to.emit(createdDao, EVENTS.Executed)
  //     .withArgs(voting.address, 0, [], [])
  //     .to.emit(voting, EVENTS.ConfigUpdated)
  //     .withArgs(3, 4, 5);

  //   expect(await actionExecuteContract.test()).to.equal(true);
  // });
});
