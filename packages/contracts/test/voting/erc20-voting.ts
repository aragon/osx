import {expect} from 'chai';
import {ethers, waffle} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import ERC20Governance from '../../artifacts/contracts/tokens/GovernanceERC20.sol/GovernanceERC20.json';
import {ERC20Voting, DAOMock} from '../../typechain';
import {
  VoteOption,
  VOTING_EVENTS,
  pct16,
  ONE_HOUR,
  MAX_UINT64,
} from '../test-utils/voting';
import {customError, ERRORS} from '../test-utils/custom-error-helper';
import {deployWithProxy} from '../test-utils/proxy';

const {deployMockContract} = waffle;

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

    voting = await deployWithProxy(ERC20Voting);
  });

  function initializeVoting(
    participationRequired: any,
    supportRequired: any,
    minDuration: any
  ) {
    return voting.initialize(
      daoMock.address,
      participationRequired,
      supportRequired,
      minDuration,
      erc20VoteMock.address
    );
  }

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await initializeVoting(1, 2, ONE_HOUR);

      await expect(initializeVoting(2, 1, ONE_HOUR)).to.be.revertedWith(
        ERRORS.ALREADY_INITIALIZED
      );
    });
  });

  describe('StartVote', async () => {
    let minDuration = ONE_HOUR;
    beforeEach(async () => {
      await initializeVoting(1, 2, minDuration);
    });

    it('reverts total token supply while creating a vote is 0', async () => {
      await erc20VoteMock.mock.getPastTotalSupply.returns(0);
      await expect(
        voting.createVote('0x00', [], 0, 0, false, VoteOption.None)
      ).to.be.revertedWith(customError('NoVotingPower'));
    });

    it('reverts if the start date is set smaller than the current date', async () => {
      await erc20VoteMock.mock.getPastTotalSupply.returns(1);
      const block = await ethers.provider.getBlock('latest');
      const currentDate = block.timestamp;
      const startDate = currentDate - 1;
      const endDate = 0; // startDate + minDuration
      await expect(
        voting.createVote(
          '0x00',
          [],
          startDate,
          endDate,
          false,
          VoteOption.None
        )
      ).to.be.revertedWith(
        customError('DateOutOfBounds', currentDate + 1, startDate)
      );
    });

    it('reverts if the start date is after the latest start date', async () => {
      await erc20VoteMock.mock.getPastTotalSupply.returns(1);
      const latestStartDate = MAX_UINT64.sub(minDuration);
      const startDate = latestStartDate.add(1);
      const endDate = 0; // startDate + minDuration
      await expect(
        voting.createVote(
          '0x00',
          [],
          startDate,
          endDate,
          false,
          VoteOption.None
        )
      ).to.be.revertedWith(
        'panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)'
      );
    });

    it('reverts if the end date is before the earliest end date so that min duration cannot be met', async () => {
      await erc20VoteMock.mock.getPastTotalSupply.returns(1);
      const block = await ethers.provider.getBlock('latest');
      const currentTime = block.timestamp;
      const startDate = currentTime + 1;
      const earliestEndDate = startDate + minDuration;
      const endDate = earliestEndDate - 1;
      await expect(
        voting.createVote(
          '0x00',
          [],
          startDate,
          endDate,
          false,
          VoteOption.None
        )
      ).to.be.revertedWith(
        customError('DateOutOfBounds', earliestEndDate, endDate)
      );
    });

    it('should create a vote successfully, but not vote', async () => {
      const id = 0; // voteId

      await erc20VoteMock.mock.getPastTotalSupply.returns(1);
      await erc20VoteMock.mock.getPastVotes.returns(0);

      expect(
        await voting.createVote(
          '0x00',
          dummyActions,
          0,
          0,
          false,
          VoteOption.None
        )
      )
        .to.emit(voting, VOTING_EVENTS.VOTE_STARTED)
        .withArgs(id, ownerAddress, '0x00');

      const block = await ethers.provider.getBlock('latest');

      const vote = await voting.getVote(id);
      expect(vote.open).to.equal(true);
      expect(vote.executed).to.equal(false);
      expect(vote.supportRequired).to.equal(2);
      expect(vote.participationRequired).to.equal(1);
      expect(vote.snapshotBlock).to.equal(block.number - 1);
      expect(vote.votingPower).to.equal(1);
      expect(vote.yes).to.equal(0);
      expect(vote.no).to.equal(0);

      expect(vote.startDate.add(minDuration)).to.equal(vote.endDate);

      expect(await voting.canVote(1, ownerAddress)).to.equal(false);

      expect(vote.actions.length).to.equal(1);
      expect(vote.actions[0].to).to.equal(dummyActions[0].to);
      expect(vote.actions[0].value).to.equal(dummyActions[0].value);
      expect(vote.actions[0].data).to.equal(dummyActions[0].data);
    });

    it('should create a vote and cast a vote immediatelly', async () => {
      const id = 0; // voteId

      await erc20VoteMock.mock.getPastTotalSupply.returns(1);
      await erc20VoteMock.mock.getPastVotes.returns(1);

      expect(
        await voting.createVote(
          '0x00',
          dummyActions,
          0,
          0,
          false,
          VoteOption.Yes
        )
      )
        .to.emit(voting, VOTING_EVENTS.VOTE_STARTED)
        .withArgs(id, ownerAddress, '0x00')
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.Yes, 1);

      const block = await ethers.provider.getBlock('latest');

      const vote = await voting.getVote(id);
      expect(vote.open).to.equal(true);
      expect(vote.executed).to.equal(false);
      expect(vote.supportRequired).to.equal(2);
      expect(vote.participationRequired).to.equal(1);
      expect(vote.snapshotBlock).to.equal(block.number - 1);
      expect(vote.votingPower).to.equal(1);
      expect(vote.yes).to.equal(1);
      expect(vote.no).to.equal(0);
      expect(vote.abstain).to.equal(0);
    });
  });

  describe('Vote + Execute:', async () => {
    let minDuration = ONE_HOUR;
    let supportRequired = pct16(50);
    let minimumQuorom = pct16(20);
    let votingPower = 100;
    const id = 0; // voteId

    beforeEach(async () => {
      await initializeVoting(minimumQuorom, supportRequired, minDuration);

      // set voting power to 100
      await erc20VoteMock.mock.getPastTotalSupply.returns(votingPower);

      await voting.createVote(
        '0x00',
        dummyActions,
        0,
        0,
        false,
        VoteOption.None
      );
    });

    it('should not be able to vote if user has 0 token', async () => {
      await erc20VoteMock.mock.getPastVotes.returns(0);

      await expect(voting.vote(id, VoteOption.Yes, false)).to.be.revertedWith(
        customError('VoteCastingForbidden', id, ownerAddress)
      );
    });

    it('increases the yes, no, abstain votes and emit correct events', async () => {
      await erc20VoteMock.mock.getPastVotes.returns(1);

      expect(await voting.vote(id, VoteOption.Yes, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.Yes, 1);

      let vote = await voting.getVote(id);
      expect(vote.yes).to.equal(1);

      expect(await voting.vote(id, VoteOption.No, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.No, 1);

      vote = await voting.getVote(0);
      expect(vote.no).to.equal(1);

      expect(await voting.vote(id, VoteOption.Abstain, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.Abstain, 1);

      vote = await voting.getVote(id);
      expect(vote.abstain).to.equal(1);
    });

    it('voting multiple times should not increase yes,no or abstain multiple times', async () => {
      await erc20VoteMock.mock.getPastVotes.returns(1);

      // yes still ends up to be 1 here even after voting
      // 2 times from the same wallet.
      await voting.vote(id, VoteOption.Yes, false);
      await voting.vote(id, VoteOption.Yes, false);
      expect((await voting.getVote(0)).yes).to.equal(1);

      // yes gets removed, no ends up as 1.
      await voting.vote(id, VoteOption.No, false);
      await voting.vote(id, VoteOption.No, false);
      expect((await voting.getVote(0)).no).to.equal(1);

      // no gets removed, abstain ends up as 1.
      await voting.vote(id, VoteOption.Abstain, false);
      await voting.vote(id, VoteOption.Abstain, false);
      expect((await voting.getVote(0)).abstain).to.equal(1);
    });

    it('makes executable if enough yes is given from voting power', async () => {
      // vote with yes as 50 voting stake, which is still
      // not enough to make vote executable as support required percentage
      // is set to supportRequired = 51.
      await erc20VoteMock.mock.getPastVotes.returns(50);

      await voting.vote(id, VoteOption.Yes, false);
      expect(await voting.canExecute(id)).to.equal(false);

      // vote with yes as 1 voting stake from another wallet,
      // which becomes 51 total and enough
      await erc20VoteMock.mock.getPastVotes.returns(1);
      await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);

      expect(await voting.canExecute(id)).to.equal(true);
    });

    it('returns executable if enough yes is given depending on yes+no+abstain total', async () => {
      // vote with yes as 50 voting stake, which is still enough
      // to make vote executable even if the vote is closed due to
      // its duration length.
      await erc20VoteMock.mock.getPastVotes.returns(50);
      await voting.vote(id, VoteOption.Yes, false);

      // vote with no with 30 voting stake.
      await erc20VoteMock.mock.getPastVotes.returns(30);
      await voting.connect(signers[1]).vote(id, VoteOption.No, false);

      // vote as abstain with 10 voting stake.
      await erc20VoteMock.mock.getPastVotes.returns(10);
      await voting.connect(signers[2]).vote(id, VoteOption.Abstain, false);

      // makes the voting closed.
      await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
      await ethers.provider.send('evm_mine', []);

      expect(await voting.canExecute(id)).to.equal(true);
    });

    it("makes NON-executable if enough yes isn't given depending on yes + no + abstain total", async () => {
      // vote with yes as 20 voting stake, which is still not enough
      // to make vote executable while vote is open or even after it's closed.
      // supports
      await erc20VoteMock.mock.getPastVotes.returns(10);
      await voting.vote(0, VoteOption.Yes, false);

      // vote with no with 5 voting stake as non-support
      await erc20VoteMock.mock.getPastVotes.returns(5);
      await voting.connect(signers[1]).vote(id, VoteOption.No, false);

      // vote with 5 voting stake as abstain to vote
      await erc20VoteMock.mock.getPastVotes.returns(5);
      await voting.connect(signers[2]).vote(id, VoteOption.Abstain, false);

      // makes the voting closed.
      await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
      await ethers.provider.send('evm_mine', []);

      expect(await voting.canExecute(id)).to.equal(false);
    });

    it('executes the vote immediately while final yes is given', async () => {
      // vote with supportRequired staking, so
      // it immediatelly executes the vote
      await erc20VoteMock.mock.getPastVotes.returns(51);

      // supports and should execute right away.
      let tx = await voting.vote(id, VoteOption.Yes, true);
      let rc = await tx.wait();

      // check for the `Executed` event in the DAO
      {
        let {actor, callId, actions, execResults} = daoMock.interface.parseLog(
          rc.logs[1]
        ).args;

        expect(actor).to.equal(voting.address);
        expect(callId).to.equal(0);
        expect(actions.length).to.equal(1);
        expect(actions[0].to).to.equal(dummyActions[0].to);
        expect(actions[0].value).to.equal(dummyActions[0].value);
        expect(actions[0].data).to.equal(dummyActions[0].data);
        expect(execResults).to.deep.equal([]);

        const vote = await voting.getVote(id);

        expect(vote.executed).to.equal(true);
      }

      // check for the `VoteExecuted` event in the voting contract
      {
        const {voteId, execResults} = voting.interface.parseLog(
          rc.logs[2]
        ).args;
        expect(voteId).to.equal(id);
        expect(execResults).to.deep.equal([]);
      }

      // calling execute again should fail
      await expect(voting.execute(id)).to.be.revertedWith(
        customError('VoteExecutionForbidden', id)
      );
    });

    it('reverts if vote is executed while enough yes is not given ', async () => {
      await expect(voting.execute(id)).to.be.revertedWith(
        customError('VoteExecutionForbidden', id)
      );
    });
  });
});
