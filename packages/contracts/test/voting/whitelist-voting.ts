import chai, {expect} from 'chai';
import {ethers} from 'hardhat';
import chaiUtils from '../test-utils';
import {VoterState} from '../test-utils/voting';

chai.use(chaiUtils);

import {WhitelistVoting} from '../../typechain';

const ERRORS = {
  ERROR_INIT_PCTS: 'VOTING_INIT_PCTS',
  ERROR_INIT_SUPPORT_TOO_BIG: 'VOTING_INIT_SUPPORT_TOO_BIG',
  ERROR_MIN_DURATION_NO_ZERO: 'VOTING_MIN_DURATION_NO_ZERO',
  ERROR_VOTE_DATES_WRONG: 'VOTING_DURATION_TIME_WRONG',
  ERROR_NO_VOTING_POWER: 'VOTING_NO_VOTING_POWER',
  ERROR_CAN_NOT_VOTE: 'VOTING_CAN_NOT_VOTE',
  ERROR_CHANGE_SUPPORT_PCTS: 'VOTING_CHANGE_SUPPORT_PCTS',
  ERROR_SUPPORT_TOO_BIG: 'VOTING_SUPPORT_TOO_BIG',
  ERROR_PARTICIPATION_TOO_BIG: 'VOTING_PARTICIPATION_TOO_BIG',
  ERROR_CAN_NOT_EXECUTE: 'VOTING_CAN_NOT_EXECUTE',
  ERROR_CAN_NOT_CREATE_VOTE: 'VOTING_CAN_NOT_CREATE_VOTE',
  ALREADY_INITIALIZED: 'Initializable: contract is already initialized',
};

const toBn = ethers.BigNumber.from;
const bigExp = (x: number, y: number) => toBn(x).mul(toBn(10).pow(toBn(y)));
const pct16 = (x: number) => bigExp(x, 16);

const EVENTS = {
  UPDATE_CONFIG: 'UpdateConfig',
  START_VOTE: 'StartVote',
  CAST_VOTE: 'CastVote',
  EXECUTED: 'Executed',
};

