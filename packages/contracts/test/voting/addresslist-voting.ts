import {expect} from 'chai';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {DAO} from '../../typechain';
import {findEvent, DAO_EVENTS, VOTING_EVENTS} from '../../utils/event';
import {getMergedABI} from '../../utils/abi';
import {
  VoteOption,
  pct16,
  getTime,
  advanceIntoVoteTime,
  advanceAfterVoteEnd,
} from '../test-utils/voting';
import {customError, ERRORS} from '../test-utils/custom-error-helper';

describe('AddresslistVoting', function () {
  let signers: SignerWithAddress[];
  let voting: any;
  let dao: DAO;
  let dummyActions: any;
  let dummyMetadata: string;
  let startDate: number;
  let endDate: number;
  let supportThreshold: BigNumber;
  let minParticipation: BigNumber;
  const startOffset = 10;
  const minDuration = 500;
  const id = 0;

  let mergedAbi: any;
  let addresslistVotingFactoryBytecode: any;

  before(async () => {
    signers = await ethers.getSigners();

    ({abi: mergedAbi, bytecode: addresslistVotingFactoryBytecode} =
      await getMergedABI(
        // @ts-ignore
        hre,
        'AddresslistVoting',
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
    const AddresslistVotingFactory = new ethers.ContractFactory(
      mergedAbi,
      addresslistVotingFactoryBytecode,
      signers[0]
    );
    voting = await AddresslistVotingFactory.deploy();

    startDate = (await getTime()) + startOffset;
    endDate = startDate + minDuration;

    dao.grant(
      dao.address,
      voting.address,
      ethers.utils.id('EXECUTE_PERMISSION')
    );
    dao.grant(
      voting.address,
      signers[0].address,
      ethers.utils.id('MODIFY_ADDRESSLIST_PERMISSION')
    );
  });

  function addresslist(length: number): string[] {
    let addresses: string[] = [];

    for (let i = 0; i < length; i++) {
      const addr = signers[i].address;
      addresses.push(addr);
    }
    return addresses;
  }

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      supportThreshold = pct16(50);
      minParticipation = pct16(20);

      await voting.initialize(
        dao.address,
        supportThreshold,
        minParticipation,
        minDuration,
        addresslist(0)
      );

      await expect(
        voting.initialize(
          dao.address,
          supportThreshold,
          minParticipation,
          minDuration,
          addresslist(0)
        )
      ).to.be.revertedWith(ERRORS.ALREADY_INITIALIZED);
    });
  });

  describe('Addresslisting members: ', async () => {
    beforeEach(async () => {
      supportThreshold = pct16(50);
      minParticipation = pct16(20);

      await voting.initialize(
        dao.address,
        supportThreshold,
        minParticipation,
        minDuration,
        addresslist(0)
      );
    });
    it('should return false, if user is not allowed', async () => {
      const block1 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(await voting.isListed(signers[0].address, block1.number)).to.equal(
        false
      );
    });

    it('should add new users in the address list', async () => {
      await voting.addAddresses([signers[0].address, signers[1].address]);

      const block = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);

      expect(await voting.isListed(signers[0].address, block.number)).to.equal(
        true
      );
      expect(await voting.isListed(signers[0].address, 0)).to.equal(true);
      expect(await voting.isListed(signers[1].address, 0)).to.equal(true);
    });

    it('should remove users from the address list', async () => {
      await voting.addAddresses(addresslist(1));

      const block1 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(await voting.isListed(signers[0].address, block1.number)).to.equal(
        true
      );
      expect(await voting.isListed(signers[0].address, 0)).to.equal(true);

      await voting.removeAddresses(addresslist(1));

      const block2 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(await voting.isListed(signers[0].address, block2.number)).to.equal(
        false
      );
      expect(await voting.isListed(signers[0].address, 0)).to.equal(false);
    });
  });

  describe('Proposal creation', async () => {
    beforeEach(async () => {
      supportThreshold = pct16(50);
      minParticipation = pct16(20);

      await voting.initialize(
        dao.address,
        supportThreshold,
        minParticipation,
        minDuration,
        addresslist(1)
      );
    });

    it('reverts if user is not allowed to create a vote', async () => {
      await expect(
        voting
          .connect(signers[1])
          .createProposal(dummyMetadata, [], 0, 0, false, VoteOption.None)
      ).to.be.revertedWith(
        customError('ProposalCreationForbidden', signers[1].address)
      );
    });

    it('reverts if vote duration is less than the minimal duration', async () => {
      const tooShortEndDate = endDate - 10;

      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          startDate,
          tooShortEndDate,
          false,
          VoteOption.None
        )
      ).to.be.revertedWith(
        customError(
          'VotingPeriodInvalid',
          (await getTime()) + 1,
          startDate,
          tooShortEndDate,
          minDuration
        )
      );
    });

    it('should create a vote successfully, but not vote', async () => {
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

      const vote = await voting.getProposal(id);
      expect(vote.open).to.equal(true);
      expect(vote.executed).to.equal(false);
      expect(vote.snapshotBlock).to.equal(block.number - 1);
      expect(vote._supportThreshold).to.equal(supportThreshold);
      expect(vote._minParticipation).to.equal(minParticipation);
      expect(vote.yes).to.equal(0);
      expect(vote.no).to.equal(0);

      expect(vote.startDate.add(minDuration)).to.equal(vote.endDate);

      expect(await voting.canVote(id, signers[0].address)).to.equal(true);
      expect(await voting.canVote(id, signers[1].address)).to.equal(false);
      expect(await voting.canVote(1, signers[0].address)).to.equal(false);

      expect(vote.actions.length).to.equal(1);
      expect(vote.actions[0].to).to.equal(dummyActions[0].to);
      expect(vote.actions[0].value).to.equal(dummyActions[0].value);
      expect(vote.actions[0].data).to.equal(dummyActions[0].data);
    });

    it('should create a vote and cast a vote immediately', async () => {
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
      expect(proposal.snapshotBlock).to.equal(block.number - 1);
      expect(proposal._supportThreshold).to.equal(supportThreshold);
      expect(proposal._minParticipation).to.equal(minParticipation);

      expect(proposal.yes).to.equal(1);
      expect(proposal.no).to.equal(0);
    });

    it('reverts creation when voting before the start date', async () => {
      expect(await getTime()).to.be.lessThan(startDate);

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
    const supportThreshold = pct16(50);
    const minParticipation = pct16(20);

    beforeEach(async () => {
      await voting.initialize(
        dao.address,
        supportThreshold,
        minParticipation,
        minDuration,
        addresslist(10)
      );

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

      expect(await voting.canVote(id, signers[0].address)).to.equal(false);

      await expect(voting.vote(id, VoteOption.Yes, false)).to.be.revertedWith(
        customError('VoteCastForbidden', id, signers[0].address)
      );
    });

    it('increases the yes, no, and abstain count and emits correct events', async () => {
      await advanceIntoVoteTime(startDate, endDate);

      expect(await voting.vote(id, VoteOption.Yes, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, signers[0].address, VoteOption.Yes, 1);

      let vote = await voting.getProposal(id);
      expect(vote.yes).to.equal(1);

      expect(await voting.vote(id, VoteOption.No, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, signers[0].address, VoteOption.No, 1);

      vote = await voting.getProposal(id);
      expect(vote.no).to.equal(1);

      expect(await voting.vote(id, VoteOption.Abstain, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, signers[0].address, VoteOption.Abstain, 1);

      vote = await voting.getProposal(id);
      expect(vote.abstain).to.equal(1);
    });

    it('should not double-count votes by the same address', async () => {
      await advanceIntoVoteTime(startDate, endDate);

      await voting.vote(id, VoteOption.Yes, false);
      await voting.vote(id, VoteOption.Yes, false);
      expect((await voting.getProposal(id)).yes).to.equal(1);
      expect((await voting.getProposal(id)).no).to.equal(0);
      expect((await voting.getProposal(id)).abstain).to.equal(0);

      await voting.vote(id, VoteOption.No, false);
      await voting.vote(id, VoteOption.No, false);
      expect((await voting.getProposal(id)).yes).to.equal(0);
      expect((await voting.getProposal(id)).no).to.equal(1);
      expect((await voting.getProposal(id)).abstain).to.equal(0);

      await voting.vote(id, VoteOption.Abstain, false);
      await voting.vote(id, VoteOption.Abstain, false);
      expect((await voting.getProposal(id)).yes).to.equal(0);
      expect((await voting.getProposal(id)).no).to.equal(0);
      expect((await voting.getProposal(id)).abstain).to.equal(1);
    });

    it('can execute early if participation is large enough', async () => {
      await advanceIntoVoteTime(startDate, endDate);

      await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[3]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[4]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);

      expect(await voting.participation(id)).to.be.gte(minParticipation);
      expect(await voting.worstCaseSupport(id)).to.be.gt(supportThreshold);
      expect(await voting.canExecute(id)).to.equal(true);
    });

    it('can execute normally if participation and support are met', async () => {
      await advanceIntoVoteTime(startDate, endDate);

      await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[3]).vote(id, VoteOption.No, false);
      await voting.connect(signers[4]).vote(id, VoteOption.No, false);
      await voting.connect(signers[5]).vote(id, VoteOption.Abstain, false);
      await voting.connect(signers[6]).vote(id, VoteOption.Abstain, false);

      expect(await voting.participation(id)).to.be.gte(minParticipation);
      expect(await voting.worstCaseSupport(id)).to.be.lte(supportThreshold);
      expect(await voting.canExecute(id)).to.equal(false);

      await advanceAfterVoteEnd(endDate);

      expect(await voting.participation(id)).to.be.gte(minParticipation);
      expect(await voting.support(id)).to.be.gt(supportThreshold);
      expect(await voting.canExecute(id)).to.equal(true);
    });

    it('executes the vote immediately when the vote is decided early and the executeIfDecided options is selected', async () => {
      await advanceIntoVoteTime(startDate, endDate);

      await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[3]).vote(id, VoteOption.Yes, false);

      // `executeIfDecided` is turned on but the vote is not decided yet
      await voting.connect(signers[4]).vote(id, VoteOption.Yes, true);
      let tx = await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);
      expect(await findEvent(tx, DAO_EVENTS.EXECUTED)).to.be.undefined;

      // `executeIfDecided` is turned off and the vote is decided
      tx = await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);
      expect(await findEvent(tx, DAO_EVENTS.EXECUTED)).to.be.undefined;

      // `executeIfDecided` is turned on and the vote is decided
      tx = await voting.connect(signers[5]).vote(id, VoteOption.Yes, true);
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

  describe('Parameters can satisfy different use cases:', async () => {
    describe('A simple majority vote with >50% support and >=25% participation required', async () => {
      supportThreshold = pct16(50);
      minParticipation = pct16(25);

      beforeEach(async () => {
        await voting.initialize(
          dao.address,
          supportThreshold,
          minParticipation,
          minDuration,
          addresslist(10)
        );

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
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        expect(await voting.participation(id)).to.be.lt(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.lte(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.lt(minParticipation);
        expect(await voting.support(id)).to.be.gt(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('does not execute if participation is high enough but support is too low', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.No, false);
        await voting.connect(signers[2]).vote(id, VoteOption.No, false);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.lte(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.support(id)).to.be.lte(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('executes after the duration if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.lte(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.support(id)).to.be.gt(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(true); // all criteria are met
      });

      it('executes early if participation and support are met and the vote outcome cannot change anymore', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[3]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[4]).vote(id, VoteOption.Yes, false);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.lte(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(false);

        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.gt(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(true);

        await voting.connect(signers[6]).vote(id, VoteOption.No, false);
        await voting.connect(signers[7]).vote(id, VoteOption.No, false);
        await voting.connect(signers[8]).vote(id, VoteOption.No, false);
        await voting.connect(signers[9]).vote(id, VoteOption.No, false);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.gt(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(true);
      });
    });

    describe('A special majority vote with >50% support and >75% participation required', async () => {
      beforeEach(async () => {
        supportThreshold = pct16(50);
        minParticipation = pct16(75);

        await voting.initialize(
          dao.address,
          supportThreshold,
          minParticipation,
          minDuration,
          addresslist(10)
        );
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

      it('does not execute if support is high enough but participation is too low', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        expect(await voting.participation(id)).to.be.lt(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.lte(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.lt(minParticipation);
        expect(await voting.support(id)).to.be.gt(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('does not execute if participation is high enough but support is too low', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.No, false);
        await voting.connect(signers[2]).vote(id, VoteOption.No, false);
        await voting.connect(signers[3]).vote(id, VoteOption.No, false);
        await voting.connect(signers[4]).vote(id, VoteOption.No, false);
        await voting.connect(signers[5]).vote(id, VoteOption.No, false);
        await voting.connect(signers[6]).vote(id, VoteOption.No, false);
        await voting.connect(signers[7]).vote(id, VoteOption.No, false);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.lte(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.support(id)).to.be.lte(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('executes after the duration if participation and support thresholds are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[3]).vote(id, VoteOption.No, false);
        await voting.connect(signers[4]).vote(id, VoteOption.No, false);
        await voting.connect(signers[5]).vote(id, VoteOption.Abstain, false);
        await voting.connect(signers[6]).vote(id, VoteOption.Abstain, false);
        await voting.connect(signers[7]).vote(id, VoteOption.Abstain, false);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.lte(supportThreshold);
        expect(await voting.canExecute(id)).to.eq(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.support(id)).to.be.gt(supportThreshold);
        expect(await voting.canExecute(id)).to.eq(true);
      });

      it('should not allow the vote to pass if the minimum participation is not reached', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[3]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[4]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);

        expect(await voting.participation(id)).to.be.lt(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.gt(supportThreshold);
        expect(await voting.canExecute(id)).to.eq(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.participation(id)).to.be.lt(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.gt(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('executes early if the participation exceeds the support threshold (assuming the latter is > 50%)', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[3]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[4]).vote(id, VoteOption.No, false);
        await voting.connect(signers[5]).vote(id, VoteOption.No, false);
        await voting.connect(signers[6]).vote(id, VoteOption.No, false);

        expect(await voting.participation(id)).to.be.lt(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.lte(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(false);

        await voting.connect(signers[7]).vote(id, VoteOption.No, false);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.lte(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(false); // participation is met but not support

        // let signer[7] switch vote from no to yes // TODO ADAPT TEST IF VOTE REPLACEMENT AND EARLY EXECUTION ARE MADE MUTUALLY EXCLUSIVE
        await voting.connect(signers[7]).vote(id, VoteOption.Yes, false);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.lte(supportThreshold);

        expect(await voting.canExecute(id)).to.equal(false); // Still not sufficient for early execution because the support could still be <= 50 if the two remaining voters vote no

        await voting.connect(signers[8]).vote(id, VoteOption.Abstain, false);

        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.worstCaseSupport(id)).to.be.gt(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(true); // The vote` outcome cannot change anymore (5 yes, 3 no, 1 abstain)

        await advanceAfterVoteEnd(endDate);

        // this doesn't change after the vote is over
        expect(await voting.participation(id)).to.be.gte(minParticipation);
        expect(await voting.support(id)).to.be.gt(supportThreshold);
        expect(await voting.canExecute(id)).to.equal(true);
      });
    });
  });
});
