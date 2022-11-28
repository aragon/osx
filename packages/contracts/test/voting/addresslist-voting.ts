import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {DAO} from '../../typechain';
import {findEvent, DAO_EVENTS, VOTING_EVENTS} from '../../utils/event';
import {getMergedABI} from '../../utils/abi';
import {
  VoteOption,
  pct16,
  getTime,
  advanceTime,
  advanceTimeTo,
} from '../test-utils/voting';
import {customError, ERRORS} from '../test-utils/custom-error-helper';

describe('AddresslistVoting', function () {
  let signers: SignerWithAddress[];
  let voting: any;
  let dao: DAO;
  let ownerAddress: string;
  let user1: string;
  let dummyActions: any;
  let dummyMetadata: string;

  let mergedAbi: any;
  let addresslistVotingFactoryBytecode: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
    user1 = await signers[1].getAddress();

    ({abi: mergedAbi, bytecode: addresslistVotingFactoryBytecode} =
      await getMergedABI(
        // @ts-ignore
        hre,
        'AddresslistVoting',
        ['DAO']
      ));

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
    const AddresslistVotingFactory = new ethers.ContractFactory(
      mergedAbi,
      addresslistVotingFactoryBytecode,
      signers[0]
    );
    voting = await AddresslistVotingFactory.deploy();

    dao.grant(
      dao.address,
      voting.address,
      ethers.utils.id('EXECUTE_PERMISSION')
    );
    dao.grant(
      voting.address,
      ownerAddress,
      ethers.utils.id('MODIFY_ADDRESSLIST_PERMISSION')
    );
  });

  function initializeVoting(
    participationThresholdPct: any,
    supportThresholdPct: any,
    minDuration: any,
    allowed: Array<string>
  ) {
    return voting.initialize(
      dao.address,
      participationThresholdPct,
      supportThresholdPct,
      minDuration,
      allowed
    );
  }

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await initializeVoting(1, 2, 3, []);

      await expect(initializeVoting(1, 2, 3, [])).to.be.revertedWith(
        ERRORS.ALREADY_INITIALIZED
      );
    });
  });

  describe('Addresslisting users: ', async () => {
    beforeEach(async () => {
      await initializeVoting(1, 2, 3, []);
    });
    it('should return false, if user is not allowed', async () => {
      const block1 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(await voting.isListed(ownerAddress, block1.number)).to.equal(
        false
      );
    });

    it('should add new users in the address list', async () => {
      await voting.addAddresses([ownerAddress, user1]);

      const block = await ethers.provider.getBlock('latest');

      await ethers.provider.send('evm_mine', []);

      expect(await voting.isListed(ownerAddress, block.number)).to.equal(true);
      expect(await voting.isListed(ownerAddress, 0)).to.equal(true);
      expect(await voting.isListed(user1, 0)).to.equal(true);
    });

    it('should remove users from the address list', async () => {
      await voting.addAddresses([ownerAddress]);

      const block1 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(await voting.isListed(ownerAddress, block1.number)).to.equal(true);
      expect(await voting.isListed(ownerAddress, 0)).to.equal(true);

      await voting.removeAddresses([ownerAddress]);

      const block2 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(await voting.isListed(ownerAddress, block2.number)).to.equal(
        false
      );
      expect(await voting.isListed(ownerAddress, 0)).to.equal(false);
    });
  });

  describe('Proposal creation', async () => {
    let minDuration = 500;
    let supportThresholdPct = pct16(50);
    let participationThresholdPct = pct16(20);
    const id = 0; // proposalId

    it('reverts if user is not allowed to create a vote', async () => {
      await initializeVoting(1, 2, minDuration, [ownerAddress]);

      await expect(
        voting
          .connect(signers[1])
          .createProposal(dummyMetadata, [], 0, 0, false, VoteOption.None)
      ).to.be.revertedWith(
        customError('ProposalCreationForbidden', signers[1].address)
      );
    });

    it('reverts if vote duration is less than the minimal duration', async () => {
      await initializeVoting(1, 2, minDuration, [ownerAddress]);

      const block = await ethers.provider.getBlock('latest');
      const current = block.timestamp;
      const startDate = block.timestamp;
      const endDate = startDate + (minDuration - 1);
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
        customError(
          'VotingPeriodInvalid',
          current + 1, // TODO hacky
          startDate,
          endDate,
          minDuration
        )
      );
    });

    it('should create a vote successfully, but not vote', async () => {
      await initializeVoting(1, 2, minDuration, [ownerAddress]);

      const id = 0; // proposalId

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
        .withArgs(id, ownerAddress, dummyMetadata);

      const block = await ethers.provider.getBlock('latest');

      const vote = await voting.getProposal(id);
      expect(vote.open).to.equal(true);
      expect(vote.executed).to.equal(false);
      expect(vote._supportThresholdPct).to.equal(2);
      expect(vote.snapshotBlock).to.equal(block.number - 1);
      expect(vote._participationThresholdPct).to.equal(1);
      expect(vote.yes).to.equal(0);
      expect(vote.no).to.equal(0);

      expect(vote.startDate.add(minDuration)).to.equal(vote.endDate);

      expect(await voting.canVote(id, ownerAddress)).to.equal(true);
      expect(await voting.canVote(id, user1)).to.equal(false);
      expect(await voting.canVote(1, ownerAddress)).to.equal(false);

      expect(vote.actions.length).to.equal(1);
      expect(vote.actions[0].to).to.equal(dummyActions[0].to);
      expect(vote.actions[0].value).to.equal(dummyActions[0].value);
      expect(vote.actions[0].data).to.equal(dummyActions[0].data);
    });

    it('should create a vote and cast a vote immediately', async () => {
      await initializeVoting(1, 2, minDuration, [ownerAddress]);

      const id = 0; // proposalId

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
        .withArgs(id, ownerAddress, dummyMetadata)
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.Yes, 1);

      const block = await ethers.provider.getBlock('latest');
      const vote = await voting.getProposal(id);
      expect(vote.open).to.equal(true);
      expect(vote.executed).to.equal(false);
      expect(vote._supportThresholdPct).to.equal(2);
      expect(vote.snapshotBlock).to.equal(block.number - 1);
      expect(vote._participationThresholdPct).to.equal(1);

      expect(vote.yes).to.equal(1);
      expect(vote.no).to.equal(0);
    });

    it('reverts creation when voting before the start date', async () => {
      const startOffset = 9;
      let startDate = (await getTime()) + startOffset;
      let endDate = startDate + minDuration;

      await initializeVoting(
        participationThresholdPct,
        supportThresholdPct,
        minDuration,
        [ownerAddress]
      );

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
      ).to.be.revertedWith(customError('VoteCastForbidden', id, ownerAddress));

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
    const minDuration = 500;
    const supportThresholdPct = pct16(29);
    const participationThresholdPct = pct16(19);
    const id = 0; // proposalId
    const startOffset = 9;
    let startDate: number;
    let endDate: number;

    beforeEach(async () => {
      startDate = (await getTime()) + startOffset;
      endDate = startDate + minDuration;

      const addresses = [];

      for (let i = 0; i < 10; i++) {
        const addr = await signers[i].getAddress();
        addresses.push(addr);
      }

      // voting will be initialized with 10 allowed addresses
      // Which means totalVotingPower = 10 at this point.
      await initializeVoting(
        participationThresholdPct,
        supportThresholdPct,
        minDuration,
        addresses
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
      await expect(voting.vote(id, VoteOption.Yes, false)).to.be.revertedWith(
        customError('VoteCastForbidden', id, ownerAddress)
      );
    });

    // VoteOption.Yes
    it('increases the yes or no count and emit correct events', async () => {
      await advanceTimeTo(startDate);

      expect(await voting.vote(id, VoteOption.Yes, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.Yes, 1);

      let vote = await voting.getProposal(id);
      expect(vote.yes).to.equal(1);

      expect(await voting.vote(id, VoteOption.No, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.No, 1);

      vote = await voting.getProposal(id);
      expect(vote.no).to.equal(1);

      expect(await voting.vote(id, VoteOption.Abstain, false))
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, ownerAddress, VoteOption.Abstain, 1);

      vote = await voting.getProposal(id);
      expect(vote.abstain).to.equal(1);
    });

    it('should not double-count votes by the same address', async () => {
      await advanceTimeTo(startDate);

      // yes still ends up to be 1 here even after voting
      // 2 times from the same wallet.
      await voting.vote(id, VoteOption.Yes, false);
      await voting.vote(id, VoteOption.Yes, false);
      expect((await voting.getProposal(id)).yes).to.equal(1);

      // yes gets removed, no ends up as 1.
      await voting.vote(id, VoteOption.No, false);
      await voting.vote(id, VoteOption.No, false);
      expect((await voting.getProposal(id)).no).to.equal(1);

      await voting.vote(id, VoteOption.Abstain, false);
      await voting.vote(id, VoteOption.Abstain, false);
      expect((await voting.getProposal(id)).abstain).to.equal(1);
    });

    it('can execute early if participation is large enough', async () => {
      await advanceTimeTo(startDate);

      // Since voting power is set to 29%, and
      // addresslist is 10 addresses, voting yes
      // from 3 addresses should be enough to
      // make vote executable
      await voting.vote(id, VoteOption.Yes, false);
      await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);

      // // only 2 voted, not enough for 30%
      expect(await voting.canExecute(id)).to.equal(false);
      // // 3rd vote, enough.
      await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);

      expect(await voting.canExecute(id)).to.equal(true);
    });

    it('can execute normally if participation is large enough', async () => {
      await advanceTimeTo(startDate);

      // 2 supports
      await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);

      // 2 not supports
      await voting.connect(signers[2]).vote(id, VoteOption.No, false);
      await voting.connect(signers[3]).vote(id, VoteOption.No, false);

      // 2 abstain
      await voting.connect(signers[4]).vote(id, VoteOption.Abstain, false);
      await voting.connect(signers[5]).vote(id, VoteOption.Abstain, false);

      expect(await voting.canExecute(id)).to.equal(false);

      // closes the vote.

      await advanceTime(minDuration + 10);

      // 2 voted yes, 2 voted no. 2 voted abstain.
      // Enough to surpass supportedRequired percentage
      expect(await voting.canExecute(id)).to.equal(true);
    });

    it('executes the vote immediately while final yes is given', async () => {
      await advanceTimeTo(startDate);

      // 2 votes in favor of yes
      await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
      await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);

      // 3th supports(which is enough) and should execute right away.
      let tx = await voting.connect(signers[3]).vote(id, VoteOption.Yes, true);

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
      await advanceTimeTo(startDate);

      await expect(voting.execute(id)).to.be.revertedWith(
        customError('ProposalExecutionForbidden', id)
      );
    });
  });

  describe('Parameters can satisfy different use cases:', async () => {
    const id = 0; // proposalId

    describe('A simple majority vote with >50% support and >25% participation required', async () => {
      let minDuration = 500;
      let supportThresholdPct = pct16(50);
      let participationThresholdPct = pct16(25);

      beforeEach(async () => {
        const addresses = [];

        for (let i = 0; i < 10; i++) {
          const addr = await signers[i].getAddress();
          addresses.push(addr);
        }

        // voting will be initialized with 10 allowed addresses
        // Which means totalVotingPower = 10 at this point.
        await initializeVoting(
          participationThresholdPct,
          supportThresholdPct,
          minDuration,
          addresses
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
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        // dur | tot | rel
        //  0  | 10% | 100%
        //  𐄂  |  𐄂  |  ✓
        expect(await voting.canExecute(id)).to.equal(false); // participation (10%) > support threshold (50%) == false

        await advanceTime(minDuration + 10);
        // dur | tot | rel
        // 510 | 10% | 100%
        //  ✓  |  𐄂  |  ✓
        expect(await voting.canExecute(id)).to.equal(false); // participation (10%) > participation threshold (25%) == false
      });

      it('does not execute if participation is high enough but support is too low', async () => {
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.No, false);
        await voting.connect(signers[2]).vote(id, VoteOption.No, false);
        // dur | tot | rel
        //  0  | 30% | 33%
        //  x  |  o  |  x
        expect(await voting.canExecute(id)).to.equal(false); // participation (30%) > support threshold (50%) == false

        await advanceTime(minDuration + 10);
        // dur | tot | rel
        // 510 | 30% | 33%
        //  o  |  o  |  x
        expect(await voting.canExecute(id)).to.equal(false); // support (33%) > support threshold (50%) == false
      });

      it('executes after the duration if total and support thresholds are met', async () => {
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        // dur | tot | rel
        //  0  | 30% | 100%
        //  x  |  o  |  o
        expect(await voting.canExecute(id)).to.equal(false); // vote duration is not over

        await advanceTime(minDuration + 10);
        // dur | tot | rel
        // 510 | 30% | 100%
        //  o  |  o  |  o
        expect(await voting.canExecute(id)).to.equal(true); // all criteria are met
      });

      it('executes early if the participation exceeds the support threshold (assuming the latter is > 50%)', async () => {
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[3]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[4]).vote(id, VoteOption.Yes, false);
        // dur | tot | rel
        //  0  | 50% | 100%
        //  x  |  o  |  o
        expect(await voting.canExecute(id)).to.equal(false); // participation (50%) > support threshold (50%) == false

        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);
        // dur | tot | rel
        //  0  | 60% | 100%
        //  x  |  o  |  o
        expect(await voting.canExecute(id)).to.equal(true); // participation (60%) > support threshold (50%) == true

        await voting.connect(signers[6]).vote(id, VoteOption.No, false);
        await voting.connect(signers[7]).vote(id, VoteOption.No, false);
        await voting.connect(signers[8]).vote(id, VoteOption.No, false);
        await voting.connect(signers[9]).vote(id, VoteOption.No, false);
        // dur | tot | rel
        //  0  | 60% | 60%
        //  x  |  o  |  o
        expect(await voting.canExecute(id)).to.equal(true); // participation (60%) > support threshold (50%) == true
      });
    });

    describe('A special majority vote with >50% support and >75% participation required', async () => {
      let minDuration = 500;
      let supportThresholdPct = pct16(50);
      let participationThresholdPct = pct16(75);
      const id = 0; // voteId
      const startOffset = 2;
      let startDate: number;
      let endDate: number;

      beforeEach(async () => {
        startDate = (await getTime()) + startOffset;
        endDate = startDate + minDuration;
        const addresses = [];

        for (let i = 0; i < 10; i++) {
          const addr = await signers[i].getAddress();
          addresses.push(addr);
        }

        // voting will be initialized with 10 allowed addresses
        // Which means census = 10 at this point.
        await initializeVoting(
          participationThresholdPct,
          supportThresholdPct,
          minDuration,
          addresses
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
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        // dur | sup | par
        //  0  | 100%| 10%
        //  x  |  o  |  x
        expect(await voting.canExecute(id)).to.equal(false); // total support (10%) > support threshold (50%) == false

        await advanceTime(minDuration + 10);
        // dur | sup | par
        // 510 | 100%| 10%
        //  o  |  o  | x
        expect(await voting.canExecute(id)).to.equal(false); // total support (10%) > participation (75%) == false
      });

      it('does not execute if total support is high enough but support is too low', async () => {
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.No, false);
        await voting.connect(signers[2]).vote(id, VoteOption.No, false);
        // dur | sup | par
        //  0  | 33% | 30%
        //  x  |  x  |
        expect(await voting.canExecute(id)).to.equal(false); // total support (10%) > support threshold (50%) == false

        await advanceTime(minDuration + 10);
        // dur | sup | par
        // 510 | 33% | 30%
        //  o  |  x  |
        expect(await voting.canExecute(id)).to.equal(false); // support (33%) > support threshold (50%) == false
      });

      it('executes after the duration if pariticpation and support thresholds are met (but not total support)', async () => {
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[3]).vote(id, VoteOption.No, false);
        await voting.connect(signers[4]).vote(id, VoteOption.No, false);
        await voting.connect(signers[5]).vote(id, VoteOption.Abstain, false);
        await voting.connect(signers[6]).vote(id, VoteOption.Abstain, false);
        await voting.connect(signers[7]).vote(id, VoteOption.Abstain, false);
        // dur | sup | par
        //  0  | 60% | 80%
        //  x  |  o  |  o
        expect(await voting.canExecute(id)).to.equal(false); // vote duration is not over

        await advanceTime(minDuration + 10);
        // dur | sup | par
        // 510 | 60% | 80%
        //  x  |  o  |  o
        expect(await voting.canExecute(id)).to.equal(true); // all criteria are met
      });

      it('should not allow the vote to pass if the participation threshold is not reached', async () => {
        expect(await getTime()).to.be.greaterThanOrEqual(startDate);
        expect(await getTime()).to.be.lessThan(endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[3]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[4]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);

        // CHECK EARLY EXECTUION

        // dur | sup | par
        //start| 100%| 60%
        //  x  |  o  |  x

        // participation(60%) < participationThreshold(75%) ---> the vote should not execute

        expect(await getTime()).to.be.greaterThan(startDate);
        expect(await getTime()).to.be.lessThan(endDate);
        expect(await voting.canVote(id, signers[9].address)).to.equal(true); // vote is open

        expect(await voting.canExecute(id)).to.equal(false);

        // ADVANCE TO THE ENDDATE
        await advanceTimeTo(endDate);
        expect(await getTime()).to.be.greaterThanOrEqual(endDate);
        expect(await voting.canVote(id, signers[9].address)).to.equal(false); // vote is closed

        // CHECK NORMAL EXECTUION

        // dur | sup | par
        // over| 100%| 60%
        //  o  |  o  |  x

        //participation(60%) < participationThreshold(75%) ---> the vote should not execute

        expect(await voting.canExecute(id)).to.equal(false);

        // The `canExecute()` logic work as it should.
        // However, shouldn't executions not be possible because participation(60%) < participation(75%) in both cases?
      });

      it('executes early if the total support exceeds the support threshold (assuming the latter is > 50%)', async () => {
        await advanceTimeTo(startDate);
        expect(await getTime()).to.be.lessThan(endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[3]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[4]).vote(id, VoteOption.No, false);
        await voting.connect(signers[5]).vote(id, VoteOption.No, false);
        await voting.connect(signers[6]).vote(id, VoteOption.No, false);

        // dur | sup | par
        //  0  | 57% | 70%
        //  x  |  o  |  x
        expect(await voting.canExecute(id)).to.equal(false);

        await voting.connect(signers[7]).vote(id, VoteOption.No, false);
        // dur | sup | par
        //  0  | 50% | 80%
        //  x  |  x  |  o
        expect(await voting.canExecute(id)).to.equal(false); // participation is met but not support

        // let signer[7] switch vote from no to yes // TODO ADAPT TEST IF VOTE REPLACEMENT AND EARLY EXECUTION ARE MADE MUTUALLY EXCLUSIVE
        await voting.connect(signers[7]).vote(id, VoteOption.Yes, false);
        // dur | sup | par
        //  0  | 63% | 80%
        //  o  |  x  |  o
        expect(await voting.canExecute(id)).to.equal(false); // Still not sufficient for early execution because the support could still be <= 50 if the two remaining voters vote no

        await voting.connect(signers[8]).vote(id, VoteOption.Abstain, false);
        // dur | sup | par
        //  0  | 63% | 90%
        //  x  |  o  |  o
        expect(await voting.canExecute(id)).to.equal(true); // The vote` outcome cannot change anymore (5 yes, 3 no, 1 abstain)

        expect(await getTime()).to.be.lessThan(endDate);
        await advanceTimeTo(endDate);

        // this doesn't change after the vote is over

        // dur | sup | par
        //  0  | 63% | 90%
        //  o  |  o  |  o
        expect(await voting.canExecute(id)).to.equal(true);
      });
    });
  });
});
