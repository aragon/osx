import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {VoteOption} from '../test-utils/voting';
import {customError} from '../test-utils/custom-error-helper';

const EVENTS = {
  DAORegistered: 'DAORegistered',
  MetadataSet: 'MetadataSet',
  ConfigUpdated: 'ConfigUpdated',
  DAOCreated: 'DAOCreated',
  Granted: 'Granted',
  Revoked: 'Revoked',
  Executed: 'Executed',
  TokenCreated: 'TokenCreated',
};

const CHANGE_VOTE_CONFIG_PERMISSION_ID = ethers.utils.id(
  'CHANGE_VOTE_CONFIG_PERMISSION_ID'
);
const MODIFY_ALLOWLIST_PERMISSION_ID = ethers.utils.id(
  'MODIFY_ALLOWLIST_PERMISSION_ID'
);
const EXEC_PERMISSION_ID = ethers.utils.id('EXEC_PERMISSION_ID');

const zeroAddress = ethers.constants.AddressZero;
const PermissionManagerAnyAddress =
  '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF';
const PermissionManagerAllowFlagAddress =
  '0x0000000000000000000000000000000000000002';
const daoDummyName = 'dao1';
const daoDummyMetadata = '0x0000';
const dummyVoteSettings = {
  participationRequiredPct: 1,
  supportRequiredPct: 2,
  minDuration: 3,
};

async function getDeployments(tx: any, tokenVoting: boolean) {
  const data = await tx.wait();
  const {events} = data;
  const {name, dao, creator} = events.find(
    ({event}: {event: any}) => event === EVENTS.DAORegistered
  ).args;

  const token = tokenVoting
    ? events.find(({event}: {event: any}) => event === EVENTS.TokenCreated).args
        .token
    : zeroAddress;

  const {voting} = events.find(
    ({event}: {event: any}) => event === EVENTS.DAOCreated
  ).args;

  return {
    token: await ethers.getContractAt('GovernanceERC20', token),
    dao: await ethers.getContractAt('DAO', dao),
    voting: tokenVoting
      ? await ethers.getContractAt('ERC20Voting', voting)
      : await ethers.getContractAt('AllowlistVoting', voting),
    creator,
    name,
  };
}

// This is more like e2e test that tests the whole flow.

