import {expect} from 'chai';
import {ethers, waffle} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import ERC20Governance from '../../artifacts/contracts/tokens/GovernanceERC20.sol/GovernanceERC20.json';
import {DAO} from '../../typechain';
import {findEvent, DAO_EVENTS, VOTING_EVENTS} from '../../utils/event';
import {getMergedABI} from '../../utils/abi';
import {
  VoteOption,
  pct16,
  getTime,
  advanceIntoVoteTime,
  advanceAfterVoteEnd,
  MajorityVotingSettings,
  VoteMode,
  ONE_HOUR,
  MAX_UINT64,
} from '../test-utils/voting';
import {customError, ERRORS} from '../test-utils/custom-error-helper';

const {deployMockContract} = waffle;

describe('TokenVoting', function () {
  let signers: SignerWithAddress[];
  let voting: any;
  let dao: DAO;
  let governanceErc20Mock: any;
  let dummyActions: any;
  let dummyMetadata: string;
  let startDate: number;
  let endDate: number;
  let majorityVotingSettings: MajorityVotingSettings;

  const startOffset = 10;
  const id = 0;
  const totalVotingPower = 100;

  let mergedAbi: any;
  let tokenVotingFactoryBytecode: any;

  before(async () => {
    signers = await ethers.getSigners();

    ({abi: mergedAbi, bytecode: tokenVotingFactoryBytecode} =
      await getMergedABI(
        // @ts-ignore
        hre,
        'TokenVoting',
        ['DAO']
      ));

    dummyActions = [
      {
        to: signers[0].address,
        data: '0x00000000',
        value: 0,
      },
    ];

    dummyMetadata = ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes('0x123456789')
    );

    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize(
      '0x',
      signers[0].address,
      ethers.constants.AddressZero
    );
  });

  beforeEach(async () => {
    majorityVotingSettings = {
      voteMode: VoteMode.EarlyExecution,
      supportThreshold: pct16(50),
      minParticipation: pct16(20),
      minDuration: ONE_HOUR,
      minProposerVotingPower: 0,
    };

    governanceErc20Mock = await deployMockContract(
      signers[0],
      ERC20Governance.abi
    );

    const TokenVotingFactory = new ethers.ContractFactory(
      mergedAbi,
      tokenVotingFactoryBytecode,
      signers[0]
    );
    voting = await TokenVotingFactory.deploy();

    startDate = (await getTime()) + startOffset;
    endDate = startDate + majorityVotingSettings.minDuration;

    dao.grant(
      dao.address,
      voting.address,
      ethers.utils.id('EXECUTE_PERMISSION')
    );
  });

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await voting.initialize(
        dao.address,
        majorityVotingSettings,
        governanceErc20Mock.address
      );

      await expect(
        voting.initialize(
          dao.address,
          majorityVotingSettings,
          governanceErc20Mock.address
        )
      ).to.be.revertedWith(ERRORS.ALREADY_INITIALIZED);
    });
  });

  describe('Proposal creation', async () => {
    it('reverts if the user is not allowed to create a proposal', async () => {
      majorityVotingSettings.minProposerVotingPower = 1;

      await voting.initialize(
        dao.address,
        majorityVotingSettings,
        governanceErc20Mock.address
      );

      await governanceErc20Mock.mock.getPastTotalSupply.returns(1);
      await governanceErc20Mock.mock.getPastVotes.returns(0);

      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          startDate,
          endDate,
          false,
          VoteOption.None
        )
      ).to.be.revertedWith(
        customError('ProposalCreationForbidden', signers[0].address)
      );

      await governanceErc20Mock.mock.getPastVotes.returns(1);
      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          startDate,
          endDate,
          false,
          VoteOption.None
        )
      ).to.not.be.reverted;
    });

    it('reverts if the user is not allowed to create a proposal and minProposerPower > 1 is selected', async () => {
      majorityVotingSettings.minProposerVotingPower = 123;

      await voting.initialize(
        dao.address,
        majorityVotingSettings,
        governanceErc20Mock.address
      );

      await governanceErc20Mock.mock.getPastTotalSupply.returns(1);
      await governanceErc20Mock.mock.getPastVotes.returns(0);

      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          startDate,
          endDate,
          false,
          VoteOption.None
        )
      ).to.be.revertedWith(
        customError('ProposalCreationForbidden', signers[0].address)
      );

      await governanceErc20Mock.mock.getPastVotes.returns(123);
      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          startDate,
          endDate,
          false,
          VoteOption.None
        )
      ).to.not.be.reverted;
    });

    it('reverts if the total token supply is 0', async () => {
      await voting.initialize(
        dao.address,
        majorityVotingSettings,
        governanceErc20Mock.address
      );

      await governanceErc20Mock.mock.getPastTotalSupply.returns(0);
      await expect(
        voting.createProposal(dummyMetadata, [], 0, 0, false, VoteOption.None)
      ).to.be.revertedWith(customError('NoVotingPower'));
    });

    it('reverts if the start date is set smaller than the current date', async () => {
      await voting.initialize(
        dao.address,
        majorityVotingSettings,
        governanceErc20Mock.address
      );

      await governanceErc20Mock.mock.getPastTotalSupply.returns(1);
      await governanceErc20Mock.mock.getPastVotes.returns(1);

      const currentDate = await getTime();
      const startDateInThePast = currentDate - 1;
      const endDate = 0; // startDate + minDuration

      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          startDateInThePast,
          endDate,
          false,
          VoteOption.None
        )
      ).to.be.revertedWith(
        customError(
          'DateOutOfBounds',
          currentDate + 1, // await takes one second
          startDateInThePast
        )
      );
    });

    it('reverts if the start date is after the latest start date', async () => {
      await voting.initialize(
        dao.address,
        majorityVotingSettings,
        governanceErc20Mock.address
      );

      await governanceErc20Mock.mock.getPastTotalSupply.returns(1);
      await governanceErc20Mock.mock.getPastVotes.returns(1);

      const latestStartDate = MAX_UINT64.sub(
        majorityVotingSettings.minDuration
      );
      const tooLateStartDate = latestStartDate.add(1);
      const endDate = 0; // startDate + minDuration

      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          tooLateStartDate,
          endDate,
          false,
          VoteOption.None
        )
      ).to.be.revertedWith(
        'panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)'
      );
    });

    it('reverts if the end date is before the earliest end date so that min duration cannot be met', async () => {
      await voting.initialize(
        dao.address,
        majorityVotingSettings,
        governanceErc20Mock.address
      );

      await governanceErc20Mock.mock.getPastTotalSupply.returns(1);
      await governanceErc20Mock.mock.getPastVotes.returns(1);

      const startDate = (await getTime()) + 1;
      const earliestEndDate = startDate + majorityVotingSettings.minDuration;
      const tooEarlyEndDate = earliestEndDate - 1;

      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          startDate,
          tooEarlyEndDate,
          false,
          VoteOption.None
        )
      ).to.be.revertedWith(
        customError('DateOutOfBounds', earliestEndDate, tooEarlyEndDate)
      );
    });

    it('should create a vote successfully, but not vote', async () => {
      await voting.initialize(
        dao.address,
        majorityVotingSettings,
        governanceErc20Mock.address
      );

      await governanceErc20Mock.mock.getPastTotalSupply.returns(1);
      await governanceErc20Mock.mock.getPastVotes.returns(1);

      expect(
        await voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          0,
          false,
          VoteOption.None
        )
      )
        .to.emit(voting, VOTING_EVENTS.PROPOSAL_CREATED)
        .withArgs(id, signers[0].address, dummyMetadata);

      const block = await ethers.provider.getBlock('latest');

      const proposal = await voting.getProposal(id);
      expect(proposal.open).to.equal(true);
      expect(proposal.executed).to.equal(false);
      expect(proposal.configuration.supportThreshold).to.equal(
        majorityVotingSettings.supportThreshold
      );
      expect(proposal.configuration.minParticipation).to.equal(
        majorityVotingSettings.minParticipation
      );
      expect(proposal.configuration.snapshotBlock).to.equal(block.number - 1);
      expect(
        proposal.configuration.startDate.add(majorityVotingSettings.minDuration)
      ).to.equal(proposal.configuration.endDate);

      expect(proposal.tally.totalVotingPower).to.equal(1);
      expect(proposal.tally.yes).to.equal(0);
      expect(proposal.tally.no).to.equal(0);

      expect(await voting.canVote(1, signers[0].address)).to.equal(false);

      expect(proposal.actions.length).to.equal(1);
      expect(proposal.actions[0].to).to.equal(dummyActions[0].to);
      expect(proposal.actions[0].value).to.equal(dummyActions[0].value);
      expect(proposal.actions[0].data).to.equal(dummyActions[0].data);
    });

    it('should create a vote and cast a vote immediately', async () => {
      await voting.initialize(
        dao.address,
        majorityVotingSettings,
        governanceErc20Mock.address
      );

      await governanceErc20Mock.mock.getPastTotalSupply.returns(1);
      await governanceErc20Mock.mock.getPastVotes.returns(1);

      expect(
        await voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          0,
          false,
          VoteOption.Yes
        )
      )
        .to.emit(voting, VOTING_EVENTS.PROPOSAL_CREATED)
        .withArgs(id, signers[0].address, dummyMetadata)
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, signers[0].address, VoteOption.Yes, 1);

      const block = await ethers.provider.getBlock('latest');

      const proposal = await voting.getProposal(id);
      expect(proposal.open).to.equal(true);
      expect(proposal.executed).to.equal(false);
      expect(proposal.configuration.supportThreshold).to.equal(
        majorityVotingSettings.supportThreshold
      );
      expect(proposal.configuration.minParticipation).to.equal(
        majorityVotingSettings.minParticipation
      );
      expect(proposal.configuration.snapshotBlock).to.equal(block.number - 1);

      expect(proposal.tally.totalVotingPower).to.equal(1);
      expect(proposal.tally.yes).to.equal(1);
      expect(proposal.tally.no).to.equal(0);
      expect(proposal.tally.abstain).to.equal(0);
    });

    it('reverts creation when voting before the start date', async () => {
      await voting.initialize(
        dao.address,
        majorityVotingSettings,
        governanceErc20Mock.address
      );

      // set voting power to 100
      await governanceErc20Mock.mock.getPastTotalSupply.returns(
        totalVotingPower
      );

      expect(await getTime()).to.be.lessThan(startDate);

      await governanceErc20Mock.mock.getPastVotes.returns(51);

      // Reverts if the vote option is not 'None'
      await expect(
        voting.createProposal(
          dummyMetadata,
          dummyActions,
          startDate,
          endDate,
          false,
          VoteOption.Yes
        )
      ).to.be.revertedWith(
        customError('VoteCastForbidden', id, signers[0].address)
      );

      // Works if the vote option is 'None'
      expect(
        (
          await voting.createProposal(
            dummyMetadata,
            dummyActions,
            startDate,
            endDate,
            false,
            VoteOption.None
          )
        ).value
      ).to.equal(id);
    });
  });

  describe('Proposal + Execute:', async () => {
    context('Vote Replacement', async () => {
      beforeEach(async () => {
        majorityVotingSettings.voteMode = VoteMode.Standard;

        await voting.initialize(
          dao.address,
          majorityVotingSettings,
          governanceErc20Mock.address
        );

        // set voting power to 100
        await governanceErc20Mock.mock.getPastTotalSupply.returns(
          totalVotingPower
        );
        await governanceErc20Mock.mock.getPastVotes.returns(1);

        expect(
          (
            await voting.createProposal(
              dummyMetadata,
              dummyActions,
              startDate,
              endDate,
              false,
              VoteOption.None
            )
          ).value
        ).to.equal(id);
      });

      it('reverts on vote replacement', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(1);

        await voting.vote(id, VoteOption.Yes, false);

        // Try to replace the vote
        await expect(voting.vote(id, VoteOption.No, false)).to.be.revertedWith(
          customError('VoteCastForbidden', id, signers[0].address)
        );
      });

      it('cannot early execute', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(51);
        await voting.vote(id, VoteOption.Yes, false);

        expect(await voting.worstCaseSupport(id)).to.be.gt(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('can execute normally if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(30);
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await governanceErc20Mock.mock.getPastVotes.returns(20);
        await voting.connect(signers[1]).vote(id, VoteOption.No, false);
        await governanceErc20Mock.mock.getPastVotes.returns(20);
        await voting.connect(signers[2]).vote(id, VoteOption.Abstain, false);

        expect(await voting.worstCaseSupport(id)).to.be.lte(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.support(id)).to.be.gt(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );

        expect(await voting.canExecute(id)).to.equal(true);
      });

      it('does not execute when voting with the `tryEarlyExecution` option', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(50);
        await voting.vote(id, VoteOption.Yes, false);
        expect(await voting.canExecute(id)).to.equal(false);

        // `tryEarlyExecution` is turned on but the vote is not decided yet
        await governanceErc20Mock.mock.getPastVotes.returns(1);
        let tx = await voting
          .connect(signers[1])
          .vote(id, VoteOption.Yes, true);

        expect(await voting.worstCaseSupport(id)).to.be.gt(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.canExecute(id)).to.equal(false);

        expect(await findEvent(tx, DAO_EVENTS.EXECUTED)).to.be.undefined;

        // `tryEarlyExecution` is turned off and the vote is decided
        tx = await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        expect(await findEvent(tx, DAO_EVENTS.EXECUTED)).to.be.undefined;

        // `tryEarlyExecution` is turned on and the vote is decided
        tx = await voting.connect(signers[3]).vote(id, VoteOption.Yes, true);
        expect(await findEvent(tx, DAO_EVENTS.EXECUTED)).to.be.undefined;
      });

      it('reverts if vote is not decided yet', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await expect(voting.execute(id)).to.be.revertedWith(
          customError('ProposalExecutionForbidden', id)
        );
      });
    });
    context('Early Execution', async () => {
      beforeEach(async () => {
        majorityVotingSettings.voteMode = VoteMode.EarlyExecution;

        await voting.initialize(
          dao.address,
          majorityVotingSettings,
          governanceErc20Mock.address
        );

        // set voting power to 100
        await governanceErc20Mock.mock.getPastTotalSupply.returns(
          totalVotingPower
        );
        await governanceErc20Mock.mock.getPastVotes.returns(1);

        expect(
          (
            await voting.createProposal(
              dummyMetadata,
              dummyActions,
              startDate,
              endDate,
              false,
              VoteOption.None
            )
          ).value
        ).to.equal(id);
      });

      it('does not allow voting, when the vote has not started yet', async () => {
        expect(await getTime()).to.be.lessThan(startDate);

        await governanceErc20Mock.mock.getPastVotes.returns(1);

        await expect(voting.vote(id, VoteOption.Yes, false)).to.be.revertedWith(
          customError('VoteCastForbidden', id, signers[0].address)
        );
      });

      it('should not be able to vote if user has 0 token', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(0);

        await expect(voting.vote(id, VoteOption.Yes, false)).to.be.revertedWith(
          customError('VoteCastForbidden', id, signers[0].address)
        );
      });

      it('increases the yes, no, and abstain count and emits correct events', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(1);

        expect(await voting.connect(signers[0]).vote(id, VoteOption.Yes, false))
          .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
          .withArgs(id, signers[0].address, VoteOption.Yes, 1);

        let proposal = await voting.getProposal(id);
        expect(proposal.tally.yes).to.equal(1);
        expect(proposal.tally.yes).to.equal(1);
        expect(proposal.tally.no).to.equal(0);
        expect(proposal.tally.abstain).to.equal(0);

        expect(await voting.connect(signers[1]).vote(id, VoteOption.No, false))
          .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
          .withArgs(id, signers[1].address, VoteOption.No, 1);

        proposal = await voting.getProposal(id);
        expect(proposal.tally.no).to.equal(1);
        expect(proposal.tally.no).to.equal(1);
        expect(proposal.tally.abstain).to.equal(0);

        expect(
          await voting.connect(signers[2]).vote(id, VoteOption.Abstain, false)
        )
          .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
          .withArgs(id, signers[2].address, VoteOption.Abstain, 1);

        proposal = await voting.getProposal(id);
        expect(proposal.tally.yes).to.equal(1);
        expect(proposal.tally.no).to.equal(1);
        expect(proposal.tally.abstain).to.equal(1);
      });

      it('reverts on vote replacement', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(1);

        await voting.vote(id, VoteOption.Yes, false);

        // Try to replace the vote
        await expect(voting.vote(id, VoteOption.No, false)).to.be.revertedWith(
          customError('VoteCastForbidden', id, signers[0].address)
        );
      });

      it('can execute early if participation is large enough', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(50);
        await voting.vote(id, VoteOption.Yes, false);

        expect(await voting.worstCaseSupport(id)).to.be.lte(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await governanceErc20Mock.mock.getPastVotes.returns(1);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);

        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.worstCaseSupport(id)).to.be.gt(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(true);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.support(id)).to.be.gt(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(true);
      });

      it('can execute normally if participation is large enough', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        // vote with 50 yes votes
        await governanceErc20Mock.mock.getPastVotes.returns(50);
        await voting.vote(id, VoteOption.Yes, false);

        // vote 30 voting no votes
        await governanceErc20Mock.mock.getPastVotes.returns(30);
        await voting.connect(signers[1]).vote(id, VoteOption.No, false);

        // vote with 10 abstain votes
        await governanceErc20Mock.mock.getPastVotes.returns(10);
        await voting.connect(signers[2]).vote(id, VoteOption.Abstain, false);

        // closes the vote
        await advanceAfterVoteEnd(endDate);

        //The vote is executable as support > 50%, participation > 20%, and the voting period is over
        expect(await voting.canExecute(id)).to.equal(true);
      });

      it('cannot execute normally if participation is too low', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        // vote with 10 yes votes
        await governanceErc20Mock.mock.getPastVotes.returns(10);
        await voting.vote(id, VoteOption.Yes, false);

        // vote with 5 no votes
        await governanceErc20Mock.mock.getPastVotes.returns(5);
        await voting.connect(signers[1]).vote(id, VoteOption.No, false);

        // vote with 5 abstain votes
        await governanceErc20Mock.mock.getPastVotes.returns(4);
        await voting.connect(signers[2]).vote(id, VoteOption.Abstain, false);

        // closes the vote
        await advanceAfterVoteEnd(endDate);

        //The vote is not executable because the participation with 19% is still too low, despite a support of 67% and the voting period being over
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('executes the vote immediately when the vote is decided early and the tryEarlyExecution options is selected', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(50);

        // `tryEarlyExecution` is turned on but the vote is not decided yet
        let tx = await voting
          .connect(signers[0])
          .vote(id, VoteOption.Yes, true);
        expect(await findEvent(tx, DAO_EVENTS.EXECUTED)).to.be.undefined;

        // `tryEarlyExecution` is turned off and the vote is decided
        await governanceErc20Mock.mock.getPastVotes.returns(1);
        tx = await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        expect(await findEvent(tx, DAO_EVENTS.EXECUTED)).to.be.undefined;

        // `tryEarlyExecution` is turned on and the vote is decided
        tx = await voting.connect(signers[2]).vote(id, VoteOption.Yes, true);
        {
          const event = await findEvent(tx, DAO_EVENTS.EXECUTED);

          expect(event.args.actor).to.equal(voting.address);
          expect(event.args.callId).to.equal(id);
          expect(event.args.actions.length).to.equal(1);
          expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
          expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
          expect(event.args.actions[0].data).to.equal(dummyActions[0].data);
          expect(event.args.execResults).to.deep.equal(['0x']);

          const vote = await voting.getProposal(id);

          expect(vote.executed).to.equal(true);
        }

        // check for the `ProposalExecuted` event in the voting contract
        {
          const event = await findEvent(tx, VOTING_EVENTS.PROPOSAL_EXECUTED);
          expect(event.args.proposalId).to.equal(id);
          expect(event.args.execResults).to.deep.equal(['0x']);
        }

        // calling execute again should fail
        await expect(voting.execute(id)).to.be.revertedWith(
          customError('ProposalExecutionForbidden', id)
        );
      });

      it('reverts if vote is not decided yet', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await expect(voting.execute(id)).to.be.revertedWith(
          customError('ProposalExecutionForbidden', id)
        );
      });
    });

    context('Vote Replacement', async () => {
      beforeEach(async () => {
        majorityVotingSettings.voteMode = VoteMode.VoteReplacement;

        await voting.initialize(
          dao.address,
          majorityVotingSettings,
          governanceErc20Mock.address
        );

        // set voting power to 100
        await governanceErc20Mock.mock.getPastTotalSupply.returns(
          totalVotingPower
        );
        await governanceErc20Mock.mock.getPastVotes.returns(1);

        expect(
          (
            await voting.createProposal(
              dummyMetadata,
              dummyActions,
              startDate,
              endDate,
              false,
              VoteOption.None
            )
          ).value
        ).to.equal(id);
      });

      it('should allow vote replacement but not double-count votes by the same address', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastTotalSupply.returns(1);
        await governanceErc20Mock.mock.getPastVotes.returns(1);

        await voting.vote(id, VoteOption.Yes, false);
        await voting.vote(id, VoteOption.Yes, false);
        expect((await voting.getProposal(id)).tally.yes).to.equal(1);
        expect((await voting.getProposal(id)).tally.no).to.equal(0);
        expect((await voting.getProposal(id)).tally.abstain).to.equal(0);

        await voting.vote(id, VoteOption.No, false);
        await voting.vote(id, VoteOption.No, false);
        expect((await voting.getProposal(id)).tally.yes).to.equal(0);
        expect((await voting.getProposal(id)).tally.no).to.equal(1);
        expect((await voting.getProposal(id)).tally.abstain).to.equal(0);

        await voting.vote(id, VoteOption.Abstain, false);
        await voting.vote(id, VoteOption.Abstain, false);
        expect((await voting.getProposal(id)).tally.yes).to.equal(0);
        expect((await voting.getProposal(id)).tally.no).to.equal(0);
        expect((await voting.getProposal(id)).tally.abstain).to.equal(1);
      });

      it('cannot early execute', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(51);
        await voting.vote(id, VoteOption.Yes, false);

        expect(await voting.worstCaseSupport(id)).to.be.gt(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('can execute normally if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(30);
        await voting.vote(id, VoteOption.Yes, false);
        await governanceErc20Mock.mock.getPastVotes.returns(20);
        await voting.vote(id, VoteOption.No, false);
        await governanceErc20Mock.mock.getPastVotes.returns(20);
        await voting.vote(id, VoteOption.Abstain, false);

        expect(await voting.worstCaseSupport(id)).to.be.lte(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.support(id)).to.be.gt(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );

        expect(await voting.canExecute(id)).to.equal(true);
      });

      it('does not execute when voting with the `tryEarlyExecution` option', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(50);
        await voting.vote(id, VoteOption.Yes, false);
        expect(await voting.canExecute(id)).to.equal(false);

        // `tryEarlyExecution` is turned on but the vote is not decided yet
        await governanceErc20Mock.mock.getPastVotes.returns(1);
        let tx = await voting
          .connect(signers[1])
          .vote(id, VoteOption.Yes, true);

        expect(await voting.worstCaseSupport(id)).to.be.gt(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.canExecute(id)).to.equal(false);

        expect(await findEvent(tx, DAO_EVENTS.EXECUTED)).to.be.undefined;

        // `tryEarlyExecution` is turned off and the vote is decided
        tx = await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        expect(await findEvent(tx, DAO_EVENTS.EXECUTED)).to.be.undefined;

        // `tryEarlyExecution` is turned on and the vote is decided
        tx = await voting.connect(signers[1]).vote(id, VoteOption.Yes, true);
        expect(await findEvent(tx, DAO_EVENTS.EXECUTED)).to.be.undefined;
      });

      it('reverts if vote is not decided yet', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await expect(voting.execute(id)).to.be.revertedWith(
          customError('ProposalExecutionForbidden', id)
        );
      });
    });
  });

  describe('Configurations for different use cases', async () => {
    describe('A simple majority vote with >50% support and >=25% participation required', async () => {
      beforeEach(async () => {
        majorityVotingSettings.minParticipation = pct16(25);

        await voting.initialize(
          dao.address,
          majorityVotingSettings,
          governanceErc20Mock.address
        );

        // set voting power to 100
        await governanceErc20Mock.mock.getPastTotalSupply.returns(
          totalVotingPower
        );
        await governanceErc20Mock.mock.getPastVotes.returns(1);

        await voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          0,
          false,
          VoteOption.None
        );
      });

      it('does not execute if support is high enough but participation is too low', async () => {
        advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(10);
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        expect(await voting.participation(id)).to.be.lt(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.worstCaseSupport(id)).to.be.lte(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.lt(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.support(id)).to.be.gt(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('does not execute if participation is high enough but support is too low', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(10);
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await governanceErc20Mock.mock.getPastVotes.returns(20);
        await voting.connect(signers[1]).vote(id, VoteOption.No, false);

        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.worstCaseSupport(id)).to.be.lte(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.support(id)).to.be.lte(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('executes after the duration if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await governanceErc20Mock.mock.getPastVotes.returns(30);
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.worstCaseSupport(id)).to.be.lte(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.support(id)).to.be.gt(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(true);
      });

      it('executes early if participation and support are met and the vote outcome cannot change anymore', async () => {
        await governanceErc20Mock.mock.getPastVotes.returns(50);
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.worstCaseSupport(id)).to.be.lte(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await governanceErc20Mock.mock.getPastVotes.returns(10);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);

        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.worstCaseSupport(id)).to.be.gt(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(true);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(
          majorityVotingSettings.minParticipation
        );
        expect(await voting.support(id)).to.be.gt(
          majorityVotingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(true);
      });
    });
  });
});
