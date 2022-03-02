import chai, {expect} from 'chai';
import {ethers, waffle} from 'hardhat';
import chaiUtils from '../test-utils';
import {VoterState} from '../test-utils/voting';

chai.use(chaiUtils);

import {ERC20Voting} from '../../typechain';
import ERC20Governance from '../../artifacts/contracts/tokens/GovernanceERC20.sol/GovernanceERC20.json';

const {deployMockContract} = waffle;

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

describe('ERC20Voting', function () {
  let signers: any;
  let voting: ERC20Voting;
  let daoMock: any;
  let erc20VoteMock: any;
  let ownerAddress: string;
  let dummyActions: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

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
    erc20VoteMock = await deployMockContract(signers[0], ERC20Governance.abi);

    const ERC20Voting = await ethers.getContractFactory('ERC20Voting');
    voting = await ERC20Voting.deploy();
  });

  function initializeVoting(
    participationRequired: any,
    supportRequired: any,
    minDuration: any
  ) {
    // @ts-ignore
    return voting['initialize(address,address,address,uint64,uint64,uint64)'](
      daoMock.address,
      erc20VoteMock.address,
      ethers.constants.AddressZero,
      participationRequired,
      supportRequired,
      minDuration
    );
  }

  describe('initialize: ', async () => {
    it('reverts if min duration is 0', async () => {
      await expect(initializeVoting(1, 2, 0)).to.be.revertedWith(
        ERRORS.ERROR_MIN_DURATION_NO_ZERO
      );
    });

    it('reverts if trying to re-initialize', async () => {
      await initializeVoting(1, 2, 3);

      await expect(initializeVoting(2, 1, 3)).to.be.revertedWith(
        ERRORS.ALREADY_INITIALIZED
      );
    });
    it('should initialize dao on the component', async () => {
      // TODO: Waffle's calledOnContractWith is not supported by Hardhat
      // await voting['initialize(address,address,uint64[3],bytes[])']
      //          (daoMock.address, erc20VoteMock.address, [1, 2, 3], [])
      // expect('initialize').to.be.calledOnContractWith(voting, [daoMock.address]);
    });
  });

  describe('UpdateConfig: ', async () => {
    beforeEach(async () => {
      await initializeVoting(1, 2, 3);
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
      await initializeVoting(1, 2, minDuration);
    });

    it('reverts total token supply while creating a vote is 0', async () => {
      await erc20VoteMock.mock.getPastTotalSupply.returns(0);
      await expect(
        voting.newVote('0x00', [], 0, 0, false, false)
      ).to.be.revertedWith(ERRORS.ERROR_NO_VOTING_POWER);
    });

    it('reverts if vote duration is less than minDuration', async () => {
      await erc20VoteMock.mock.getPastTotalSupply.returns(1);
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
      await erc20VoteMock.mock.getPastTotalSupply.returns(1);
      await erc20VoteMock.mock.getPastVotes.returns(0);

      expect(await voting.newVote('0x00', dummyActions, 0, 0, false, false))
        .to.emit(voting, EVENTS.START_VOTE)
        .withArgs(0, ownerAddress, '0x00');

      const vote = await voting.getVote(0);
      expect(vote.open).to.equal(true);
      expect(vote.executed).to.equal(false);
      expect(vote.supportRequired).to.equal(2);
      expect(vote.participationRequired).to.equal(1);
      expect(vote.votingPower).to.equal(1);
      expect(vote.yea).to.equal(0);
      expect(vote.nay).to.equal(0);

      expect(vote.startDate.add(minDuration)).to.equal(vote.endDate);

      expect(await voting.canVote(1, ownerAddress)).to.equal(false);

      expect(vote.actions).to.eql([
        [dummyActions[0].to, toBn(dummyActions[0].value), dummyActions[0].data],
      ]);
    });

    it('should create a vote and cast a vote immediatelly', async () => {
      await erc20VoteMock.mock.getPastTotalSupply.returns(1);
      await erc20VoteMock.mock.getPastVotes.returns(1);

      expect(await voting.newVote('0x00', dummyActions, 0, 0, false, true))
        .to.emit(voting, EVENTS.START_VOTE)
        .withArgs(0, ownerAddress, '0x00')
        .to.emit(voting, EVENTS.CAST_VOTE)
        .withArgs(0, ownerAddress, VoterState.Yea, 1);

      const vote = await voting.getVote(0);
      expect(vote.open).to.equal(true);
      expect(vote.executed).to.equal(false);
      expect(vote.supportRequired).to.equal(2);
      expect(vote.participationRequired).to.equal(1);
      expect(vote.votingPower).to.equal(1);
      expect(vote.yea).to.equal(1);
      expect(vote.nay).to.equal(0);
      expect(vote.abstain).to.equal(0);
    });
  });

  describe('Vote + Execute:', async () => {
    let minDuration = 500;
    let supportRequired = pct16(50);
    let minimumQuorom = pct16(20);
    let votingPower = 100;

    beforeEach(async () => {
      await initializeVoting(minimumQuorom, supportRequired, minDuration);

      // set voting power to 100
      await erc20VoteMock.mock.getPastTotalSupply.returns(votingPower);

      await voting.newVote('0x00', dummyActions, 0, 0, false, false);
    });

    it('should not be able to vote if user has 0 token', async () => {
      await erc20VoteMock.mock.getPastVotes.returns(0);

      await expect(voting.vote(0, VoterState.Yea, false)).to.be.revertedWith(
        ERRORS.ERROR_CAN_NOT_VOTE
      );
    });

    it('increases the yea, nay, abstain votes and emit correct events', async () => {
      await erc20VoteMock.mock.getPastVotes.returns(1);

      expect(await voting.vote(0, VoterState.Yea, false))
        .to.emit(voting, EVENTS.CAST_VOTE)
        .withArgs(0, ownerAddress, VoterState.Yea, 1);

      let vote = await voting.getVote(0);
      expect(vote.yea).to.equal(1);

      expect(await voting.vote(0, VoterState.Nay, false))
        .to.emit(voting, EVENTS.CAST_VOTE)
        .withArgs(0, ownerAddress, VoterState.Nay, 1);

      vote = await voting.getVote(0);
      expect(vote.nay).to.equal(1);

      expect(await voting.vote(0, VoterState.Abstain, false))
        .to.emit(voting, EVENTS.CAST_VOTE)
        .withArgs(0, ownerAddress, VoterState.Abstain, 1);

      vote = await voting.getVote(0);
      expect(vote.abstain).to.equal(1);
    });

    it('voting multiple times should not increase yea,nay or abstain multiple times', async () => {
      await erc20VoteMock.mock.getPastVotes.returns(1);

      // yea still ends up to be 1 here even after voting
      // 2 times from the same wallet.
      await voting.vote(0, VoterState.Yea, false);
      await voting.vote(0, VoterState.Yea, false);
      expect((await voting.getVote(0)).yea).to.equal(1);

      // yea gets removed, nay ends up as 1.
      await voting.vote(0, VoterState.Nay, false);
      await voting.vote(0, VoterState.Nay, false);
      expect((await voting.getVote(0)).nay).to.equal(1);

      // nay gets removed, abstain ends up as 1.
      await voting.vote(0, VoterState.Abstain, false);
      await voting.vote(0, VoterState.Abstain, false);
      expect((await voting.getVote(0)).abstain).to.equal(1);
    });

    it('makes executable if enough yea is given from voting power', async () => {
      // vote with yea as 50 voting stake, which is still
      // not enough to make vote executable as support required percentage
      // is set to supportRequired = 51.
      await erc20VoteMock.mock.getPastVotes.returns(50);

      await voting.vote(0, VoterState.Yea, false);
      expect(await voting.canExecute(0)).to.equal(false);

      // vote with yea as 1 voting stake from another wallet,
      // which becomes 51 total and enough
      await erc20VoteMock.mock.getPastVotes.returns(1);
      await voting.connect(signers[1]).vote(0, VoterState.Yea, false);

      expect(await voting.canExecute(0)).to.equal(true);
    });

    it('returns executable if enough yea is given depending on yea+nay+abstain total', async () => {
      // vote with yea as 50 voting stake, which is still enough
      // to make vote executable even if the vote is closed due to
      // its duration length.
      await erc20VoteMock.mock.getPastVotes.returns(50);
      await voting.vote(0, VoterState.Yea, false);

      // vote with nay with 30 voting stake.
      await erc20VoteMock.mock.getPastVotes.returns(30);
      await voting.connect(signers[1]).vote(0, VoterState.Nay, false);

      // vote as abstain with 10 voting stake.
      await erc20VoteMock.mock.getPastVotes.returns(10);
      await voting.connect(signers[2]).vote(0, VoterState.Abstain, false);

      // makes the voting closed.
      await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
      await ethers.provider.send('evm_mine', []);

      expect(await voting.canExecute(0)).to.equal(true);
    });

    it("makes NON-executable if enough yea isn't given depending on yea + nay + abstain total", async () => {
      // vote with yea as 20 voting stake, which is still not enough
      // to make vote executable while vote is open or even after it's closed.
      // supports
      await erc20VoteMock.mock.getPastVotes.returns(10);
      await voting.vote(0, VoterState.Yea, false);

      // vote with nay with 5 voting stake as non-support
      await erc20VoteMock.mock.getPastVotes.returns(5);
      await voting.connect(signers[1]).vote(0, VoterState.Nay, false);

      // vote with 5 voting stake as abstain to vote
      await erc20VoteMock.mock.getPastVotes.returns(5);
      await voting.connect(signers[2]).vote(0, VoterState.Abstain, false);

      // makes the voting closed.
      await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
      await ethers.provider.send('evm_mine', []);

      expect(await voting.canExecute(0)).to.equal(false);
    });

    it('executes the vote immediatelly while final yea is given', async () => {
      // vote with supportRequired staking, so
      // it immediatelly executes the vote
      await erc20VoteMock.mock.getPastVotes.returns(51);

      // supports and should execute right away.
      expect(await voting.vote(0, VoterState.Yea, true))
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