describe('DAOFactory: ', function () {
  let daoFactory: any;
  let managingDAO: any;

  let actionExecuteContract: any; // contract

  let signers: SignerWithAddress[];
  let ownerAddress: string;

  let mergedABI: any;
  let daoFactoryBytecode: any;

  async function getMergedABI() {
    // @ts-ignore
    const RegistryArtifact = await hre.artifacts.readArtifact('DAORegistry');
    // @ts-ignore
    const TokenFactoryArtifact = await hre.artifacts.readArtifact(
      'TokenFactory'
    );
    // @ts-ignore
    const DAOFactoryArtifact = await hre.artifacts.readArtifact('DAOFactory');
    // @ts-ignore
    const ERC20Voting = await hre.artifacts.readArtifact('ERC20Voting');
    // @ts-ignore
    const AllowlistVoting = await hre.artifacts.readArtifact('AllowlistVoting');
    // @ts-ignore
    const Token = await hre.artifacts.readArtifact('GovernanceERC20');

    const _merged = [
      ...DAOFactoryArtifact.abi,
      ...TokenFactoryArtifact.abi.filter((f: any) => f.type === 'event'),
      ...RegistryArtifact.abi.filter((f: any) => f.type === 'event'),
      ...ERC20Voting.abi.filter((f: any) => f.type === 'event'),
      ...AllowlistVoting.abi.filter((f: any) => f.type === 'event'),
      ...Token.abi.filter((f: any) => f.type === 'event'),
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
    managingDAO = await ManagingDAO.deploy();
    await managingDAO.initialize(
      '0x00',
      ownerAddress,
      ethers.constants.AddressZero
    );

    // DAO Registry
    const Registry = await ethers.getContractFactory('DAORegistry');
    const registry = await Registry.deploy();
    await registry.initialize(managingDAO.address);

    // Token Facotry
    const TokenFactory = await ethers.getContractFactory('TokenFactory');
    const tokenFactory = await TokenFactory.deploy();

    // Dao Facotry
    const DAOFactory = new ethers.ContractFactory(
      mergedABI,
      daoFactoryBytecode,
      signers[0]
    );

    daoFactory = await DAOFactory.deploy(
      registry.address,
      tokenFactory.address
    );

    const ActionExecuteContract = await ethers.getContractFactory(
      'ActionExecute'
    );
    actionExecuteContract = await ActionExecuteContract.deploy();

    // Grant the `REGISTER_DAO_PERMISSION_ID` permission to the `daoFactory`
    managingDAO.grant(
      registry.address,
      daoFactory.address,
      ethers.utils.id('REGISTER_DAO_PERMISSION_ID')
    );
  });

  it('creates GovernanceWrappedERC20 clone when token is NON-zero', async () => {
    const mintAmount = 100;

    let tx = await daoFactory.newERC20VotingDAO(
      {
        name: daoDummyName,
        metadata: daoDummyMetadata,
      },
      dummyVoteSettings,
      {
        addr: zeroAddress,
        name: 'TokenName',
        symbol: 'TokenSymbol',
      },
      {
        receivers: [ownerAddress],
        amounts: [mintAmount],
      },
      zeroAddress
    );

    // get block that tx was mined
    const blockNum = await ethers.provider.getBlockNumber();

    const {
      name,
      dao: managingDao,
      token,
      creator,
      voting,
    } = await getDeployments(tx, true);

    expect(name).to.equal(daoDummyName);

    expect(creator).to.equal(ownerAddress);

    await ethers.provider.send('evm_mine', []);

    expect(await token.getPastVotes(ownerAddress, blockNum)).to.equal(
      mintAmount
    );

    const EXEC_PERMISSION_ID = await managingDao.EXEC_PERMISSION_ID();

    const DAOPermissions = await Promise.all([
      managingDao.SET_METADATA_PERMISSION_ID(),
      managingDao.ROOT_PERMISSION_ID(),
      managingDao.WITHDRAW_PERMISSION_ID(),
      managingDao.UPGRADE_PERMISSION_ID(),
      managingDao.SET_SIGNATURE_VALIDATOR_PERMISSION_ID(),
    ]);

    // ======== Test Role events that were emitted successfully ==========

    tx = expect(tx);

    // Check if correct PermissionManager events are thrown.
    tx = tx.to
      .emit(managingDao, EVENTS.MetadataSet)
      .withArgs(daoDummyMetadata)
      .to.emit(voting, EVENTS.ConfigUpdated)
      .withArgs(
        dummyVoteSettings.participationRequiredPct,
        dummyVoteSettings.supportRequiredPct,
        dummyVoteSettings.minDuration
      );

    // @ts-ignore
    DAOPermissions.map(item => {
      tx = tx.to
        .emit(managingDao, EVENTS.Granted)
        .withArgs(
          item,
          daoFactory.address,
          managingDao.address,
          managingDao.address,
          PermissionManagerAllowFlagAddress
        );
    });

    tx = tx.to
      .emit(managingDao, EVENTS.Granted)
      .withArgs(
        CHANGE_VOTE_CONFIG_PERMISSION_ID,
        daoFactory.address,
        managingDao.address,
        voting.address,
        PermissionManagerAllowFlagAddress
      )
      .to.emit(managingDao, EVENTS.Revoked)
      .withArgs(
        DAOPermissions[1],
        daoFactory.address,
        daoFactory.address,
        managingDao.address
      )
      .to.emit(managingDao, EVENTS.Granted)
      .withArgs(
        EXEC_PERMISSION_ID,
        daoFactory.address,
        voting.address,
        managingDao.address,
        PermissionManagerAllowFlagAddress
      );

    // ===== Test if user can create a vote and execute it ======

    // should be only callable by ERC20Voting
    await expect(managingDao.execute(0, [])).to.be.revertedWith(
      customError(
        'PermissionMissing',
        managingDao.address,
        managingDao.address,
        ownerAddress,
        EXEC_PERMISSION_ID
      )
    );

    await expect(voting.changeVoteConfig(1, 2, 3)).to.be.revertedWith(
      customError(
        'DAOPermissionMissing',
        managingDao.address,
        voting.address,
        voting.address,
        ownerAddress,
        CHANGE_VOTE_CONFIG_PERMISSION_ID
      )
    );

    const actions = [
      {
        to: actionExecuteContract.address,
        value: 0,
        data: actionExecuteContract.interface.encodeFunctionData('setTest', []),
      },
      {
        to: voting.address,
        value: 0,
        data: voting.interface.encodeFunctionData(
          'changeVoteConfig',
          [3, 4, 5]
        ),
      },
    ];

    await voting.createVote('0x', actions, 0, 0, false, VoteOption.Yes);

    expect(await voting.vote(0, VoteOption.Yes, true))
      .to.emit(managingDao, EVENTS.Executed)
      .withArgs(voting.address, 0, [], [])
      .to.emit(voting, EVENTS.ConfigUpdated)
      .withArgs(3, 4, 5);

    expect(await actionExecuteContract.test()).to.equal(true);
  });

  it('creates AllowlistVoting DAO', async () => {
    let tx = await daoFactory.newAllowlistVotingDAO(
      {
        name: daoDummyName,
        metadata: daoDummyMetadata,
      },
      dummyVoteSettings,
      [ownerAddress],
      zeroAddress
    );

    const {
      name,
      dao: managingDao,
      token,
      creator,
      voting,
    } = await getDeployments(tx, false);

    expect(name).to.equal(daoDummyName);
    expect(creator).to.equal(ownerAddress);

    await ethers.provider.send('evm_mine', []);

    const DAOPermissions = await Promise.all([
      managingDao.SET_METADATA_PERMISSION_ID(),
      managingDao.ROOT_PERMISSION_ID(),
      managingDao.WITHDRAW_PERMISSION_ID(),
      managingDao.UPGRADE_PERMISSION_ID(),
      managingDao.SET_SIGNATURE_VALIDATOR_PERMISSION_ID(),
    ]);

    // ======== Test Role events that were emitted successfully ==========

    tx = expect(tx);

    // Check if correct PermissionManager events are thrown.
    tx = tx.to
      .emit(managingDao, EVENTS.MetadataSet)
      .withArgs(daoDummyMetadata)
      .to.emit(voting, EVENTS.ConfigUpdated)
      .withArgs(
        dummyVoteSettings.participationRequiredPct,
        dummyVoteSettings.supportRequiredPct,
        dummyVoteSettings.minDuration
      );

    // @ts-ignore
    DAOPermissions.map(item => {
      tx = tx.to
        .emit(managingDao, EVENTS.Granted)
        .withArgs(
          item,
          daoFactory.address,
          managingDao.address,
          managingDao.address,
          PermissionManagerAllowFlagAddress
        );
    });

    tx = tx.to
      .emit(managingDao, EVENTS.Granted)
      .withArgs(
        CHANGE_VOTE_CONFIG_PERMISSION_ID,
        daoFactory.address,
        managingDao.address,
        voting.address,
        PermissionManagerAllowFlagAddress
      )
      .to.emit(managingDao, EVENTS.Granted)
      .withArgs(
        MODIFY_ALLOWLIST_PERMISSION_ID,
        daoFactory.address,
        managingDao.address,
        voting.address,
        PermissionManagerAllowFlagAddress
      )
      .to.emit(managingDao, EVENTS.Revoked)
      .withArgs(
        DAOPermissions[1],
        daoFactory.address,
        daoFactory.address,
        managingDao.address
      )
      .to.emit(managingDao, EVENTS.Granted)
      .withArgs(
        EXEC_PERMISSION_ID,
        daoFactory.address,
        voting.address,
        managingDao.address,
        PermissionManagerAllowFlagAddress
      );

    // ===== Test if user can create a vote and execute it ======

    // should be only callable by AllowlistVoting
    await expect(managingDao.execute(0, [])).to.be.revertedWith(
      customError(
        'PermissionMissing',
        managingDao.address,
        managingDao.address,
        ownerAddress,
        EXEC_PERMISSION_ID
      )
    );

    await expect(voting.changeVoteConfig(1, 2, 3)).to.be.revertedWith(
      customError(
        'DAOPermissionMissing',
        managingDao.address,
        voting.address,
        voting.address,
        ownerAddress,
        CHANGE_VOTE_CONFIG_PERMISSION_ID
      )
    );

    const actions = [
      {
        to: actionExecuteContract.address,
        value: 0,
        data: actionExecuteContract.interface.encodeFunctionData('setTest', []),
      },
      {
        to: voting.address,
        value: 0,
        data: voting.interface.encodeFunctionData(
          'changeVoteConfig',
          [3, 4, 5]
        ),
      },
    ];

    await voting.createVote('0x', actions, 0, 0, false, VoteOption.Yes);

    expect(await voting.vote(0, VoteOption.Yes, true))
      .to.emit(managingDao, EVENTS.Executed)
      .withArgs(voting.address, 0, [], [])
      .to.emit(voting, EVENTS.ConfigUpdated)
      .withArgs(3, 4, 5);

    expect(await actionExecuteContract.test()).to.equal(true);
  });
});