describe('WhitelistVoting', function () {
  let signers: any;
  let voting: WhitelistVoting;
  let daoMock: any;
  let ownerAddress: string;
  let user1: string;
  let dummyActions: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
    user1 = await signers[1].getAddress();

    dummyActions = [
      {
        to: ownerAddress,
        data: '0x00000000',
        value: 0,
      },
    ];

    const DAOMock = await ethers.getContractFactory('DAOMock');
    daoMock = await DAOMock.deploy(ownerAddress);
  });

  beforeEach(async () => {
    const WhitelistVoting = await ethers.getContractFactory('WhitelistVoting');
    voting = await WhitelistVoting.deploy();
  });

  function initializeVoting(
    whitelisted: Array<string>,
    participationRequired: any,
    supportRequired: any,
    minDuration: any
  ) {
    return voting['initialize(address,address,address[],uint64,uint64,uint64)'](
      daoMock.address,
      ethers.constants.AddressZero,
      whitelisted,
      participationRequired,
      supportRequired,
      minDuration
    );
  }

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await initializeVoting([], 1, 2, 3);

      await expect(initializeVoting([], 1, 2, 3)).to.be.revertedWith(
        ERRORS.ALREADY_INITIALIZED
      );
    });

    it('reverts if min duration is 0', async () => {
      await expect(initializeVoting([], 1, 2, 0)).to.be.revertedWith(
        ERRORS.ERROR_MIN_DURATION_NO_ZERO
      );
    });

    it('should initialize dao on the component', async () => {
      // TODO: Waffle's calledOnContractWith is not supported by Hardhat
      // await voting['initialize(address,address,uint64[3],bytes[])']
      //          (daoMock.address, erc20VoteMock.address, [1, 2, 3], [])
      // expect('initialize').to.be.calledOnContractWith(voting, [daoMock.address]);
    });
  });

  describe('WhitelistingUsers: ', async () => {
    beforeEach(async () => {
      await initializeVoting([], 1, 2, 3);
    });
    it('should return fasle, if user is not whitelisted', async () => {
      expect(await voting.whitelisted(ownerAddress)).to.equal(false);
    });

    it('should add new users in the whitelist', async () => {
      await voting.addWhitelistedUsers([ownerAddress, user1]);
      expect(await voting.whitelisted(ownerAddress)).to.equal(true);
      expect(await voting.whitelisted(user1)).to.equal(true);
    });

    it('should remove users from the whitelist', async () => {
      await voting.addWhitelistedUsers([ownerAddress]);
      expect(await voting.whitelisted(ownerAddress)).to.equal(true);

      await voting.removeWhitelistedUsers([ownerAddress]);
      expect(await voting.whitelisted(ownerAddress)).to.equal(false);
    });
  });

  describe('UpdateConfig: ', async () => {
    beforeEach(async () => {
      await initializeVoting([], 1, 2, 3);
    });
    it('reverts if wrong config is set', async () => {
      await expect(
        voting.changeVoteConfig(1, pct16(1000), 3)
      ).to.be.revertedWith(ERRORS.ERROR_SUPPORT_TOO_BIG);

      await expect(
        voting.changeVoteConfig(pct16(1000), 2, 3)
      ).to.be.revertedWith(ERRORS.ERROR_PARTICIPATION_TOO_BIG);

      await expect(voting.changeVoteConfig(1, 2, 0)).to.be.revertedWith(
        ERRORS.ERROR_MIN_DURATION_NO_ZERO
      );
    });

    it('should change config successfully', async () => {
      expect(await voting.changeVoteConfig(2, 4, 8))
        .to.emit(voting, EVENTS.UPDATE_CONFIG)
        .withArgs(2, 4, 8);
    });
  });

  describe('StartVote', async () => {
    let minDuration = 3;
    beforeEach(async () => {
      await initializeVoting([ownerAddress], 1, 2, 3);
    });

    it('reverts if user is not whitelisted to create a vote', async () => {
      await expect(
        voting.connect(signers[1]).newVote('0x00', [], 0, 0, false, false)
      ).to.be.revertedWith(ERRORS.ERROR_CAN_NOT_CREATE_VOTE);
    });

    it('reverts if vote duration is less than minDuration', async () => {
      const block = await ethers.provider.getBlock('latest');
      await expect(
        voting.newVote(
          '0x00',
          [],
          block.timestamp,
          block.timestamp + (minDuration - 1),
          false,
          false
        )
      ).to.be.revertedWith(ERRORS.ERROR_VOTE_DATES_WRONG);
    });

    it('should create a vote successfully, but not vote', async () => {
      expect(await voting.newVote('0x00', dummyActions, 0, 0, false, false))
        .to.emit(voting, EVENTS.START_VOTE)
        .withArgs(0, ownerAddress, '0x00');

      const vote = await voting.getVote(0);
      expect(vote.open).to.equal(true);
      expect(vote.executed).to.equal(false);
      expect(vote.supportRequired).to.equal(2);
      expect(vote.participationRequired).to.equal(1);
      expect(vote.yea).to.equal(0);
      expect(vote.nay).to.equal(0);

      expect(vote.startDate.add(minDuration)).to.equal(vote.endDate);

      expect(await voting.canVote(0, ownerAddress)).to.equal(true);
      expect(await voting.canVote(0, user1)).to.equal(false);

      expect(vote.actions).to.eql([
        [dummyActions[0].to, toBn(dummyActions[0].value), dummyActions[0].data],
      ]);
    });

    it('should create a vote and cast a vote immediatelly', async () => {
      expect(await voting.newVote('0x00', dummyActions, 0, 0, false, true))
        .to.emit(voting, EVENTS.START_VOTE)
        .withArgs(0, ownerAddress, '0x00')
        .to.emit(voting, EVENTS.CAST_VOTE)
        .withArgs(0, ownerAddress, VoterState.Yea);

      const vote = await voting.getVote(0);
      expect(vote.open).to.equal(true);
      expect(vote.executed).to.equal(false);
      expect(vote.supportRequired).to.equal(2);
      expect(vote.participationRequired).to.equal(1);

      expect(vote.yea).to.equal(1);
      expect(vote.nay).to.equal(0);
    });
  });

  describe('Vote + Execute:', async () => {
    let minDuration = 500;
    let supportRequired = pct16(29);
    let minimumQuorom = pct16(19);

    beforeEach(async () => {
      const addresses = [];

      for (let i = 0; i < 10; i++) {
        const addr = await signers[i].getAddress();
        addresses.push(addr);
      }

      // voting will be initialized with 10 whitelisted addresses
      // Which means votingPower = 10 at this point.
      await initializeVoting(
        addresses,
        minimumQuorom,
        supportRequired,
        minDuration
      );

      await voting.newVote('0x00', dummyActions, 0, 0, false, false);
    });

    // VoterState.Yea
    it('increases the yea or nay count and emit correct events', async () => {
      expect(await voting.vote(0, VoterState.Yea, false))
        .to.emit(voting, EVENTS.CAST_VOTE)
        .withArgs(0, ownerAddress, VoterState.Yea);

      let vote = await voting.getVote(0);
      expect(vote.yea).to.equal(1);

      expect(await voting.vote(0, VoterState.Nay, false))
        .to.emit(voting, EVENTS.CAST_VOTE)
        .withArgs(0, ownerAddress, VoterState.Nay);

      vote = await voting.getVote(0);
      expect(vote.nay).to.equal(1);

      expect(await voting.vote(0, VoterState.Abstain, false))
        .to.emit(voting, EVENTS.CAST_VOTE)
        .withArgs(0, ownerAddress, VoterState.Abstain);

      vote = await voting.getVote(0);
      expect(vote.abstain).to.equal(1);
    });

    it('voting multiple times should not increase yea or nay multiple times', async () => {
      // yea still ends up to be 1 here even after voting
      // 2 times from the same wallet.
      await voting.vote(0, VoterState.Yea, false);
      await voting.vote(0, VoterState.Yea, false);
      expect((await voting.getVote(0)).yea).to.equal(1);

      // yea gets removed, nay ends up as 1.
      await voting.vote(0, VoterState.Nay, false);
      await voting.vote(0, VoterState.Nay, false);
      expect((await voting.getVote(0)).nay).to.equal(1);

      await voting.vote(0, VoterState.Abstain, false);
      await voting.vote(0, VoterState.Abstain, false);
      expect((await voting.getVote(0)).abstain).to.equal(1);
    });

    it('makes executable if enough yea is given from on voting power', async () => {
      // Since voting power is set to 29%, and
      // whitelised is 10 addresses, voting yea
      // from 3 addresses should be enough to
      // make vote executable
      await voting.vote(0, VoterState.Yea, false);
      await voting.connect(signers[1]).vote(0, VoterState.Yea, false);

      // // only 2 voted, not enough for 30%
      expect(await voting.canExecute(0)).to.equal(false);
      // // 3rd votes, enough.
      await voting.connect(signers[2]).vote(0, VoterState.Yea, false);

      expect(await voting.canExecute(0)).to.equal(true);
    });

    it('makes executable if enough yea is given depending on yea + nay total', async () => {
      // 2 supports
      await voting.connect(signers[0]).vote(0, VoterState.Yea, false);
      await voting.connect(signers[1]).vote(0, VoterState.Yea, false);

      // 2 not supports
      await voting.connect(signers[2]).vote(0, VoterState.Nay, false);
      await voting.connect(signers[3]).vote(0, VoterState.Nay, false);

      // 2 abstain
      await voting.connect(signers[4]).vote(0, VoterState.Abstain, false);
      await voting.connect(signers[5]).vote(0, VoterState.Abstain, false);

      expect(await voting.canExecute(0)).to.equal(false);

      // makes the voting closed.
      await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
      await ethers.provider.send('evm_mine', []);

      // 2 voted yea, 2 voted yea. 2 voted abstain.
      // Enough to surpass supportedRequired percentage
      expect(await voting.canExecute(0)).to.equal(true);
    });

    it('executes the vote immediatelly while final yea is given', async () => {
      // 2 votes in favor of yea
      await voting.connect(signers[0]).vote(0, VoterState.Yea, false);
      await voting.connect(signers[1]).vote(0, VoterState.Yea, false);

      // 3th supports(which is enough) and should execute right away.
      expect(await voting.connect(signers[3]).vote(0, VoterState.Yea, true))
        .to.emit(daoMock, EVENTS.EXECUTED)
        .withArgs(
          voting.address,
          0,
          [
            [
              dummyActions[0].to,
              ethers.BigNumber.from(dummyActions[0].value),
              dummyActions[0].data,
            ],
          ],
          []
        );

      const vote = await voting.getVote(0);

      expect(vote.executed).to.equal(true);

      // calling execute again should fail
      await expect(voting.execute(0)).to.be.revertedWith(
        ERRORS.ERROR_CAN_NOT_EXECUTE
      );
    });

    it('reverts if vote is executed while enough yea is not given ', async () => {
      await expect(voting.execute(0)).to.be.revertedWith(
        ERRORS.ERROR_CAN_NOT_EXECUTE
      );
    });
  });
});
