import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  AddresslistVoting,
  Addresslist__factory,
  DAO,
  IERC165Upgradeable__factory,
  IMajorityVoting__factory,
  IMembership__factory,
  IPlugin__factory,
  IProposal__factory,
} from '../../../../../typechain';
import {
  findEvent,
  DAO_EVENTS,
  VOTING_EVENTS,
  PROPOSAL_EVENTS,
  MEMBERSHIP_EVENTS,
} from '../../../../../utils/event';
import {getMergedABI} from '../../../../../utils/abi';
import {
  VoteOption,
  pctToRatio,
  getTime,
  advanceIntoVoteTime,
  advanceAfterVoteEnd,
  VotingSettings,
  VotingMode,
  ONE_HOUR,
  MAX_UINT64,
  voteWithSigners,
  toBytes32,
} from '../../../../test-utils/voting';
import {deployNewDAO} from '../../../../test-utils/dao';
import {OZ_ERRORS} from '../../../../test-utils/error';
import {shouldUpgradeCorrectly} from '../../../../test-utils/uups-upgradeable';
import {UPGRADE_PERMISSIONS} from '../../../../test-utils/permissions';
import {deployWithProxy} from '../../../../test-utils/proxy';
import {getInterfaceID} from '../../../../test-utils/interfaces';
import {majorityVotingBaseInterface} from '../majority-voting';
import {ExecutedEvent} from '../../../../../typechain/DAO';
import {
  ProposalCreatedEvent,
  ProposalExecutedEvent,
} from '../../../../../typechain/AddresslistVoting';

export const addresslistVotingInterface = new ethers.utils.Interface([
  'function initialize(address,tuple(uint8,uint32,uint32,uint64,uint256),address[])',
  'function addAddresses(address[])',
  'function removeAddresses(address[])',
]);

