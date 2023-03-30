import {expect} from 'chai';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  DAO,
  GovernanceERC20Mock,
  GovernanceERC20Mock__factory,
  IERC165Upgradeable__factory,
  IMajorityVoting__factory,
  IMembership__factory,
  IPlugin__factory,
  IProposal__factory,
  TokenVoting,
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
  RATIO_BASE,
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
import {
  ProposalCreatedEvent,
  ProposalExecutedEvent,
} from '../../../../../typechain/TokenVoting';
import {ExecutedEvent} from '../../../../../typechain/DAO';

export const tokenVotingInterface = new ethers.utils.Interface([
  'function initialize(address,tuple(uint8,uint32,uint32,uint64,uint256),address)',
  'function getVotingToken()',
]);

describe('TokenVoting', function () {
  let signers: SignerWithAddress[];
  let voting: TokenVoting;
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

    voting = await deployWithProxy(TokenVotingFactory);

    startDate = (await getTime()) + startOffset;
    endDate = startDate + votingSettings.minDuration;

    dao.grant(
      dao.address,
      voting.address,
      ethers.utils.id('EXECUTE_PERMISSION')
    );
  });

  describe('Upgrade', () => {
    beforeEach(async function () {
      this.upgrade = {
        contract: voting,
        dao: dao,
        user: signers[8],
      };
      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );
    });

    shouldUpgradeCorrectly(
      UPGRADE_PERMISSIONS.UPGRADE_PLUGIN_PERMISSION_ID,
      'DaoUnauthorized'
    );
  });

  async function setBalances(
    balances: {receiver: string; amount: number | BigNumber}[]
  ) {
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

    it('emits the `MembershipContractAnnounced` event', async () => {
      await expect(
        await voting.initialize(
          dao.address,
          votingSettings,
          governanceErc20Mock.address
        )
      )
        .to.emit(voting, MEMBERSHIP_EVENTS.MEMBERSHIP_CONTRACT_ANNOUNCED)
        .withArgs(governanceErc20Mock.address);
    });

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

    it('supports the `TokenVoting` interface', async () => {
      expect(
        await voting.supportsInterface(getInterfaceID(tokenVotingInterface))
      ).to.be.true;
    });
  });

  describe('isMember: ', async () => {
    it('returns true if the account currently owns at least one token', async () => {
      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );

      await setBalances([
        {receiver: signers[0].address, amount: 1},
        {receiver: signers[1].address, amount: 0},
      ]);

      expect(await voting.isMember(signers[0].address)).to.be.true;
      expect(await voting.isMember(signers[1].address)).to.be.false;
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
            0,
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
          0,
          startDate,
          endDate,
          VoteOption.None,
          false
        )
      ).not.to.be.reverted;
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
            0,
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
            0,
            startDate,
            endDate,
            VoteOption.None,
            false
          )
      ).not.to.be.reverted;
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
        voting.createProposal(
          dummyMetadata,
          [],
          0,
          0,
          0,
          VoteOption.None,
          false
        )
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
          0,
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

      await setBalances([{receiver: signers[0].address, amount: 10}]);

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

      await setBalances([{receiver: signers[0].address, amount: 10}]); // 10 votes * 30% = 3 votes

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

    it('should create a vote successfully, but not vote', async () => {
      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );

      const allowFailureMap = 1;

      await setBalances([{receiver: signers[0].address, amount: 10}]);

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

      expect(proposal.open).to.equal(true);
      expect(proposal.executed).to.equal(false);
      expect(proposal.allowFailureMap).to.equal(allowFailureMap);
      expect(proposal.parameters.supportThreshold).to.equal(
        votingSettings.supportThreshold
      );

      expect(proposal.parameters.minVotingPower).to.equal(
        (await voting.totalVotingPower(proposal.parameters.snapshotBlock))
          .mul(votingSettings.minParticipation)
          .div(pctToRatio(100))
      );
      expect(proposal.parameters.snapshotBlock).to.equal(block.number - 1);
      expect(
        proposal.parameters.startDate.add(votingSettings.minDuration)
      ).to.equal(proposal.parameters.endDate);

      expect(
        await voting.totalVotingPower(proposal.parameters.snapshotBlock)
      ).to.equal(10);
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

      await setBalances([{receiver: signers[0].address, amount: 10}]);

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
        .withArgs(id, signers[0].address, VoteOption.Yes, 10);

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
      expect(proposal.open).to.equal(true);
      expect(proposal.executed).to.equal(false);
      expect(proposal.allowFailureMap).to.equal(0);
      expect(proposal.parameters.supportThreshold).to.equal(
        votingSettings.supportThreshold
      );
      expect(proposal.parameters.minVotingPower).to.equal(
        (await voting.totalVotingPower(proposal.parameters.snapshotBlock))
          .mul(votingSettings.minParticipation)
          .div(pctToRatio(100))
      );
      expect(proposal.parameters.snapshotBlock).to.equal(block.number - 1);

      expect(
        await voting.totalVotingPower(proposal.parameters.snapshotBlock)
      ).to.equal(10);
      expect(proposal.tally.yes).to.equal(10);
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
          yes: [0, 1, 2, 3, 4, 5], // 60 votes
          no: [],
          abstain: [],
        });

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('can execute normally if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 30 votes
          no: [3, 4], // 20 votes
          abstain: [5, 6], // 20 votes
        });

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;

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
          yes: [0, 1, 2, 3, 4], // 50 votes
          no: [],
          abstain: [],
        });

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.equal(false);

        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.equal(true);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
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
          const event = await findEvent<ExecutedEvent>(tx, DAO_EVENTS.EXECUTED);

          expect(event.args.actor).to.equal(voting.address);
          expect(event.args.callId).to.equal(toBytes32(id));
          expect(event.args.actions.length).to.equal(1);
          expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
          expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
          expect(event.args.actions[0].data).to.equal(dummyActions[0].data);
          expect(event.args.execResults).to.deep.equal(['0x']);

          expect((await voting.getProposal(id)).executed).to.equal(true);
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

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('can execute normally if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 30 votes
          no: [3, 4], // 20 votes
          abstain: [5, 6], // 20 votes
        });

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;

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
        votingSettings.minParticipation = pctToRatio(25);

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
          0,
          VoteOption.None,
          false
        );
      });

      it('does not execute if support is high enough but participation is too low', async () => {
        advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;

        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('does not execute if participation is high enough but support is too low', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0], // 10 votes
          no: [1, 2], //  20 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.false;
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('executes after the duration if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 30 votes
          no: [], //  0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.equal(false);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.equal(true);
      });

      it('executes early if participation and support are met and the vote outcome cannot change anymore', async () => {
        const promises = [0, 1, 2, 3, 4].map(i =>
          voting.connect(signers[i]).vote(id, VoteOption.Yes, false)
        );
        await Promise.all(promises);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.equal(false);

        await voting.connect(signers[5]).vote(id, VoteOption.Yes, false);
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.equal(true);

        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.equal(true);
      });
    });

    describe('An edge case with `supportThreshold = 0%`, `minParticipation = 0%`, in early execution mode', async () => {
      beforeEach(async () => {
        votingSettings.supportThreshold = pctToRatio(0);
        votingSettings.minParticipation = pctToRatio(0);
        votingSettings.votingMode = VotingMode.EarlyExecution;

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
        expect(await voting.canExecute(id)).to.equal(false);

        // does not execute normally
        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.false;
        expect(await voting.canExecute(id)).to.equal(false);
      });

      it('executes if participation and support are met', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        // Check if the proposal can execute early
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.equal(true);

        // Check if the proposal can execute normally
        await advanceAfterVoteEnd(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.equal(true);
      });
    });
  });

  describe('An edge case with `supportThreshold = 99.9999%` and `minParticipation = 100%` in early execution mode', async () => {
    beforeEach(async () => {
      votingSettings.supportThreshold = pctToRatio(100).sub(1);
      votingSettings.minParticipation = pctToRatio(100);
      votingSettings.votingMode = VotingMode.EarlyExecution;

      await voting.initialize(
        dao.address,
        votingSettings,
        governanceErc20Mock.address
      );
    });

    context('token balances are in the magnitude of 10^18', async () => {
      beforeEach(async () => {
        const totalSupply = ethers.BigNumber.from(10).pow(18);
        const delta = totalSupply.div(RATIO_BASE);
        await setBalances([
          {
            receiver: signers[0].address,
            amount: totalSupply.sub(delta), // 99.9999% of the total supply
          },
          {receiver: signers[1].address, amount: 1}, // 1 vote (10^-16 % = 0.0000000000000001%)
          {receiver: signers[2].address, amount: delta.sub(1)}, // 1 vote less than 0.0001% of the total supply (99.9999% - 10^-16% = 0.00009999999999999%)
        ]);

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

      it('early support criterium is sharp by 1 vote', async () => {
        advanceIntoVoteTime(startDate, endDate);

        // 99.9999% of the voting power voted for yes
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;

        // 1 vote is still missing to meet >99.9999% worst case support
        const proposal = await voting.getProposal(id);
        const tally = proposal.tally;
        const totalVotingPower = await voting.totalVotingPower(
          proposal.parameters.snapshotBlock
        );
        expect(
          totalVotingPower.sub(tally.yes).sub(tally.abstain) // this is the number of worst case no votes
        ).to.eq(totalVotingPower.div(RATIO_BASE));

        // vote with 1 more yes vote
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;

        // voting with the remaining votes does not change this
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
      });

      it('participation criterium is sharp by 1 vote', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[2]).vote(id, VoteOption.Yes, false);

        // 1 vote is still missing to meet particpiation = 100%
        const proposal = await voting.getProposal(id);
        const tally = proposal.tally;
        const totalVotingPower = await voting.totalVotingPower(
          proposal.parameters.snapshotBlock
        );
        expect(
          totalVotingPower.sub(tally.yes).sub(tally.no).sub(tally.abstain)
        ).to.eq(1);
        expect(await voting.isMinParticipationReached(id)).to.be.false;

        // cast the last vote so that participation = 100%
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        expect(await voting.isMinParticipationReached(id)).to.be.true;
      });
    });

    context('tokens balances are in the magnitude of 10^6', async () => {
      const totalSupply = ethers.BigNumber.from(10).pow(6);
      const delta = 1; // 0.0001% of the total supply

      beforeEach(async () => {
        await setBalances([
          {receiver: signers[0].address, amount: totalSupply.sub(delta)}, // 99.9999%
          {receiver: signers[1].address, amount: delta}, //             0.0001%
        ]);

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

      it('early support criterium is sharp by 1 vote', async () => {
        advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        // 1 vote is still missing to meet >99.9999%
        const proposal = await voting.getProposal(id);
        const tally = proposal.tally;
        const totalVotingPower = await voting.totalVotingPower(
          proposal.parameters.snapshotBlock
        );
        expect(
          totalVotingPower.sub(tally.yes).sub(tally.abstain) // this is the number of worst case no votes
        ).to.eq(totalVotingPower.div(RATIO_BASE));

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;

        // cast the last vote so that support = 100%
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
      });

      it('participation is not met with 1 vote missing', async () => {
        await advanceIntoVoteTime(startDate, endDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        expect(await voting.isMinParticipationReached(id)).to.be.false;

        // 1 vote is still missing to meet particpiation = 100%
        const proposal = await voting.getProposal(id);
        const tally = proposal.tally;
        const totalVotingPower = await voting.totalVotingPower(
          proposal.parameters.snapshotBlock
        );
        expect(
          totalVotingPower.sub(tally.yes).sub(tally.no).sub(tally.abstain)
        ).to.eq(1);
        expect(await voting.isMinParticipationReached(id)).to.be.false;

        // cast the last vote so that participation = 100%
        await voting.connect(signers[1]).vote(id, VoteOption.Yes, false);
        expect(await voting.isMinParticipationReached(id)).to.be.true;
      });
    });
  });

  describe('Execution criteria handle token balances for multiple orders of magnitude', async function () {
    beforeEach(async () => {
      votingSettings.supportThreshold = pctToRatio(50);
      votingSettings.minParticipation = pctToRatio(20);
      votingSettings.votingMode = VotingMode.EarlyExecution;
    });

    const powers = [0, 1, 2, 3, 6, 12, 18, 24, 36, 48];

    powers.forEach(async power => {
      it(`magnitudes of 10^${power}`, async function () {
        await voting.initialize(
          dao.address,
          votingSettings,
          governanceErc20Mock.address
        );

        let magnitude = BigNumber.from(10).pow(power);

        const oneToken = magnitude;
        const balances = [
          {
            receiver: signers[0].address,
            amount: oneToken.mul(5).add(1),
          },
          {
            receiver: signers[1].address,
            amount: oneToken.mul(5),
          },
        ];

        // signer[0] has more voting power than signer[1]
        const balanceDifference = balances[0].amount.sub(balances[1].amount);
        expect(balanceDifference).to.eq(1);

        await setBalances(balances);

        await voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          0,
          0,
          VoteOption.None,
          false
        );

        const snapshotBlock = (await voting.getProposal(id)).parameters
          .snapshotBlock;
        const totalVotingPower = await voting.totalVotingPower(snapshotBlock);
        expect(totalVotingPower).to.eq(
          balances[0].amount.add(balances[1].amount)
        );

        // vote with both signers
        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);
        await voting.connect(signers[1]).vote(id, VoteOption.No, false);

        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;
      });
    });
  });
});
