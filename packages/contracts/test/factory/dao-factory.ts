import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {VoterState} from '../test-utils/voting';
import {customError} from '../test-utils/custom-error-helper';

const EVENTS = {
  NewDAORegistered: 'NewDAORegistered',
  MetadataSet: 'MetadataSet',
  ConfigUpdated: 'ConfigUpdated',
  DAOCreated: 'DAOCreated',
  Granted: 'Granted',
  Revoked: 'Revoked',
  Executed: 'Executed',
  TokenCreated: 'TokenCreated',
};

const MODIFY_VOTE_CONFIG = ethers.utils.id('MODIFY_VOTE_CONFIG');

const zeroAddress = ethers.constants.AddressZero;
const ACLAnyAddress = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF';
const ACLAllowFlagAddress = '0x0000000000000000000000000000000000000002';
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
    ({event}: {event: any}) => event === EVENTS.NewDAORegistered
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
      : await ethers.getContractAt('WhitelistVoting', voting),
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
    const WhitelistVoting = await hre.artifacts.readArtifact('WhitelistVoting');
    // @ts-ignore
    const Token = await hre.artifacts.readArtifact('GovernanceERC20');

    const _merged = [
      ...DAOFactoryArtifact.abi,
      ...TokenFactoryArtifact.abi.filter((f: any) => f.type === 'event'),
      ...RegistryArtifact.abi.filter((f: any) => f.type === 'event'),
      ...ERC20Voting.abi.filter((f: any) => f.type === 'event'),
      ...WhitelistVoting.abi.filter((f: any) => f.type === 'event'),
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

    // Grant REGISTER_DAO_ROLE to registrer
    managingDAO.grant(
      registry.address,
      daoFactory.address,
      ethers.utils.id('REGISTER_DAO_ROLE')
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

    const {name, dao, token, creator, voting} = await getDeployments(tx, true);

    expect(name).to.equal(daoDummyName);

    expect(creator).to.equal(ownerAddress);

    await ethers.provider.send('evm_mine', []);

    expect(await token.getPastVotes(ownerAddress, blockNum)).to.equal(
      mintAmount
    );

    const MODIFY_VOTE_CONFIG_ROLE = await voting.MODIFY_VOTE_CONFIG();
    const EXEC_ROLE = await dao.EXEC_ROLE();

    const DAORoles = await Promise.all([
      dao.DAO_CONFIG_ROLE(),
      dao.ROOT_ROLE(),
      dao.WITHDRAW_ROLE(),
      dao.UPGRADE_ROLE(),
      dao.SET_SIGNATURE_VALIDATOR_ROLE(),
    ]);

    // ======== Test Role events that were emitted successfully ==========

    tx = expect(tx);

    // Check if correct ACL events are thrown.
    tx = tx.to
      .emit(dao, EVENTS.MetadataSet)
      .withArgs(daoDummyMetadata)
      .to.emit(voting, EVENTS.ConfigUpdated)
      .withArgs(
        dummyVoteSettings.participationRequiredPct,
        dummyVoteSettings.supportRequiredPct,
        dummyVoteSettings.minDuration
      );

    // @ts-ignore
    DAORoles.map(item => {
      tx = tx.to
        .emit(dao, EVENTS.Granted)
        .withArgs(
          item,
          daoFactory.address,
          dao.address,
          dao.address,
          ACLAllowFlagAddress
        );
    });

    tx = tx.to
      .emit(dao, EVENTS.Granted)
      .withArgs(
        MODIFY_VOTE_CONFIG_ROLE,
        daoFactory.address,
        dao.address,
        voting.address,
        ACLAllowFlagAddress
      )
      .to.emit(dao, EVENTS.Revoked)
      .withArgs(
        DAORoles[1],
        daoFactory.address,
        daoFactory.address,
        dao.address
      )
      .to.emit(dao, EVENTS.Granted)
      .withArgs(
        EXEC_ROLE,
        daoFactory.address,
        voting.address,
        dao.address,
        ACLAllowFlagAddress
      );

    // ===== Test if user can create a vote and execute it ======

    // should be only callable by ERC20Voting
    await expect(dao.execute(0, [])).to.be.revertedWith(
      customError('ACLAuth', dao.address, dao.address, ownerAddress, EXEC_ROLE)
    );

    await expect(voting.changeVoteConfig(1, 2, 3)).to.be.revertedWith(
      customError(
        'ACLAuth',
        voting.address,
        voting.address,
        ownerAddress,
        MODIFY_VOTE_CONFIG
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

    await voting.newVote('0x', actions, 0, 0, false, VoterState.Yea);

    expect(await voting.vote(0, VoterState.Yea, true))
      .to.emit(dao, EVENTS.Executed)
      .withArgs(voting.address, 0, [], [])
      .to.emit(voting, EVENTS.ConfigUpdated)
      .withArgs(3, 4, 5);

    expect(await actionExecuteContract.test()).to.equal(true);
  });

  it('creates WhitelistVoting DAO', async () => {
    let tx = await daoFactory.newWhitelistVotingDAO(
      {
        name: daoDummyName,
        metadata: daoDummyMetadata,
      },
      dummyVoteSettings,
      [ownerAddress],
      zeroAddress
    );

    const {name, dao, token, creator, voting} = await getDeployments(tx, false);

    expect(name).to.equal(daoDummyName);
    expect(creator).to.equal(ownerAddress);

    await ethers.provider.send('evm_mine', []);

    const MODIFY_CONFIG_ROLE = await voting.MODIFY_VOTE_CONFIG();
    // @ts-ignore
    const MODIFY_WHITELIST = await voting.MODIFY_WHITELIST();
    const EXEC_ROLE = await dao.EXEC_ROLE();

    const DAORoles = await Promise.all([
      dao.DAO_CONFIG_ROLE(),
      dao.ROOT_ROLE(),
      dao.WITHDRAW_ROLE(),
      dao.UPGRADE_ROLE(),
      dao.SET_SIGNATURE_VALIDATOR_ROLE(),
    ]);

    // ======== Test Role events that were emitted successfully ==========

    tx = expect(tx);

    // Check if correct ACL events are thrown.
    tx = tx.to
      .emit(dao, EVENTS.MetadataSet)
      .withArgs(daoDummyMetadata)
      .to.emit(voting, EVENTS.ConfigUpdated)
      .withArgs(
        dummyVoteSettings.participationRequiredPct,
        dummyVoteSettings.supportRequiredPct,
        dummyVoteSettings.minDuration
      );

    // @ts-ignore
    DAORoles.map(item => {
      tx = tx.to
        .emit(dao, EVENTS.Granted)
        .withArgs(
          item,
          daoFactory.address,
          dao.address,
          dao.address,
          ACLAllowFlagAddress
        );
    });

    tx = tx.to
      .emit(dao, EVENTS.Granted)
      .withArgs(
        MODIFY_CONFIG_ROLE,
        daoFactory.address,
        dao.address,
        voting.address,
        ACLAllowFlagAddress
      )
      .to.emit(dao, EVENTS.Granted)
      .withArgs(
        MODIFY_WHITELIST,
        daoFactory.address,
        dao.address,
        voting.address,
        ACLAllowFlagAddress
      )
      .to.emit(dao, EVENTS.Revoked)
      .withArgs(
        DAORoles[1],
        daoFactory.address,
        daoFactory.address,
        dao.address
      )
      .to.emit(dao, EVENTS.Granted)
      .withArgs(
        EXEC_ROLE,
        daoFactory.address,
        voting.address,
        dao.address,
        ACLAllowFlagAddress
      );

    // ===== Test if user can create a vote and execute it ======

    // should be only callable by WhitelistVoting
    await expect(dao.execute(0, [])).to.be.revertedWith(
      customError('ACLAuth', dao.address, dao.address, ownerAddress, EXEC_ROLE)
    );

    await expect(voting.changeVoteConfig(1, 2, 3)).to.be.revertedWith(
      customError(
        'ACLAuth',
        voting.address,
        voting.address,
        ownerAddress,
        MODIFY_VOTE_CONFIG
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

    await voting.newVote('0x', actions, 0, 0, false, VoterState.Yea);

    expect(await voting.vote(0, VoterState.Yea, true))
      .to.emit(dao, EVENTS.Executed)
      .withArgs(voting.address, 0, [], [])
      .to.emit(voting, EVENTS.ConfigUpdated)
      .withArgs(3, 4, 5);

    expect(await actionExecuteContract.test()).to.equal(true);
  });
});