describe('AddresslistVoting', function () {
  let signers: SignerWithAddress[];
  let voting: AddresslistVoting;
  let dao: DAO;
  let dummyActions: any;
  let dummyMetadata: string;
  let startDate: number;
  let endDate: number;
  let votingSettings: VotingSettings;

  const startOffset = 10;
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

    dao = await deployNewDAO(signers[0].address);
  });

  beforeEach(async function () {
    votingSettings = {
      votingMode: VotingMode.EarlyExecution,
      supportThreshold: pctToRatio(50),
      minParticipation: pctToRatio(20),
      minDuration: ONE_HOUR,
      minProposerVotingPower: 0,
    };

    const AddresslistVotingFactory = new ethers.ContractFactory(
      mergedAbi,
      addresslistVotingFactoryBytecode,
      signers[0]
    );

    voting = await deployWithProxy(AddresslistVotingFactory);

    startDate = (await getTime()) + startOffset;
    endDate = startDate + votingSettings.minDuration;

    await dao.grant(
      dao.address,
      voting.address,
      ethers.utils.id('EXECUTE_PERMISSION')
    );
    await dao.grant(
      voting.address,
      signers[0].address,
      ethers.utils.id('UPDATE_ADDRESSES_PERMISSION')
    );

    this.upgrade = {
      contract: voting,
      dao: dao,
      user: signers[8],
    };
  });

  describe('Upgrade', () => {
    beforeEach(async function () {
      this.upgrade = {
        contract: voting,
        dao: dao,
        user: signers[8],
      };
      await voting.initialize(dao.address, votingSettings, []);
    });

    shouldUpgradeCorrectly(
      UPGRADE_PERMISSIONS.UPGRADE_PLUGIN_PERMISSION_ID,
      'DaoUnauthorized'
    );
  });

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await voting.initialize(dao.address, votingSettings, []);

      await expect(
        voting.initialize(dao.address, votingSettings, [])
      ).to.be.revertedWith(OZ_ERRORS.ALREADY_INITIALIZED);
    });
  });

  describe('plugin interface: ', async () => {
    it('does not support the empty interface', async () => {
      expect(await voting.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165Upgradeable` interface', async () => {
      const iface = IERC165Upgradeable__factory.createInterface();
      expect(await voting.supportsInterface(getInterfaceID(iface))).to.be.true;
    });

    it('supports the `IPlugin` interface', async () => {
      const iface = IPlugin__factory.createInterface();
      expect(await voting.supportsInterface(getInterfaceID(iface))).to.be.true;
    });

    it('supports the `IProposal` interface', async () => {
      const iface = IProposal__factory.createInterface();
      expect(await voting.supportsInterface(getInterfaceID(iface))).to.be.true;
    });

    it('supports the `IMembership` interface', async () => {
      const iface = IMembership__factory.createInterface();
      expect(await voting.supportsInterface(getInterfaceID(iface))).to.be.true;
    });

    it('supports the `Addresslist` interface', async () => {
      const iface = Addresslist__factory.createInterface();
      expect(await voting.supportsInterface(getInterfaceID(iface))).to.be.true;
    });

    it('supports the `IMajorityVoting` interface', async () => {
      const iface = IMajorityVoting__factory.createInterface();
      expect(await voting.supportsInterface(getInterfaceID(iface))).to.be.true;
    });

    it('supports the `MajorityVotingBase` interface', async () => {
      expect(
        await voting.supportsInterface(
          getInterfaceID(majorityVotingBaseInterface)
        )
      ).to.be.true;
    });

    it('supports the `AddresslistVoting` interface', async () => {
      expect(
        await voting.supportsInterface(
          getInterfaceID(addresslistVotingInterface)
        )
      ).to.be.true;
    });
  });

  describe('isMember', async () => {
    beforeEach(async () => {
      await voting.initialize(dao.address, votingSettings, []);
    });

    it('should return false, if user is not listed', async () => {
      expect(await voting.isMember(signers[0].address)).to.be.false;
    });

    it('should return true if user is in the latest list', async () => {
      await voting.addAddresses([signers[0].address]);
      expect(await voting.isMember(signers[0].address)).to.be.true;
    });
  });

  describe('Addresslisting members: ', async () => {
    beforeEach(async () => {
      await voting.initialize(dao.address, votingSettings, []);
    });

    it('should return false, if user is not listed', async () => {
      const block1 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(await voting.isListedAtBlock(signers[0].address, block1.number)).to
        .be.false;
    });

    it('should add new users in the address list and emit the `MembersAdded` event', async () => {
      const addresses = [signers[0].address, signers[1].address];
      await expect(voting.addAddresses(addresses))
        .to.emit(voting, MEMBERSHIP_EVENTS.MEMBERS_ADDED)
        .withArgs(addresses);

      const block = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);

      expect(await voting.isListedAtBlock(signers[0].address, block.number)).to
        .be.true;
      expect(await voting.isListed(signers[0].address)).to.be.true;
      expect(await voting.isListed(signers[1].address)).to.be.true;
    });

    it('should remove users from the address list and emit the `MembersRemoved` event', async () => {
      await voting.addAddresses([signers[0].address]);

      const block1 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(await voting.isListedAtBlock(signers[0].address, block1.number)).to
        .be.true;
      expect(await voting.isListed(signers[0].address)).to.be.true;

      await expect(voting.removeAddresses([signers[0].address]))
        .to.emit(voting, MEMBERSHIP_EVENTS.MEMBERS_REMOVED)
        .withArgs([signers[0].address]);

      const block2 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(await voting.isListedAtBlock(signers[0].address, block2.number)).to
        .be.false;
      expect(await voting.isListed(signers[0].address)).to.be.false;
    });
  });

  describe('Proposal creation', async () => {
    it('reverts if the user is not allowed to create a proposal', async () => {
      votingSettings.minProposerVotingPower = 1;

      await voting.initialize(
        dao.address,
        votingSettings,
        [signers[0].address] // signers[0] is listed
      );

      await expect(
        voting
          .connect(signers[1])
          .createProposal(dummyMetadata, [], 0, 0, 0, VoteOption.None, false)
      )
        .to.be.revertedWithCustomError(voting, 'ProposalCreationForbidden')
        .withArgs(signers[1].address);

      await expect(
        voting
          .connect(signers[0])
          .createProposal(dummyMetadata, [], 0, 0, 0, VoteOption.None, false)
      ).not.to.be.reverted;
    });

    it('reverts if the user is not allowed to create a proposal and minProposerPower > 1 is selected', async () => {
      votingSettings.minProposerVotingPower = 123;

      await voting.initialize(
        dao.address,
        votingSettings,
        [signers[0].address] // signers[0] is listed
      );

      await expect(
        voting
          .connect(signers[1])
          .createProposal(dummyMetadata, [], 0, 0, 0, VoteOption.None, false)
      )
        .to.be.revertedWithCustomError(voting, 'ProposalCreationForbidden')
        .withArgs(signers[1].address);

      await expect(
        voting
          .connect(signers[0])
          .createProposal(dummyMetadata, [], 0, 0, 0, VoteOption.None, false)
      ).not.to.be.reverted;
    });

    it('reverts if the start date is set smaller than the current date', async () => {
      await voting.initialize(dao.address, votingSettings, [
        signers[0].address,
      ]);

      const currentDate = await getTime();
      const startDateInThePast = currentDate - 1;
      const endDate = 0; // startDate + minDuration

      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          0,
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

    it('reverts if the start date is after the latest start date', async () => {
      await voting.initialize(dao.address, votingSettings, [
        signers[0].address,
      ]);

      const latestStartDate = MAX_UINT64.sub(votingSettings.minDuration);
      const tooLateStartDate = latestStartDate.add(1);
      const endDate = 0; // startDate + minDuration

      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          0,
          tooLateStartDate,
          endDate,
          VoteOption.None,
          false
        )
      ).to.be.revertedWithPanic(0x11);
    });

    it('reverts if the end date is before the earliest end date so that min duration cannot be met', async () => {
      await voting.initialize(dao.address, votingSettings, [
        signers[0].address,
      ]);

      const startDate = (await getTime()) + 1;
      const earliestEndDate = startDate + votingSettings.minDuration;
      const tooEarlyEndDate = earliestEndDate - 1;

      await expect(
        voting.createProposal(
          dummyMetadata,
          [],
          0,
          startDate,
          tooEarlyEndDate,
          VoteOption.None,
          false
        )
      )
        .to.be.revertedWithCustomError(voting, 'DateOutOfBounds')
        .withArgs(earliestEndDate, tooEarlyEndDate);
    });

    it('ceils the `minVotingPower` value if it has a remainder', async () => {
      votingSettings.minParticipation = pctToRatio(30).add(1); // 30.0001 %

      await voting.initialize(
        dao.address,
        votingSettings,
        signers.slice(0, 10).map(s => s.address)
      );

      expect(
        (
          await voting.createProposal(
            dummyMetadata,
            dummyActions,
            0,
            startDate,
            endDate,
            VoteOption.None,
            false
          )
        ).value
      ).to.equal(id);

      expect((await voting.getProposal(id)).parameters.minVotingPower).to.eq(4); // 4 out of 10 votes must be casted for the proposal to pass
    });

    it('does not ceil the `minVotingPower` value if it has no remainder', async () => {
      votingSettings.minParticipation = pctToRatio(30); // 30.0000 %

      await voting.initialize(
        dao.address,
        votingSettings,
        signers.slice(0, 10).map(s => s.address)
      );

      expect(
        (
          await voting.createProposal(
            dummyMetadata,
            dummyActions,
            0,
            startDate,
            endDate,
            VoteOption.None,
            false
          )
        ).value
      ).to.equal(id);

      expect((await voting.getProposal(id)).parameters.minVotingPower).to.eq(3); // 3 out of 10 votes must be casted for the proposal to pass
    });

    it('should create a proposal successfully, but not vote', async () => {
      await voting.initialize(
        dao.address,
        votingSettings,
        signers.slice(0, 10).map(s => s.address)
      );

      const allowFailureMap = 1;

      let tx = await voting.createProposal(
        dummyMetadata,
        dummyActions,
        allowFailureMap,
        0,
        0,
        VoteOption.None,
        false
      );

      await expect(tx)
        .to.emit(voting, PROPOSAL_EVENTS.PROPOSAL_CREATED)
        .to.not.emit(voting, VOTING_EVENTS.VOTE_CAST);

      const event = await findEvent<ProposalCreatedEvent>(
        tx,
        PROPOSAL_EVENTS.PROPOSAL_CREATED
      );
      expect(event.args.proposalId).to.equal(id);
      expect(event.args.creator).to.equal(signers[0].address);
      expect(event.args.metadata).to.equal(dummyMetadata);
      expect(event.args.actions.length).to.equal(1);
      expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
      expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
      expect(event.args.actions[0].data).to.equal(dummyActions[0].data);
      expect(event.args.allowFailureMap).to.equal(allowFailureMap);

      const block = await ethers.provider.getBlock('latest');

      const proposal = await voting.getProposal(id);
      expect(proposal.open).to.be.true;
      expect(proposal.executed).to.be.false;
      expect(proposal.allowFailureMap).to.equal(allowFailureMap);
      expect(proposal.parameters.snapshotBlock).to.equal(block.number - 1);
      expect(proposal.parameters.supportThreshold).to.equal(
        votingSettings.supportThreshold
      );
      expect(proposal.parameters.minVotingPower).to.equal(
        (await voting.totalVotingPower(proposal.parameters.snapshotBlock))
          .mul(votingSettings.minParticipation)
          .div(pctToRatio(100))
      );
      expect(
        proposal.parameters.startDate.add(votingSettings.minDuration)
      ).to.equal(proposal.parameters.endDate);

      expect(proposal.tally.yes).to.equal(0);
      expect(proposal.tally.no).to.equal(0);

      expect(
        await voting.totalVotingPower(proposal.parameters.snapshotBlock)
      ).to.equal(10);
      expect(await voting.canVote(id, signers[0].address, VoteOption.Yes)).to.be
        .true;
      expect(await voting.canVote(id, signers[10].address, VoteOption.Yes)).to
        .be.false;
      expect(await voting.canVote(1, signers[0].address, VoteOption.Yes)).to.be
        .false;

      expect(proposal.actions.length).to.equal(1);
      expect(proposal.actions[0].to).to.equal(dummyActions[0].to);
      expect(proposal.actions[0].value).to.equal(dummyActions[0].value);
      expect(proposal.actions[0].data).to.equal(dummyActions[0].data);
    });

    it('should create a proposal and cast a vote immediately', async () => {
      await voting.initialize(
        dao.address,
        votingSettings,
        signers.slice(0, 10).map(s => s.address)
      );

      let tx = await voting.createProposal(
        dummyMetadata,
        dummyActions,
        0,
        0,
        0,
        VoteOption.Yes,
        false
      );

      await expect(tx)
        .to.emit(voting, PROPOSAL_EVENTS.PROPOSAL_CREATED)
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, signers[0].address, VoteOption.Yes, 1);

      const event = await findEvent<ProposalCreatedEvent>(
        tx,
        PROPOSAL_EVENTS.PROPOSAL_CREATED
      );
      expect(event.args.proposalId).to.equal(id);
      expect(event.args.creator).to.equal(signers[0].address);
      expect(event.args.metadata).to.equal(dummyMetadata);
      expect(event.args.actions.length).to.equal(1);
      expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
      expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
      expect(event.args.actions[0].data).to.equal(dummyActions[0].data);
      expect(event.args.allowFailureMap).to.equal(0);

      const block = await ethers.provider.getBlock('latest');
      const proposal = await voting.getProposal(id);
      expect(proposal.open).to.be.true;
      expect(proposal.executed).to.be.false;
      expect(proposal.allowFailureMap).to.equal(0);
      expect(proposal.parameters.snapshotBlock).to.equal(block.number - 1);
      expect(proposal.parameters.supportThreshold).to.equal(
        votingSettings.supportThreshold
      );
      expect(proposal.parameters.minVotingPower).to.equal(
        (await voting.totalVotingPower(proposal.parameters.snapshotBlock))
          .mul(votingSettings.minParticipation)
          .div(pctToRatio(100))
      );

      expect(
        await voting.totalVotingPower(proposal.parameters.snapshotBlock)
      ).to.equal(10);
      expect(proposal.tally.yes).to.equal(1);
      expect(proposal.tally.no).to.equal(0);
      expect(proposal.tally.abstain).to.equal(0);
    });

    it('reverts creation if the creator tries to vote before the start date', async () => {
      await voting.initialize(dao.address, votingSettings, [
        signers[0].address,
      ]);

      expect(await getTime()).to.be.lessThan(startDate);

      // Reverts if the vote option is not 'None'
      await expect(
        voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
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
            0,
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
    context('Standard Mode', async () => {
      beforeEach(async () => {
        votingSettings.votingMode = VotingMode.Standard;

        await voting.initialize(
          dao.address,
          votingSettings,
          signers.slice(0, 10).map(s => s.address)
        );

        expect(
          (
            await voting.createProposal(
              dummyMetadata,
              dummyActions,
              0,
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

        // Check that voting is possible but don't vote using `callStatic`
        await expect(voting.callStatic.vote(id, VoteOption.Yes, false)).not.to
          .be.reverted;

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
          yes: [0, 1, 2, 3, 4, 5], // 6 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('can execute normally if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 3 votes
          no: [3, 4], // 2 votes
          abstain: [5, 6], // 2 votes
        });

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;

        expect(await voting.canExecute(id)).to.be.true;
      });

      it('does not execute early when voting with the `tryEarlyExecution` option', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4], // 5 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.canExecute(id)).to.be.false;

        expect((await voting.getProposal(id)).executed).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        // `tryEarlyExecution` is turned on but the vote is not decided yet
        await voting.connect(signers[5]).vote(id, VoteOption.Yes, true);
        expect((await voting.getProposal(id)).executed).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        // `tryEarlyExecution` is turned off and the vote is decided
        await voting.connect(signers[6]).vote(id, VoteOption.Yes, false);
        expect((await voting.getProposal(id)).executed).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        // `tryEarlyExecution` is turned on and the vote is decided
        await voting.connect(signers[7]).vote(id, VoteOption.Yes, true);
        expect((await voting.getProposal(id)).executed).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('reverts if vote is not decided yet', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await expect(voting.execute(id))
          .to.be.revertedWithCustomError(voting, 'ProposalExecutionForbidden')
          .withArgs(id);
      });
    });

    context('Early Execution Mode', async () => {
      beforeEach(async () => {
        votingSettings.votingMode = VotingMode.EarlyExecution;

        await voting.initialize(
          dao.address,
          votingSettings,
          signers.slice(0, 10).map(s => s.address)
        );

        expect(
          (
            await voting.createProposal(
              dummyMetadata,
              dummyActions,
              0,
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

        expect(await voting.canVote(id, signers[0].address, VoteOption.Yes)).to
          .be.false;

        await expect(voting.vote(id, VoteOption.Yes, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.Yes);
      });

      it('increases the yes, no, and abstain count and emits correct events', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await expect(voting.connect(signers[0]).vote(id, VoteOption.Yes, false))
          .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
          .withArgs(id, signers[0].address, VoteOption.Yes, 1);

        let proposal = await voting.getProposal(id);
        expect(proposal.tally.yes).to.equal(1);
        expect(proposal.tally.no).to.equal(0);
        expect(proposal.tally.abstain).to.equal(0);

        await expect(voting.connect(signers[1]).vote(id, VoteOption.No, false))
          .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
          .withArgs(id, signers[1].address, VoteOption.No, 1);

        proposal = await voting.getProposal(id);
        expect(proposal.tally.yes).to.equal(1);
        expect(proposal.tally.no).to.equal(1);
        expect(proposal.tally.abstain).to.equal(0);

        await expect(
          voting.connect(signers[2]).vote(id, VoteOption.Abstain, false)
        )
          .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
          .withArgs(id, signers[2].address, VoteOption.Abstain, 1);

        proposal = await voting.getProposal(id);
        expect(proposal.tally.yes).to.equal(1);
        expect(proposal.tally.no).to.equal(1);
        expect(proposal.tally.abstain).to.equal(1);
      });

      it('reverts on voting None', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        // Check that voting is possible but don't vote using `callStatic`
        await expect(voting.callStatic.vote(id, VoteOption.Yes, false)).not.to
          .be.reverted;

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
          yes: [0, 1, 2, 3, 4, 5], // 6 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;
      });

      it('can execute normally if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 3 votes
          no: [3, 4], // 2 votes
          abstain: [5, 6], // 2 votes
        });

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.isMinParticipationReached(id)).to.be.true;

        expect(await voting.canExecute(id)).to.be.false;

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;

        expect(await voting.canExecute(id)).to.be.true;
      });

      it('executes the vote immediately when the vote is decided early and the `tryEarlyExecution` option is selected', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3], // 4 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        // `tryEarlyExecution` is turned on but the vote is not decided yet
        await voting.connect(signers[4]).vote(id, VoteOption.Yes, true);
        expect((await voting.getProposal(id)).executed).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        // `tryEarlyExecution` is turned off and the vote is decided
        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);
        expect((await voting.getProposal(id)).executed).to.be.false;
        expect(await voting.canExecute(id)).to.be.true;

        // `tryEarlyExecution` is turned on and the vote is decided
        let tx = await voting
          .connect(signers[6])
          .vote(id, VoteOption.Abstain, true);
        {
          const event = await findEvent<ExecutedEvent>(tx, DAO_EVENTS.EXECUTED);

          expect(event.args.actor).to.equal(voting.address);
          expect(event.args.callId).to.equal(toBytes32(id));
          expect(event.args.actions.length).to.equal(1);
          expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
          expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
          expect(event.args.actions[0].data).to.equal(dummyActions[0].data);
          expect(event.args.execResults).to.deep.equal(['0x']);

          expect((await voting.getProposal(id)).executed).to.be.true;
        }

        // check for the `ProposalExecuted` event in the voting contract
        {
          const event = await findEvent<ProposalExecutedEvent>(
            tx,
            PROPOSAL_EVENTS.PROPOSAL_EXECUTED
          );
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

    context('Vote Replacement Mode', async () => {
      beforeEach(async () => {
        votingSettings.votingMode = VotingMode.VoteReplacement;

        await voting.initialize(
          dao.address,
          votingSettings,
          signers.slice(0, 10).map(s => s.address)
        );

        expect(
          (
            await voting.createProposal(
              dummyMetadata,
              dummyActions,
              0,
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

        // Check that voting is possible but don't vote using `callStatic`
        await expect(voting.callStatic.vote(id, VoteOption.Yes, false)).not.to
          .be.reverted;

        await expect(voting.vote(id, VoteOption.None, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.None);
      });

      it('should allow vote replacement but not double-count votes by the same address', async () => {
        await advanceIntoVoteTime(startDate, endDate);

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

        await expect(voting.vote(id, VoteOption.None, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.None);
      });

      it('cannot early execute', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4, 5], // 6 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('can execute normally if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 3 votes
          no: [3, 4], // 2 votes
          abstain: [5, 6], // 2 votes
        });

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;

        expect(await voting.canExecute(id)).to.be.true;
      });

      it('does not execute early when voting with the `tryEarlyExecution` option', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4], // 5 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.canExecute(id)).to.be.false;

        // `tryEarlyExecution` is turned on but the vote is not decided yet
        await voting.connect(signers[4]).vote(id, VoteOption.Yes, true);
        expect((await voting.getProposal(id)).executed).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        // `tryEarlyExecution` is turned off and the vote is decided
        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);
        expect((await voting.getProposal(id)).executed).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        // `tryEarlyExecution` is turned on and the vote is decided
        await voting.connect(signers[5]).vote(id, VoteOption.Yes, true);
        expect((await voting.getProposal(id)).executed).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;
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
        votingSettings.minParticipation = pctToRatio(25);

        await voting.initialize(
          dao.address,
          votingSettings,
          signers.slice(0, 10).map(s => s.address)
        );

        await voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          0,
          0,
          VoteOption.None,
          false
        );
      });

      it('does not execute if support is high enough but participation is too low', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('does not execute `if participation is high enough but support is t`oo low', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0], // 1 votes
          no: [1, 2], // 2 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('executes after the duration if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 3 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true; // all criteria are met
      });

      it('executes early if participation and support are met and the vote outcome cannot change anymore', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4], // 4 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;

        await voteWithSigners(voting, id, signers, {
          yes: [],
          no: [6, 7, 8, 9], // 4 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;
      });
    });

    describe('A special majority vote with >50% support and >=75% participation required and early execution enabled', async () => {
      beforeEach(async () => {
        votingSettings.minParticipation = pctToRatio(75);

        await voting.initialize(
          dao.address,
          votingSettings,
          signers.slice(0, 10).map(s => s.address)
        );
        expect(
          (
            await voting.createProposal(
              dummyMetadata,
              dummyActions,
              0,
              startDate,
              endDate,
              VoteOption.None,
              false
            )
          ).value
        ).to.equal(id);
      });

      it('does not execute if support is high enough but participation is too low', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('does not execute if participation is high enough but support is too low', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0], // 1 votes
          no: [1, 2, 3, 4, 5, 6, 7], // 7 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('executes after the duration if participation and support thresholds are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 3 votes
          no: [3, 4], // 2 votes
          abstain: [5, 6, 7], // 3 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;
      });

      it('should not allow the vote to pass if the minimum participation is not reached', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4, 5], // 6 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('executes early if the participation exceeds the support threshold (assuming the latter is > 50%)', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3], // 4 votes
          no: [4, 5, 6], // 3 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await voting.connect(signers[7]).vote(id, VoteOption.Yes, false);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false; // participation is met but not support

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false; // Still not sufficient for early execution because the support could still be <= 50 if the two remaining voters vote no

        await voting.connect(signers[8]).vote(id, VoteOption.Abstain, false);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true; // The vote` outcome cannot change anymore (5 yes, 3 no, 1 abstain)

        await advanceAfterVoteEnd(endDate);

        // this doesn't change after the vote is over
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;
      });
    });

    describe('An edge case with `supportThreshold = 0` and `minParticipation = 0` in early execution mode activated', async () => {
      beforeEach(async () => {
        votingSettings.supportThreshold = pctToRatio(0);
        votingSettings.minParticipation = pctToRatio(0);

        await voting.initialize(
          dao.address,
          votingSettings,
          signers.slice(0, 10).map(s => s.address)
        );

        await voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          0,
          0,
          VoteOption.None,
          false
        );
      });

      it('does not execute with 0 votes', async () => {
        // does not execute early
        advanceIntoVoteTime(startDate, endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        // does not execute normally
        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('executes if participation and support are met', async () => {
        // Check if the proposal can execute early
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;

        // Check if the proposal can execute normally
        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;
      });
    });

    describe('An edge case with `supportThreshold = 99.9999%` and `minParticipation = 100%` in early execution mode', async () => {
      beforeEach(async () => {
        votingSettings.supportThreshold = pctToRatio(100).sub(1);
        votingSettings.minParticipation = pctToRatio(100); //

        await voting.initialize(
          dao.address,
          votingSettings,
          signers.slice(0, 10).map(s => s.address)
        );

        await voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          0,
          0,
          VoteOption.None,
          false
        );
      });

      it('does not execute with 9 votes', async () => {
        // does not execute early
        advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4, 5, 6, 7, 8], // 9 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        // does not execute normally
        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('executes if participation and support are met', async () => {
        // Check if the proposal can execute early
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // 10 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;

        // Check if the proposal can execute normally
        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;
      });
    });
  });
});
