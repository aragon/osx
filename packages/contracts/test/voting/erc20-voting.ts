import {expect} from 'chai';
import {ethers, waffle} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import ERC20Governance from '../../artifacts/contracts/tokens/GovernanceERC20.sol/GovernanceERC20.json';
import {ERC20Voting, DAO} from '../../typechain';
import {findEvent, DAO_EVENTS, VOTING_EVENTS} from '../../utils/event';
import {VoteOption, pct16} from '../test-utils/voting';
import {customError, ERRORS} from '../test-utils/custom-error-helper';

const {deployMockContract} = waffle;

describe('ERC20Voting', function () {
  let signers: SignerWithAddress[];
  let voting: ERC20Voting;
  let dao: DAO;
  let erc20VoteMock: any;
  let ownerAddress: string;
  let dummyActions: any;
  let dummyMetadata: string;

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

    dummyMetadata = ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes('0x123456789')
    );

    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize('0x', ownerAddress, ethers.constants.AddressZero);
  });

  beforeEach(async () => {
    erc20VoteMock = await deployMockContract(signers[0], ERC20Governance.abi);

    const ERC20Voting = await ethers.getContractFactory('ERC20Voting');
    voting = await ERC20Voting.deploy();

    dao.grant(
      dao.address,
      voting.address,
      ethers.utils.id('EXECUTE_PERMISSION')
    );
  });

  function initializeVoting(
    participationRequired: any,
    supportRequired: any,
    minDuration: any
  ) {
    return voting.initialize(
      dao.address,
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
        voting.createVote(dummyMetadata, [], 0, 0, false, VoteOption.None)
      ).to.be.revertedWith(customError('NoVotingPower'));
    });

    it('reverts if vote duration is less than minDuration', async () => {
      await erc20VoteMock.mock.getPastTotalSupply.returns(1);
      const block = await ethers.provider.getBlock('latest');
      const current = block.timestamp;
      const startDate = block.timestamp;
      const endDate = startDate + (minDuration - 1);
      await expect(
        voting.createVote(
          dummyMetadata,
          [],
          startDate,
          endDate,
          false,
          VoteOption.None
        )
      ).to.be.revertedWith(
        customError(
          'VoteTimesInvalid',
          current + 1, // TODO hacky
          startDate,
          endDate,
          minDuration
        )
      );
    });

    it('should create a vote successfully, but not vote', async () => {
      const id = 0; // voteId

      await erc20VoteMock.mock.getPastTotalSupply.returns(1);
      await erc20VoteMock.mock.getPastVotes.returns(0);

      expect(
        await voting.createVote(
          dummyMetadata,
          dummyActions,
          0,
          0,
          false,
          VoteOption.None
        )
      )
        .to.emit(voting, VOTING_EVENTS.VOTE_STARTED)
        .withArgs(id, ownerAddress, dummyMetadata);

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

    it('should create a vote and cast a vote immediately', async () => {
      const id = 0; // voteId

      await erc20VoteMock.mock.getPastTotalSupply.returns(1);
      await erc20VoteMock.mock.getPastVotes.returns(1);

      expect(
        await voting.createVote(
          dummyMetadata,
          dummyActions,
          0,
          0,
          false,
          VoteOption.Yes
        )
      )
        .to.emit(voting, VOTING_EVENTS.VOTE_STARTED)
        .withArgs(id, ownerAddress, dummyMetadata)
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
    let minDuration = 500;
    let supportRequiredPct = pct16(50);
    let participationRequiredPct = pct16(20);
    let votingPower = 100;
    const id = 0; // voteId

    beforeEach(async () => {
      await initializeVoting(
        participationRequiredPct,
        supportRequiredPct,
        minDuration
      );

      // set voting power to 100
      await erc20VoteMock.mock.getPastTotalSupply.returns(votingPower);

      await voting.createVote(
        dummyMetadata,
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
        customError('VoteCastForbidden', id, ownerAddress)
      );
    });

    it('increases the yes, no, abstain votes and emit correct events', async () => {
      await erc20VoteMock.mock.getPastVotes.returns(1);

      expect(await voting.vote(id, VoteOption.Yes, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.Yes, 1);

      let vote = await voting.getVote(id);
      expect(vote.yes).to.equal(1);
      expect(vote.no).to.equal(0);
      expect(vote.abstain).to.equal(0);

      expect(await voting.vote(id, VoteOption.No, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.No, 1);

      vote = await voting.getVote(0);
      expect(vote.yes).to.equal(0);
      expect(vote.no).to.equal(1);
      expect(vote.abstain).to.equal(0);

      expect(await voting.vote(id, VoteOption.Abstain, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.Abstain, 1);

      vote = await voting.getVote(id);
      expect(vote.yes).to.equal(0);
      expect(vote.no).to.equal(0);
      expect(vote.abstain).to.equal(1);
    });

    it('should not double-count votes by the same address', async () => {
      await erc20VoteMock.mock.getPastVotes.returns(1);

      // yes still ends up to be 1 here even after voting
      // 2 times from the same wallet.
      await voting.vote(id, VoteOption.Yes, false);
      await voting.vote(id, VoteOption.Yes, false);
      expect((await voting.getVote(id)).yes).to.equal(1);

      // yes gets removed, no ends up as 1.
      await voting.vote(id, VoteOption.No, false);
      await voting.vote(id, VoteOption.No, false);
      expect((await voting.getVote(id)).no).to.equal(1);

      // no gets removed, abstain ends up as 1.
      await voting.vote(id, VoteOption.Abstain, false);
      await voting.vote(id, VoteOption.Abstain, false);
      expect((await voting.getVote(id)).abstain).to.equal(1);
    });

    it('can execute early if support is large enough', async () => {
      // vote with 50 yes votes, which is NOT enough to make vote executable as supportPct
      // must be larger than supportRequiredPct = 50
      await erc20VoteMock.mock.getPastVotes.returns(50);

      await voting.vote(id, VoteOption.Yes, false);
      expect(await voting.canExecute(id)).to.equal(false);

      // vote with 1 yes vote from another wallet, so that yes votes amount to 51 in total, which is
      // enough to make vote executable as supportPct supportRequiredPct = 50
      await erc20VoteMock.mock.getPastVotes.returns(1);
      await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);

      expect(await voting.canExecute(id)).to.equal(true);
    });

    it('can execute if enough yes votes are given depending on yes+no+abstain total', async () => {
      // vote with 50 yes votes
      await erc20VoteMock.mock.getPastVotes.returns(50);
      await voting.vote(id, VoteOption.Yes, false);

      // vote 30 voting no votes
      await erc20VoteMock.mock.getPastVotes.returns(30);
      await voting.connect(signers[1]).vote(id, VoteOption.No, false);

      // vote with 10 abstain votes
      await erc20VoteMock.mock.getPastVotes.returns(10);
      await voting.connect(signers[2]).vote(id, VoteOption.Abstain, false);

      // closes the vote
      await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
      await ethers.provider.send('evm_mine', []);

      //The vote is executable as supportPct > 50%, participationPct > 20%, and the voting period is over
      expect(await voting.canExecute(id)).to.equal(true);
    });

    it("cannot execute if enough yes isn't given depending on yes + no + abstain total", async () => {
      // vote with 10 yes votes
      await erc20VoteMock.mock.getPastVotes.returns(10);
      await voting.vote(id, VoteOption.Yes, false);

      // vote with 5 no votes
      await erc20VoteMock.mock.getPastVotes.returns(5);
      await voting.connect(signers[1]).vote(id, VoteOption.No, false);

      // vote with 5 abstain votes
      await erc20VoteMock.mock.getPastVotes.returns(5);
      await voting.connect(signers[2]).vote(id, VoteOption.Abstain, false);

      // closes the vote
      await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
      await ethers.provider.send('evm_mine', []);

      //The vote is not executable because the participationPct with 20% is still too low, despite a support of 66% and the voting period being over
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
        const event = await findEvent(tx, DAO_EVENTS.EXECUTED);

        expect(event.args.actor).to.equal(voting.address);
        expect(event.args.callId).to.equal(id);
        expect(event.args.actions.length).to.equal(1);
        expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
        expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
        expect(event.args.actions[0].data).to.equal(dummyActions[0].data);
        expect(event.args.execResults).to.deep.equal(['0x']);

        const vote = await voting.getVote(id);

        expect(vote.executed).to.equal(true);
      }

      // check for the `VoteExecuted` event in the voting contract
      {
        const event = await findEvent(tx, VOTING_EVENTS.VOTE_EXECUTED);

        expect(event.args.voteId).to.equal(id);
        expect(event.args.execResults).to.deep.equal(['0x']);
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

  describe('Configurations for different use cases', async () => {
    const id = 0; // voteId

    describe('A simple majority vote with >50% support and >25% participation required', async () => {
      let minDuration = 500;
      let supportRequiredPct = pct16(50);
      let participationRequiredPct = pct16(25);
      let votingPower = 100;

      beforeEach(async () => {
        await initializeVoting(
          participationRequiredPct,
          supportRequiredPct,
          minDuration
        );

        // set voting power to 100
        await erc20VoteMock.mock.getPastTotalSupply.returns(votingPower);

        await voting.createVote(
          dummyMetadata,
          dummyActions,
          0,
          0,
          false,
          VoteOption.None
        );
      });

      it('does not execute if support is high enough but participation and approval (absolute support) are too low', async () => {
        await erc20VoteMock.mock.getPastVotes.returns(10);
        // app ! dur | par | sup
        // 10% !  0  | 10% | 100%
        //  ✓  !  𐄂  |  𐄂  |  ✓
        expect(await voting.canExecute(id)).to.equal(false); // Reason: approval and participation are too low

        await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
        await ethers.provider.send('evm_mine', []);
        // app ! dur | par | sup
        // 10% ! 510 | 10% | 100%
        //  𐄂  !  ✓  |  𐄂  |  ✓
        expect(await voting.canExecute(id)).to.equal(false); // vote end does not help
      });

      it('does not execute if participation is high enough but support is too low', async () => {
        await erc20VoteMock.mock.getPastVotes.returns(10);
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        await erc20VoteMock.mock.getPastVotes.returns(20);
        await voting.connect(signers[1]).vote(id, VoteOption.No, false);
        // app ! dur | par | sup
        // 30% !  0  | 30% | 33%
        //  𐄂  !  𐄂  |  ✓  |  𐄂
        expect(await voting.canExecute(id)).to.equal(false); // approval too low, duration and support criterium are not met

        await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
        await ethers.provider.send('evm_mine', []);
        // app ! dur | par | sup
        // 30% ! 510 | 30% | 33%
        //  𐄂  !  ✓  |  ✓  |  𐄂
        expect(await voting.canExecute(id)).to.equal(false); // vote end does not help
      });

      it('executes after the duration if participation, and support criteria are met', async () => {
        await erc20VoteMock.mock.getPastVotes.returns(30);
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        // app ! dur | par | sup
        // 30% !  0  | 30% | 100%
        //  𐄂  !  𐄂  |  ✓  |  ✓
        expect(await voting.canExecute(id)).to.equal(false); // Reason: duration criterium is not met

        await ethers.provider.send('evm_increaseTime', [minDuration + 10]);
        await ethers.provider.send('evm_mine', []);
        // app ! dur | par | sup
        // 30% ! 510 | 30% | 100%
        //  𐄂  !  ✓  |  ✓  |  ✓
        expect(await voting.canExecute(id)).to.equal(true); // all criteria are met
      });

      it('executes early if the approval (absolute support) exceeds the required support (assuming the latter is > 50%)', async () => {
        await erc20VoteMock.mock.getPastVotes.returns(50);
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        // app ! dur | par | sup
        // 50% !  0  | 50% | 100%
        //  𐄂  !  𐄂  |  ✓  |  ✓
        expect(await voting.canExecute(id)).to.equal(false); // Reason: app > supReq == false

        await erc20VoteMock.mock.getPastVotes.returns(10);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        // app ! dur | par | sup
        // 60% !  0  | 60% | 100%
        //  ✓  !  𐄂  |  ✓  |  ✓
        expect(await voting.canExecute(id)).to.equal(true); // Correct because more voting doesn't change the outcome

        await erc20VoteMock.mock.getPastVotes.returns(40);
        await voting.connect(signers[2]).vote(id, VoteOption.No, false);
        // app ! dur | par | sup
        // 60% !  0  | 100%| 60%
        //  ✓  !  𐄂  |  ✓  |  ✓
        expect(await voting.canExecute(id)).to.equal(true); // The outcome did not change
      });
    });
  });
});
