import {expect} from 'chai';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  DAO,
  GovernanceERC20Mock,
  GovernanceERC20Mock__factory,
} from '../../typechain';
import {
  findEvent,
  DAO_EVENTS,
  VOTING_EVENTS,
  PROPOSAL_EVENTS,
} from '../../utils/event';
import {getMergedABI} from '../../utils/abi';
import {
  VoteOption,
  pct16,
  getTime,
  advanceIntoVoteTime,
  advanceAfterVoteEnd,
  VotingSettings,
  VotingMode,
  ONE_HOUR,
  MAX_UINT64,
  voteWithSigners,
} from '../test-utils/voting';
import {OZ_ERRORS} from '../test-utils/error';

describe('TokenVoting', function () {
  let signers: SignerWithAddress[];
  let voting: any;
  let dao: DAO;
  let governanceErc20Mock: GovernanceERC20Mock;
  let GovernanceERC20Mock: GovernanceERC20Mock__factory;
  let dummyActions: any;
  let dummyMetadata: string;
  let startDate: number;
  let endDate: number;
  let votingSettings: VotingSettings;

  const startOffset = 20;
  const id = 0;

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
    votingSettings = {
      votingMode: VotingMode.EarlyExecution,
      supportThreshold: pct16(50),
      minParticipation: pct16(20),
      minDuration: ONE_HOUR,
      minProposerVotingPower: 0,
    };

    GovernanceERC20Mock = await ethers.getContractFactory(
      'GovernanceERC20Mock'
    );
    governanceErc20Mock = await GovernanceERC20Mock.deploy(
      dao.address,
      'GOV',
      'GOV',
      {
        receivers: [],
        amounts: [],
      }
    );

    const TokenVotingFactory = new ethers.ContractFactory(
      mergedAbi,
      tokenVotingFactoryBytecode,
      signers[0]
    );
    voting = await TokenVotingFactory.deploy();

    startDate = (await getTime()) + startOffset;
    endDate = startDate + votingSettings.minDuration;

    dao.grant(
      dao.address,
      voting.address,
      ethers.utils.id('EXECUTE_PERMISSION')
    );
  });

  async function setBalances(balances: {receiver: string; amount: number}[]) {
    const promises = balances.map(balance =>
      governanceErc20Mock.setBalance(balance.receiver, balance.amount)
    );
    await Promise.all(promises);
  }

  async function setTotalSupply(totalSupply: number) {
    await ethers.provider.send('evm_mine', []);
    let block = await ethers.provider.getBlock('latest');

    const currentTotalSupply: BigNumber =
      await governanceErc20Mock.getPastTotalSupply(block.number - 1);

    await governanceErc20Mock.setBalance(
      `0x${'0'.repeat(39)}1`, // address(1)
      BigNumber.from(totalSupply).sub(currentTotalSupply)
    );
  }

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );

      await expect(
        voting.initialize(
          dao.address,
          votingSettings,
          governanceErc20Mock.address
        )
      ).to.be.revertedWith(OZ_ERRORS.ALREADY_INITIALIZED);
    });
  });

  describe('Proposal creation', async () => {
    beforeEach(async () => {
      await setBalances([{receiver: signers[0].address, amount: 1}]);
      await setTotalSupply(1);
    });

    it('reverts if the user is not allowed to create a proposal', async () => {
      votingSettings.minProposerVotingPower = 1;

      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );

      await expect(
        voting
          .connect(signers[9])
          .createProposal(
            dummyMetadata,
            [],
            startDate,
            endDate,
            VoteOption.None,
            false
          )
      )
        .to.be.revertedWithCustomError(voting, 'ProposalCreationForbidden')
        .withArgs(signers[9].address);

      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          startDate,
          endDate,
          VoteOption.None,
          false
        )
      ).to.not.be.reverted;
    });

    it('reverts if the user is not allowed to create a proposal and minProposerPower > 1 is selected', async () => {
      votingSettings.minProposerVotingPower = 123;

      await setBalances([
        {
          receiver: signers[1].address,
          amount: votingSettings.minProposerVotingPower,
        },
      ]);

      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );

      await expect(
        voting
          .connect(signers[0])
          .createProposal(
            dummyMetadata,
            [],
            startDate,
            endDate,
            VoteOption.None,
            false
          )
      )
        .to.be.revertedWithCustomError(voting, 'ProposalCreationForbidden')
        .withArgs(signers[0].address);

      await expect(
        voting
          .connect(signers[1])
          .createProposal(
            dummyMetadata,
            [],
            startDate,
            endDate,
            VoteOption.None,
            false
          )
      ).to.not.be.reverted;
    });

    it('reverts if the total token supply is 0', async () => {
      governanceErc20Mock = await GovernanceERC20Mock.deploy(
        dao.address,
        'GOV',
        'GOV',
        {
          receivers: [],
          amounts: [],
        }
      );

      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );

      await expect(
        voting.createProposal(dummyMetadata, [], 0, 0, VoteOption.None, false)
      ).to.be.revertedWithCustomError(voting, 'NoVotingPower');
    });

    it('reverts if the start date is set smaller than the current date', async () => {
      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );

      const currentDate = await getTime();
      const startDateInThePast = currentDate - 1;
      const endDate = 0; // startDate + minDuration

      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          startDateInThePast,
          endDate,
          VoteOption.None,
          false
        )
      )
        .to.be.revertedWithCustomError(voting, 'DateOutOfBounds')
        .withArgs(
          currentDate + 1, // await takes one second
          startDateInThePast
        );
    });

    it('panics if the start date is after the latest start date', async () => {
      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );

      const latestStartDate = MAX_UINT64.sub(votingSettings.minDuration);
      const tooLateStartDate = latestStartDate.add(1);
      const endDate = 0; // startDate + minDuration

      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          tooLateStartDate,
          endDate,
          VoteOption.None,
          false
        )
      ).to.be.revertedWithPanic(0x11);
    });

    it('reverts if the end date is before the earliest end date so that min duration cannot be met', async () => {
      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );

      const startDate = (await getTime()) + 1;
      const earliestEndDate = startDate + votingSettings.minDuration;
      const tooEarlyEndDate = earliestEndDate - 1;

      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          startDate,
          tooEarlyEndDate,
          VoteOption.None,
          false
        )
      )
        .to.be.revertedWithCustomError(voting, 'DateOutOfBounds')
        .withArgs(earliestEndDate, tooEarlyEndDate);
    });

    it('should create a vote successfully, but not vote', async () => {
      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );

      let tx = await voting.createProposal(
        dummyMetadata,
        dummyActions,
        0,
        0,
        VoteOption.None,
        false
      );

      await expect(tx)
        .to.emit(voting, PROPOSAL_EVENTS.PROPOSAL_CREATED)
        .to.not.emit(voting, VOTING_EVENTS.VOTE_CAST);

      const event = await findEvent(tx, PROPOSAL_EVENTS.PROPOSAL_CREATED);
      expect(event.args.proposalId).to.equal(id);
      expect(event.args.creator).to.equal(signers[0].address);
      expect(event.args.metadata).to.equal(dummyMetadata);
      expect(event.args.actions.length).to.equal(1);
      expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
      expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
      expect(event.args.actions[0].data).to.equal(dummyActions[0].data);

      const block = await ethers.provider.getBlock('latest');

      const proposal = await voting.getProposal(id);

      expect(proposal.open).to.equal(true);
      expect(proposal.executed).to.equal(false);
      expect(proposal.parameters.supportThreshold).to.equal(
        votingSettings.supportThreshold
      );
      expect(proposal.parameters.minParticipation).to.equal(
        votingSettings.minParticipation
      );
      expect(proposal.parameters.snapshotBlock).to.equal(block.number - 1);
      expect(
        proposal.parameters.startDate.add(votingSettings.minDuration)
      ).to.equal(proposal.parameters.endDate);

      expect(proposal.tally.totalVotingPower).to.equal(1);
      expect(proposal.tally.yes).to.equal(0);
      expect(proposal.tally.no).to.equal(0);

      expect(
        await voting.canVote(1, signers[0].address, VoteOption.Yes)
      ).to.equal(false);

      expect(proposal.actions.length).to.equal(1);
      expect(proposal.actions[0].to).to.equal(dummyActions[0].to);
      expect(proposal.actions[0].value).to.equal(dummyActions[0].value);
      expect(proposal.actions[0].data).to.equal(dummyActions[0].data);
    });

    it('should create a vote and cast a vote immediately', async () => {
      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );

      let tx = await voting.createProposal(
        dummyMetadata,
        dummyActions,
        0,
        0,
        VoteOption.Yes,
        false
      );

      await expect(tx)
        .to.emit(voting, PROPOSAL_EVENTS.PROPOSAL_CREATED)
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, signers[0].address, VoteOption.Yes, 1);

      const event = await findEvent(tx, PROPOSAL_EVENTS.PROPOSAL_CREATED);
      expect(event.args.proposalId).to.equal(id);
      expect(event.args.creator).to.equal(signers[0].address);
      expect(event.args.metadata).to.equal(dummyMetadata);
      expect(event.args.actions.length).to.equal(1);
      expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
      expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
      expect(event.args.actions[0].data).to.equal(dummyActions[0].data);

      const block = await ethers.provider.getBlock('latest');

      const proposal = await voting.getProposal(id);
      expect(proposal.open).to.equal(true);
      expect(proposal.executed).to.equal(false);
      expect(proposal.parameters.supportThreshold).to.equal(
        votingSettings.supportThreshold
      );
      expect(proposal.parameters.minParticipation).to.equal(
        votingSettings.minParticipation
      );
      expect(proposal.parameters.snapshotBlock).to.equal(block.number - 1);

      expect(proposal.tally.totalVotingPower).to.equal(1);
      expect(proposal.tally.yes).to.equal(1);
      expect(proposal.tally.no).to.equal(0);
      expect(proposal.tally.abstain).to.equal(0);
    });

    it('reverts creation when voting before the start date', async () => {
      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );

      expect(await getTime()).to.be.lessThan(startDate);

      // Reverts if the vote option is not 'None'
      await expect(
        voting.createProposal(
          dummyMetadata,
          dummyActions,
          startDate,
          endDate,
          VoteOption.Yes,
          false
        )
      )
        .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
        .withArgs(id, signers[0].address, VoteOption.Yes);

      // Works if the vote option is 'None'
      expect(
        (
          await voting.createProposal(
            dummyMetadata,
            dummyActions,
            startDate,
            endDate,
            VoteOption.None,
            false
          )
        ).value
      ).to.equal(id);
    });
  });

  describe('Proposal + Execute:', async () => {
    beforeEach(async () => {
      const receivers = signers.slice(0, 12).map(s => s.address);
      const amounts = Array(9).fill(10).concat([5, 4, 1]);

      const balances = receivers.map((receiver, i) => {
        return {
          receiver: receiver,
          amount: amounts[i],
        };
      });

      await setBalances(balances);
      await setTotalSupply(100);
    });

    context('Standard Mode', async () => {
      beforeEach(async () => {
        votingSettings.votingMode = VotingMode.Standard;

        await voting.initialize(
          dao.address,
          votingSettings,
          governanceErc20Mock.address
        );

        expect(
          (
            await voting.createProposal(
              dummyMetadata,
              dummyActions,
              startDate,
              endDate,
              VoteOption.None,
              false
            )
          ).value
        ).to.equal(id);
      });

      it('reverts on voting None', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await expect(voting.vote(id, VoteOption.None, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.None);
      });

      it('reverts on vote replacement', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.vote(id, VoteOption.Yes, false);

        // Try to replace the vote
        await expect(voting.vote(id, VoteOption.Yes, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.Yes);
        await expect(voting.vote(id, VoteOption.No, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.No);
        await expect(voting.vote(id, VoteOption.Abstain, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.Abstain);
        await expect(voting.vote(id, VoteOption.None, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.None);
      });

      it('cannot early execute', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4, 5], // 60 votes
          no: [],
          abstain: [],
        });

        expect(await voting.worstCaseSupport(id)).to.be.gt(
          votingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('can execute normally if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 30 votes
          no: [3, 4], // 20 votes
          abstain: [5, 6], // 20 votes
        });

        expect(await voting.worstCaseSupport(id)).to.be.lte(
          votingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.support(id)).to.be.gt(
          votingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );

        expect(await voting.canExecute(id)).to.equal(true);
      });

      it('does not execute early when voting with the `tryEarlyExecution` option', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3], // 40 votes
          no: [],
          abstain: [],
        });

        expect(await voting.canExecute(id)).to.equal(false);

        // `tryEarlyExecution` is turned on but the vote is not decided yet
        await voting.connect(signers[4]).vote(id, VoteOption.Yes, true);
        expect((await voting.getProposal(id)).executed).to.equal(false);
        expect(await voting.canExecute(id)).to.equal(false);

        // `tryEarlyExecution` is turned off and the vote is decided
        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);
        expect((await voting.getProposal(id)).executed).to.equal(false);
        expect(await voting.canExecute(id)).to.equal(false);

        // `tryEarlyExecution` is turned on and the vote is decided
        await voting.connect(signers[6]).vote(id, VoteOption.Yes, true);
        expect((await voting.getProposal(id)).executed).to.equal(false);
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('reverts if vote is not decided yet', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await expect(voting.execute(id))
          .to.be.revertedWithCustomError(voting, 'ProposalExecutionForbidden')
          .withArgs(id);
      });
    });
    context('Early Execution', async () => {
      beforeEach(async () => {
        votingSettings.votingMode = VotingMode.EarlyExecution;

        await voting.initialize(
          dao.address,
          votingSettings,
          governanceErc20Mock.address
        );

        expect(
          (
            await voting.createProposal(
              dummyMetadata,
              dummyActions,
              startDate,
              endDate,
              VoteOption.None,
              false
            )
          ).value
        ).to.equal(id);
      });

      it('does not allow voting, when the vote has not started yet', async () => {
        expect(await getTime()).to.be.lessThan(startDate);

        await expect(voting.vote(id, VoteOption.Yes, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.Yes);
      });

      it('should not be able to vote if user has 0 token', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await expect(
          voting.connect(signers[19]).vote(id, VoteOption.Yes, false)
        )
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[19].address, VoteOption.Yes);
      });

      it('increases the yes, no, and abstain count and emits correct events', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await expect(voting.connect(signers[0]).vote(id, VoteOption.Yes, false))
          .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
          .withArgs(id, signers[0].address, VoteOption.Yes, 10);

        let proposal = await voting.getProposal(id);
        expect(proposal.tally.yes).to.equal(10);
        expect(proposal.tally.yes).to.equal(10);
        expect(proposal.tally.no).to.equal(0);
        expect(proposal.tally.abstain).to.equal(0);

        await expect(voting.connect(signers[1]).vote(id, VoteOption.No, false))
          .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
          .withArgs(id, signers[1].address, VoteOption.No, 10);

        proposal = await voting.getProposal(id);
        expect(proposal.tally.no).to.equal(10);
        expect(proposal.tally.no).to.equal(10);
        expect(proposal.tally.abstain).to.equal(0);

        await expect(
          voting.connect(signers[2]).vote(id, VoteOption.Abstain, false)
        )
          .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
          .withArgs(id, signers[2].address, VoteOption.Abstain, 10);

        proposal = await voting.getProposal(id);
        expect(proposal.tally.yes).to.equal(10);
        expect(proposal.tally.no).to.equal(10);
        expect(proposal.tally.abstain).to.equal(10);
      });

      it('reverts on voting None', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await expect(voting.vote(id, VoteOption.None, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.None);
      });

      it('reverts on vote replacement', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.vote(id, VoteOption.Yes, false);

        // Try to replace the vote
        await expect(voting.vote(id, VoteOption.Yes, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.Yes);
        await expect(voting.vote(id, VoteOption.No, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.No);
        await expect(voting.vote(id, VoteOption.Abstain, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.Abstain);
        await expect(voting.vote(id, VoteOption.None, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.None);
      });

      it('can execute early if participation is large enough', async () => {
        await advanceIntoVoteTime(startDate, endDate);
        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4], // 50 votes
          no: [],
          abstain: [],
        });

        expect(await voting.worstCaseSupport(id)).to.be.lte(
          votingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);
        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.worstCaseSupport(id)).to.be.gt(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(true);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.support(id)).to.be.gt(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(true);
      });

      it('can execute normally if participation is large enough', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4], // 50 yes
          no: [5, 6, 7], // 30 votes
          abstain: [8], // 10 votes
        });

        // closes the vote
        await advanceAfterVoteEnd(endDate);

        //The vote is executable as support > 50%, participation > 20%, and the voting period is over
        expect(await voting.canExecute(id)).to.equal(true);
      });

      it('cannot execute normally if participation is too low', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0], // 10 votes
          no: [9], //  5 votes
          abstain: [10], // 4 votes
        });

        // closes the vote
        await advanceAfterVoteEnd(endDate);

        //The vote is not executable because the participation with 19% is still too low, despite a support of 67% and the voting period being over
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('executes the vote immediately when the vote is decided early and the tryEarlyExecution options is selected', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3], // 40 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        // `tryEarlyExecution` is turned on but the vote is not decided yet
        await voting.connect(signers[4]).vote(id, VoteOption.Yes, true);
        expect((await voting.getProposal(id)).executed).to.equal(false);
        expect(await voting.canExecute(id)).to.equal(false);

        // `tryEarlyExecution` is turned off and the vote is decided
        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);
        expect((await voting.getProposal(id)).executed).to.equal(false);
        expect(await voting.canExecute(id)).to.equal(true);

        // `tryEarlyExecution` is turned on and the vote is decided
        let tx = await voting
          .connect(signers[6])
          .vote(id, VoteOption.Yes, true);
        {
          const event = await findEvent(tx, DAO_EVENTS.EXECUTED);

          expect(event.args.actor).to.equal(voting.address);
          expect(event.args.callId).to.equal(id);
          expect(event.args.actions.length).to.equal(1);
          expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
          expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
          expect(event.args.actions[0].data).to.equal(dummyActions[0].data);
          expect(event.args.execResults).to.deep.equal(['0x']);

          expect((await voting.getProposal(id)).executed).to.equal(true);
        }

        // check for the `ProposalExecuted` event in the voting contract
        {
          const event = await findEvent(tx, PROPOSAL_EVENTS.PROPOSAL_EXECUTED);
          expect(event.args.proposalId).to.equal(id);
        }

        // calling execute again should fail
        await expect(voting.execute(id))
          .to.be.revertedWithCustomError(voting, 'ProposalExecutionForbidden')
          .withArgs(id);
      });

      it('reverts if vote is not decided yet', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await expect(voting.execute(id))
          .to.be.revertedWithCustomError(voting, 'ProposalExecutionForbidden')
          .withArgs(id);
      });
    });

    context('Vote Replacement', async () => {
      beforeEach(async () => {
        votingSettings.votingMode = VotingMode.VoteReplacement;

        await voting.initialize(
          dao.address,
          votingSettings,
          governanceErc20Mock.address
        );

        expect(
          (
            await voting.createProposal(
              dummyMetadata,
              dummyActions,
              startDate,
              endDate,
              VoteOption.None,
              false
            )
          ).value
        ).to.equal(id);
      });

      it('reverts on voting None', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await expect(voting.vote(id, VoteOption.None, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.None);
      });

      it('should allow vote replacement but not double-count votes by the same address', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.vote(id, VoteOption.Yes, false);
        await voting.vote(id, VoteOption.Yes, false);
        expect((await voting.getProposal(id)).tally.yes).to.equal(10);
        expect((await voting.getProposal(id)).tally.no).to.equal(0);
        expect((await voting.getProposal(id)).tally.abstain).to.equal(0);

        await voting.vote(id, VoteOption.No, false);
        await voting.vote(id, VoteOption.No, false);
        expect((await voting.getProposal(id)).tally.yes).to.equal(0);
        expect((await voting.getProposal(id)).tally.no).to.equal(10);
        expect((await voting.getProposal(id)).tally.abstain).to.equal(0);

        await voting.vote(id, VoteOption.Abstain, false);
        await voting.vote(id, VoteOption.Abstain, false);
        expect((await voting.getProposal(id)).tally.yes).to.equal(0);
        expect((await voting.getProposal(id)).tally.no).to.equal(0);
        expect((await voting.getProposal(id)).tally.abstain).to.equal(10);

        await expect(voting.vote(id, VoteOption.None, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.None);
      });

      it('cannot early execute', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4, 5], // 60 votes
          no: [],
          abstain: [],
        });

        expect(await voting.worstCaseSupport(id)).to.be.gt(
          votingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('can execute normally if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 30 votes
          no: [3, 4], // 20 votes
          abstain: [5, 6], // 20 votes
        });

        expect(await voting.worstCaseSupport(id)).to.be.lte(
          votingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.support(id)).to.be.gt(
          votingSettings.supportThreshold
        );
        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );

        expect(await voting.canExecute(id)).to.equal(true);
      });

      it('does not execute early when voting with the `tryEarlyExecution` option', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3], // 40 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });
        expect((await voting.getProposal(id)).executed).to.equal(false);
        expect(await voting.canExecute(id)).to.equal(false); //

        // `tryEarlyExecution` is turned on but the vote is not decided yet
        await voting.connect(signers[4]).vote(id, VoteOption.Yes, true);
        expect((await voting.getProposal(id)).executed).to.equal(false);
        expect(await voting.canExecute(id)).to.equal(false);

        // `tryEarlyExecution` is turned off and the vote is decided
        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);
        expect((await voting.getProposal(id)).executed).to.equal(false);
        expect(await voting.canExecute(id)).to.equal(false);

        //// `tryEarlyExecution` is turned on and the vote is decided
        await voting.connect(signers[6]).vote(id, VoteOption.Yes, true);
        expect((await voting.getProposal(id)).executed).to.equal(false);
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('reverts if vote is not decided yet', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await expect(voting.execute(id))
          .to.be.revertedWithCustomError(voting, 'ProposalExecutionForbidden')
          .withArgs(id);
      });
    });
  });

  describe('Different configurations:', async () => {
    describe('A simple majority vote with >50% support and >=25% participation required', async () => {
      beforeEach(async () => {
        votingSettings.minParticipation = pct16(25);

        await voting.initialize(
          dao.address,
          votingSettings,
          governanceErc20Mock.address
        );

        const receivers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(
          i => signers[i].address
        );
        const amounts = Array(10).fill(10);
        const balances = receivers.map((receiver, i) => {
          return {
            receiver: receiver,
            amount: amounts[i],
          };
        });

        await setBalances(balances);
        await setTotalSupply(100);

        await voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          0,
          VoteOption.None,
          false
        );
      });

      it('does not execute if support is high enough but participation is too low', async () => {
        advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        expect(await voting.participation(id)).to.be.lt(
          votingSettings.minParticipation
        );
        expect(await voting.worstCaseSupport(id)).to.be.lte(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.lt(
          votingSettings.minParticipation
        );
        expect(await voting.support(id)).to.be.gt(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('does not execute if participation is high enough but support is too low', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0], // 10 votes
          no: [1, 2], //  20 votes
          abstain: [], // 0 votes
        });

        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.worstCaseSupport(id)).to.be.lte(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.support(id)).to.be.lte(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('executes after the duration if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 30 votes
          no: [], //  0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.worstCaseSupport(id)).to.be.lte(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.support(id)).to.be.gt(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(true);
      });

      it('executes early if participation and support are met and the vote outcome cannot change anymore', async () => {
        const promises = [0, 1, 2, 3, 4].map(i =>
          voting.connect(signers[i]).vote(id, VoteOption.Yes, false)
        );
        await Promise.all(promises);

        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.worstCaseSupport(id)).to.be.lte(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(false);

        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);
        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.worstCaseSupport(id)).to.be.gt(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(true);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.support(id)).to.be.gt(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(true);
      });
    });

    describe('An edge case with `supportThreshold = 0` and `minParticipation = 0` and early execution mode activated', async () => {
      beforeEach(async () => {
        votingSettings.supportThreshold = pct16(0);
        votingSettings.minParticipation = pct16(0);

        await voting.initialize(
          dao.address,
          votingSettings,
          governanceErc20Mock.address
        );

        await setBalances([{receiver: signers[0].address, amount: 1}]);
        await setTotalSupply(100);

        await voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          0,
          VoteOption.None,
          false
        );
      });

      it('does not execute with 0 votes', async () => {
        // does not execute early
        advanceIntoVoteTime(startDate, endDate);

        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        // worst case support can be calculated without throwing an error even if nobody has voted
        expect(await voting.worstCaseSupport(id)).to.be.eq(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(false);

        // does not execute normally
        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );

        await expect(voting.support(id)).to.be.revertedWithCustomError(
          voting,
          'ZeroValueNotAllowed'
        );
        await expect(voting.canExecute(id)).to.be.revertedWithCustomError(
          voting,
          'ZeroValueNotAllowed'
        );
      });

      it('executes if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        // Check if the proposal can execute early
        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.worstCaseSupport(id)).to.be.gt(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(true);

        // Check if the proposal can execute normally
        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(
          votingSettings.minParticipation
        );
        expect(await voting.support(id)).to.be.gt(
          votingSettings.supportThreshold
        );
        expect(await voting.canExecute(id)).to.equal(true);
      });
    });
  });
});
