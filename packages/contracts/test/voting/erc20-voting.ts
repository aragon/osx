import chai, {expect} from 'chai';
import {ethers, waffle} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import chaiUtils from '../test-utils';
import {VoterState, VOTING_EVENTS, pct16, toBn} from '../test-utils/voting';
import {customError, ERRORS} from '../test-utils/custom-error-helper';

chai.use(chaiUtils);

import {ERC20Voting, DAOMock} from '../../typechain';
import ERC20Governance from '../../artifacts/contracts/tokens/GovernanceERC20.sol/GovernanceERC20.json';

const {deployMockContract} = waffle;

const DAO_EVENTS = {
  EXECUTED: 'Executed',
};

describe('ERC20Voting', function () {
  let signers: SignerWithAddress[];
  let voting: ERC20Voting;
  let daoMock: DAOMock;
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
    return voting.initialize(
      daoMock.address,
      ethers.constants.AddressZero,
      participationRequired,
      supportRequired,
      minDuration,
      erc20VoteMock.address
    );
  }

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await initializeVoting(1, 2, 3);

      await expect(initializeVoting(2, 1, 3)).to.be.revertedWith(
        ERRORS.ALREADY_INITIALIZED
      );
    });

    it('reverts if min duration is 0', async () => {
      await expect(initializeVoting(1, 2, 0)).to.be.revertedWith(
        customError('VoteDurationZero')
      );
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
        voting.newVote('0x00', [], 0, 0, false, VoterState.None)
      ).to.be.revertedWith(customError('VotingPowerZero'));
    });

    it('reverts if vote duration is less than minDuration', async () => {
      await erc20VoteMock.mock.getPastTotalSupply.returns(1);
      const block = await ethers.provider.getBlock('latest');
      const current = block.timestamp;
      const startDate = block.timestamp;
      const endDate = startDate + (minDuration - 1);
      await expect(
        voting.newVote('0x00', [], startDate, endDate, false, VoterState.None)
      ).to.be.revertedWith(
        customError(
          'VoteTimesForbidden',
          current + 1, // TODO hacky
          startDate,
          endDate,
          minDuration
        )
      );
    });

    it('should create a vote successfully, but not vote', async () => {
      await erc20VoteMock.mock.getPastTotalSupply.returns(1);
      await erc20VoteMock.mock.getPastVotes.returns(0);

      expect(
        await voting.newVote('0x00', dummyActions, 0, 0, false, VoterState.None)
      )
        .to.emit(voting, VOTING_EVENTS.VOTE_STARTED)
        .withArgs(0, ownerAddress, '0x00');

      const block = await ethers.provider.getBlock('latest');

      const vote = await voting.getVote(0);
      expect(vote.open).to.equal(true);
      expect(vote.executed).to.equal(false);
      expect(vote.supportRequired).to.equal(2);
      expect(vote.participationRequired).to.equal(1);
      expect(vote.snapshotBlock).to.equal(block.number - 1);
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

      expect(
        await voting.newVote('0x00', dummyActions, 0, 0, false, VoterState.Yea)
      )
        .to.emit(voting, VOTING_EVENTS.VOTE_STARTED)
        .withArgs(0, ownerAddress, '0x00')
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(0, ownerAddress, VoterState.Yea, 1);

      const block = await ethers.provider.getBlock('latest');

      const vote = await voting.getVote(0);
      expect(vote.open).to.equal(true);
      expect(vote.executed).to.equal(false);
      expect(vote.supportRequired).to.equal(2);
      expect(vote.participationRequired).to.equal(1);
      expect(vote.snapshotBlock).to.equal(block.number - 1);
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

      await voting.newVote('0x00', dummyActions, 0, 0, false, VoterState.None);
    });

    it('should not be able to vote if user has 0 token', async () => {
      await erc20VoteMock.mock.getPastVotes.returns(0);

      await expect(voting.vote(0, VoterState.Yea, false)).to.be.revertedWith(
        customError('VoteCastForbidden', 0, ownerAddress)
      );
    });

    it('increases the yea, nay, abstain votes and emit correct events', async () => {
      await erc20VoteMock.mock.getPastVotes.returns(1);

      expect(await voting.vote(0, VoterState.Yea, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(0, ownerAddress, VoterState.Yea, 1);

      let vote = await voting.getVote(0);
      expect(vote.yea).to.equal(1);

      expect(await voting.vote(0, VoterState.Nay, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(0, ownerAddress, VoterState.Nay, 1);

      vote = await voting.getVote(0);
      expect(vote.nay).to.equal(1);

      expect(await voting.vote(0, VoterState.Abstain, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
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
        .to.emit(daoMock, DAO_EVENTS.EXECUTED)
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
        )
        .to.emit(voting, VOTING_EVENTS.VOTE_EXECUTED)
        .withArgs(0, []);

      const vote = await voting.getVote(0);

      expect(vote.executed).to.equal(true);

      // calling execute again should fail
      await expect(voting.execute(0)).to.be.revertedWith(
        customError('VoteExecutionForbidden', 0)
      );
    });

    it('reverts if vote is executed while enough yea is not given ', async () => {
      await expect(voting.execute(0)).to.be.revertedWith(
        customError('VoteExecutionForbidden', 0)
      );
    });
  });
});
