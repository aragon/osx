import {ADDRESSLIST_VOTING_INTERFACE_ID} from '../../../../../../subgraph/src/utils/constants';
import {
  AddresslistVoting,
  AddresslistVoting__factory,
  Addresslist__factory,
  DAO,
  DAO__factory,
  IERC165Upgradeable__factory,
  IMajorityVoting__factory,
  IMembership__factory,
  IPlugin__factory,
  IProposal__factory,
  IProtocolVersion__factory,
} from '../../../../../typechain';
import {AddresslistVoting__factory as AddresslistVoting_V1_0_0__factory} from '../../../../../typechain/@aragon/osx-v1.0.1/plugins/governance/majority-voting/addresslist/AddresslistVoting.sol';
import {AddresslistVoting__factory as AddresslistVoting_V1_3_0__factory} from '../../../../../typechain/@aragon/osx-v1.3.0/plugins/governance/majority-voting/addresslist/AddresslistVoting.sol';
import {
  ProposalCreatedEvent,
  ProposalExecutedEvent,
} from '../../../../../typechain/AddresslistVoting';
import {ExecutedEvent} from '../../../../../typechain/DAO';
import {deployNewDAO} from '../../../../test-utils/dao';
import {
  getProtocolVersion,
  deployAndUpgradeFromToCheck,
  deployAndUpgradeSelfCheck,
} from '../../../../test-utils/uups-upgradeable';
import {
  MAJORITY_VOTING_BASE_INTERFACE,
  VOTING_EVENTS,
} from '../majority-voting-constants';
import {
  VoteOption,
  VotingMode,
  VotingSettings,
  voteWithSigners,
} from '../voting-helpers';
import {ADDRESSLIST_VOTING_INTERFACE} from './addresslist-voting-constants';
import {TIME} from '@aragon/osx-commons-sdk/src/constants';
import {
  IDAO_EVENTS,
  IMEMBERSHIP_EVENTS,
  IPROPOSAL_EVENTS,
  findEvent,
  findEventTopicLog,
} from '@aragon/osx-commons-sdk/src/events';
import {getInterfaceId} from '@aragon/osx-commons-sdk/src/interfaces';
import {pctToRatio} from '@aragon/osx-commons-sdk/src/math';
import {PLUGIN_UUPS_UPGRADEABLE_PERMISSIONS} from '@aragon/osx-commons-sdk/src/permission';
import {proposalIdToBytes32} from '@aragon/osx-commons-sdk/src/proposal';
import {
  CURRENT_PROTOCOL_VERSION,
  IMPLICIT_INITIAL_PROTOCOL_VERSION,
} from '@aragon/osx-commons/utils/protocol-version';
import {deployWithProxy} from '@aragon/osx-commons/utils/proxy';
import {time} from '@nomicfoundation/hardhat-network-helpers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ContractFactory} from 'ethers';
import {ethers} from 'hardhat';

describe('AddresslistVoting', function () {
  let signers: SignerWithAddress[];
  let voting: AddresslistVoting;
  let dao: DAO;
  let dummyActions: any;
  let dummyMetadata: string;
  let startDate: number;
  let endDate: number;
  let votingSettings: VotingSettings;

  const id = 0;

  before(async () => {
    signers = await ethers.getSigners();

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

    dao = await deployNewDAO(signers[0]);
  });

  beforeEach(async function () {
    votingSettings = {
      votingMode: VotingMode.EarlyExecution,
      supportThreshold: pctToRatio(50),
      minParticipation: pctToRatio(20),
      minDuration: TIME.HOUR,
      minProposerVotingPower: 0,
    };

    const AddresslistVotingFactory = new AddresslistVoting__factory(signers[0]);

    voting = await deployWithProxy(AddresslistVotingFactory);

    startDate = (await time.latest()) + 20;
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
  });

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await voting.initialize(dao.address, votingSettings, []);

      await expect(
        voting.initialize(dao.address, votingSettings, [])
      ).to.be.revertedWith('Initializable: contract is already initialized');
    });
  });

  describe('Upgrades', () => {
    let legacyContractFactory: ContractFactory;
    let currentContractFactory: ContractFactory;
    let initArgs: any;

    before(() => {
      currentContractFactory = new AddresslistVoting__factory(signers[0]);
    });

    beforeEach(() => {
      initArgs = {
        dao: dao.address,
        votingSettings: votingSettings,
        members: [signers[0].address, signers[1].address],
      };
    });

    it('upgrades to a new implementation', async () => {
      await deployAndUpgradeSelfCheck(
        signers[0],
        signers[1],
        initArgs,
        'initialize',
        currentContractFactory,
        PLUGIN_UUPS_UPGRADEABLE_PERMISSIONS.UPGRADE_PLUGIN_PERMISSION_ID,
        dao
      );
    });

    it('upgrades from v1.0.0', async () => {
      legacyContractFactory = new AddresslistVoting_V1_0_0__factory(signers[0]);

      const {fromImplementation, toImplementation} =
        await deployAndUpgradeFromToCheck(
          signers[0],
          signers[1],

          initArgs,
          'initialize',
          legacyContractFactory,
          currentContractFactory,
          PLUGIN_UUPS_UPGRADEABLE_PERMISSIONS.UPGRADE_PLUGIN_PERMISSION_ID,
          dao
        );
      expect(toImplementation).to.not.equal(fromImplementation);

      const fromProtocolVersion = await getProtocolVersion(
        legacyContractFactory.attach(fromImplementation)
      );
      const toProtocolVersion = await getProtocolVersion(
        currentContractFactory.attach(toImplementation)
      );
      expect(fromProtocolVersion).to.not.deep.equal(toProtocolVersion);
      expect(fromProtocolVersion).to.deep.equal(
        IMPLICIT_INITIAL_PROTOCOL_VERSION
      );
      expect(toProtocolVersion).to.deep.equal(CURRENT_PROTOCOL_VERSION);
    });

    it('from v1.3.0', async () => {
      legacyContractFactory = new AddresslistVoting_V1_3_0__factory(signers[0]);

      const {fromImplementation, toImplementation} =
        await deployAndUpgradeFromToCheck(
          signers[0],
          signers[1],

          initArgs,
          'initialize',
          legacyContractFactory,
          currentContractFactory,
          PLUGIN_UUPS_UPGRADEABLE_PERMISSIONS.UPGRADE_PLUGIN_PERMISSION_ID,
          dao
        );
      expect(toImplementation).to.not.equal(fromImplementation);

      const fromProtocolVersion = await getProtocolVersion(
        legacyContractFactory.attach(fromImplementation)
      );
      const toProtocolVersion = await getProtocolVersion(
        currentContractFactory.attach(toImplementation)
      );
      expect(fromProtocolVersion).to.not.deep.equal(toProtocolVersion);
      expect(fromProtocolVersion).to.deep.equal(
        IMPLICIT_INITIAL_PROTOCOL_VERSION
      );
      expect(toProtocolVersion).to.deep.equal(CURRENT_PROTOCOL_VERSION);
    });
  });

  describe('plugin interface: ', async () => {
    it('does not support the empty interface', async () => {
      expect(await voting.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165Upgradeable` interface', async () => {
      const iface = IERC165Upgradeable__factory.createInterface();
      expect(await voting.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IPlugin` interface', async () => {
      const iface = IPlugin__factory.createInterface();
      expect(await voting.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IProtocolVersion` interface', async () => {
      const iface = IProtocolVersion__factory.createInterface();
      expect(await voting.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IProposal` interface', async () => {
      const iface = IProposal__factory.createInterface();
      expect(await voting.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IMembership` interface', async () => {
      const iface = IMembership__factory.createInterface();
      expect(await voting.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `Addresslist` interface', async () => {
      const iface = Addresslist__factory.createInterface();
      expect(await voting.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IMajorityVoting` interface', async () => {
      const iface = IMajorityVoting__factory.createInterface();
      expect(await voting.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `MajorityVotingBase` interface', async () => {
      expect(
        await voting.supportsInterface(
          getInterfaceId(MAJORITY_VOTING_BASE_INTERFACE)
        )
      ).to.be.true;
    });

    it('supports the `AddresslistVoting` interface', async () => {
      const iface = getInterfaceId(ADDRESSLIST_VOTING_INTERFACE);
      expect(iface).to.equal(ADDRESSLIST_VOTING_INTERFACE_ID); // checks that it didn't change
      expect(await voting.supportsInterface(iface)).to.be.true;
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
        .to.emit(voting, IMEMBERSHIP_EVENTS.MEMBERS_ADDED)
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
        .to.emit(voting, IMEMBERSHIP_EVENTS.MEMBERS_REMOVED)
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

    it('reverts if `_msgSender` is not listed in the current block although he was listed in the last block', async () => {
      votingSettings.minProposerVotingPower = 1;

      await voting.initialize(
        dao.address,
        votingSettings,
        [signers[0].address] // signers[0] is listed
      );

      await ethers.provider.send('evm_setAutomine', [false]);
      const expectedSnapshotBlockNumber = (
        await ethers.provider.getBlock('latest')
      ).number;

      // Transaction 1 & 2: Add signers[1] and remove signers[0]
      const tx1 = await voting.addAddresses([signers[1].address]);
      const tx2 = await voting.removeAddresses([signers[0].address]);

      // Transaction 3: Expect the proposal creation to fail for signers[0] because he was removed as a member in transaction 2.
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

      // Transaction 4: Create the proposal as signers[1]
      const tx4 = await voting
        .connect(signers[1])
        .createProposal(
          dummyMetadata,
          [],
          0,
          startDate,
          endDate,
          VoteOption.None,
          false
        );

      // Check the listed members before the block is mined
      expect(await voting.isListed(signers[0].address)).to.equal(true);
      expect(await voting.isListed(signers[1].address)).to.equal(false);

      // Mine the block
      await ethers.provider.send('evm_mine', []);
      const minedBlockNumber = (await ethers.provider.getBlock('latest'))
        .number;

      // Expect all transaction receipts to be in the same block after the snapshot block.
      expect((await tx1.wait()).blockNumber).to.equal(minedBlockNumber);
      expect((await tx2.wait()).blockNumber).to.equal(minedBlockNumber);
      expect((await tx4.wait()).blockNumber).to.equal(minedBlockNumber);
      expect(minedBlockNumber).to.equal(expectedSnapshotBlockNumber + 1);

      // Expect the listed members to have changed
      expect(await voting.isListed(signers[0].address)).to.equal(false);
      expect(await voting.isListed(signers[1].address)).to.equal(true);

      // Check the `ProposalCreatedEvent` for the creator and proposalId
      const event = await findEvent<ProposalCreatedEvent>(
        tx4,
        'ProposalCreated'
      );
      expect(event.args.proposalId).to.equal(id);
      expect(event.args.creator).to.equal(signers[1].address);

      // Check that the snapshot block stored in the proposal struct
      const proposal = await voting.getProposal(id);
      expect(proposal.parameters.snapshotBlock).to.equal(
        expectedSnapshotBlockNumber
      );

      await ethers.provider.send('evm_setAutomine', [true]);
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

      const currentDate = await time.latest();
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

      const MAX_UINT64 = ethers.BigNumber.from(2).pow(64).sub(1);
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

      const startDate = (await time.latest()) + 1;
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

    it('sets the startDate to now and endDate to startDate + minDuration, if 0 is provided as an input', async () => {
      await voting.initialize(dao.address, votingSettings, [
        signers[0].address,
      ]);

      // Create a proposal with zero as an input for `_startDate` and `_endDate`
      const startDate = 0; // now
      const endDate = 0; // startDate + minDuration

      const creationTx = await voting.createProposal(
        dummyMetadata,
        [],
        0,
        startDate,
        endDate,
        VoteOption.None,
        false
      );

      const currentTime = (
        await ethers.provider.getBlock((await creationTx.wait()).blockNumber)
      ).timestamp;

      const expectedStartDate = currentTime;
      const expectedEndDate = expectedStartDate + votingSettings.minDuration;

      // Check the state
      const proposal = await voting.getProposal(id);
      expect(proposal.parameters.startDate).to.eq(expectedStartDate);
      expect(proposal.parameters.endDate).to.eq(expectedEndDate);

      // Check the event
      const event = await findEvent<ProposalCreatedEvent>(
        creationTx,
        'ProposalCreated'
      );

      expect(event.args.proposalId).to.equal(id);
      expect(event.args.creator).to.equal(signers[0].address);
      expect(event.args.startDate).to.equal(expectedStartDate);
      expect(event.args.endDate).to.equal(expectedEndDate);
      expect(event.args.metadata).to.equal(dummyMetadata);
      expect(event.args.actions).to.deep.equal([]);
      expect(event.args.allowFailureMap).to.equal(0);
    });

    it('ceils the `minVotingPower` value if it has a remainder', async () => {
      votingSettings.minParticipation = pctToRatio(30).add(1); // 30.0001 %

      await voting.initialize(
        dao.address,
        votingSettings,
        signers.slice(0, 10).map(s => s.address)
      );

      const tx = await voting.createProposal(
        dummyMetadata,
        dummyActions,
        0,
        startDate,
        endDate,
        VoteOption.None,
        false
      );
      const event = await findEvent<ProposalCreatedEvent>(
        tx,
        'ProposalCreated'
      );
      expect(event.args.proposalId).to.equal(id);

      expect((await voting.getProposal(id)).parameters.minVotingPower).to.eq(4); // 4 out of 10 votes must be casted for the proposal to pass
    });

    it('does not ceil the `minVotingPower` value if it has no remainder', async () => {
      votingSettings.minParticipation = pctToRatio(30); // 30.0000 %

      await voting.initialize(
        dao.address,
        votingSettings,
        signers.slice(0, 10).map(s => s.address)
      );

      const tx = await voting.createProposal(
        dummyMetadata,
        dummyActions,
        0,
        startDate,
        endDate,
        VoteOption.None,
        false
      );
      const event = await findEvent<ProposalCreatedEvent>(
        tx,
        'ProposalCreated'
      );
      expect(event.args.proposalId).to.equal(id);

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
        .to.emit(voting, IPROPOSAL_EVENTS.PROPOSAL_CREATED)
        .to.not.emit(voting, VOTING_EVENTS.VOTE_CAST);

      const event = await findEvent<ProposalCreatedEvent>(
        tx,
        IPROPOSAL_EVENTS.PROPOSAL_CREATED
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
        .to.emit(voting, IPROPOSAL_EVENTS.PROPOSAL_CREATED)
        .to.emit(voting, VOTING_EVENTS.VOTE_CAST)
        .withArgs(id, signers[0].address, VoteOption.Yes, 1);

      const event = await findEvent<ProposalCreatedEvent>(
        tx,
        IPROPOSAL_EVENTS.PROPOSAL_CREATED
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

      expect(await time.latest()).to.be.lessThan(startDate);

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
      const tx = await voting.createProposal(
        dummyMetadata,
        dummyActions,
        0,
        startDate,
        endDate,
        VoteOption.None,
        false
      );
      const event = await findEvent<ProposalCreatedEvent>(
        tx,
        'ProposalCreated'
      );
      expect(event.args.proposalId).to.equal(id);
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

        const tx = await voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          startDate,
          endDate,
          VoteOption.None,
          false
        );
        const event = await findEvent<ProposalCreatedEvent>(
          tx,
          'ProposalCreated'
        );
        expect(event.args.proposalId).to.equal(id);
      });

      it('reverts on voting None', async () => {
        await time.increaseTo(startDate);

        // Check that voting is possible but don't vote using `callStatic`
        await expect(voting.callStatic.vote(id, VoteOption.Yes, false)).not.to
          .be.reverted;

        await expect(voting.vote(id, VoteOption.None, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.None);
      });

      it('reverts on vote replacement', async () => {
        await time.increaseTo(startDate);

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
        await time.increaseTo(startDate);

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
        await time.increaseTo(startDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 3 votes
          no: [3, 4], // 2 votes
          abstain: [5, 6], // 2 votes
        });

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;

        await time.increaseTo(endDate);

        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;

        expect(await voting.canExecute(id)).to.be.true;
      });

      it('does not execute early when voting with the `tryEarlyExecution` option', async () => {
        await time.increaseTo(startDate);

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
        await time.increaseTo(startDate);

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

        const tx = await voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          startDate,
          endDate,
          VoteOption.None,
          false
        );
        const event = await findEvent<ProposalCreatedEvent>(
          tx,
          'ProposalCreated'
        );

        expect(event.args.proposalId).to.equal(id);
      });

      it('does not allow voting, when the vote has not started yet', async () => {
        expect(await time.latest()).to.be.lessThan(startDate);

        expect(await voting.canVote(id, signers[0].address, VoteOption.Yes)).to
          .be.false;

        await expect(voting.vote(id, VoteOption.Yes, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.Yes);
      });

      it('increases the yes, no, and abstain count and emits correct events', async () => {
        await time.increaseTo(startDate);

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
        await time.increaseTo(startDate);

        // Check that voting is possible but don't vote using `callStatic`
        await expect(voting.callStatic.vote(id, VoteOption.Yes, false)).not.to
          .be.reverted;

        await expect(voting.vote(id, VoteOption.None, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.None);
      });

      it('reverts on vote replacement', async () => {
        await time.increaseTo(startDate);

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
        await time.increaseTo(startDate);

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
        await time.increaseTo(startDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 3 votes
          no: [3, 4], // 2 votes
          abstain: [5, 6], // 2 votes
        });

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.isMinParticipationReached(id)).to.be.true;

        expect(await voting.canExecute(id)).to.be.false;

        await time.increaseTo(endDate);

        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;

        expect(await voting.canExecute(id)).to.be.true;
      });

      it('executes the vote immediately when the vote is decided early and the `tryEarlyExecution` option is selected', async () => {
        await time.increaseTo(startDate);

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
          const event = await findEventTopicLog<ExecutedEvent>(
            tx,
            DAO__factory.createInterface(),
            IDAO_EVENTS.EXECUTED
          );

          expect(event.args.actor).to.equal(voting.address);
          expect(event.args.callId).to.equal(proposalIdToBytes32(id));
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
            IPROPOSAL_EVENTS.PROPOSAL_EXECUTED
          );
          expect(event.args.proposalId).to.equal(id);
        }

        // calling execute again should fail
        await expect(voting.execute(id))
          .to.be.revertedWithCustomError(voting, 'ProposalExecutionForbidden')
          .withArgs(id);
      });

      it('reverts if vote is not decided yet', async () => {
        await time.increaseTo(startDate);

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

        const tx = await voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          startDate,
          endDate,
          VoteOption.None,
          false
        );
        const event = await findEvent<ProposalCreatedEvent>(
          tx,
          'ProposalCreated'
        );
        expect(event.args.proposalId).to.equal(id);
      });

      it('reverts on voting None', async () => {
        await time.increaseTo(startDate);

        // Check that voting is possible but don't vote using `callStatic`
        await expect(voting.callStatic.vote(id, VoteOption.Yes, false)).not.to
          .be.reverted;

        await expect(voting.vote(id, VoteOption.None, false))
          .to.be.revertedWithCustomError(voting, 'VoteCastForbidden')
          .withArgs(id, signers[0].address, VoteOption.None);
      });

      it('should allow vote replacement but not double-count votes by the same address', async () => {
        await time.increaseTo(startDate);

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
        await time.increaseTo(startDate);

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
        await time.increaseTo(startDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 3 votes
          no: [3, 4], // 2 votes
          abstain: [5, 6], // 2 votes
        });

        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;

        await time.increaseTo(endDate);

        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.isMinParticipationReached(id)).to.be.true;

        expect(await voting.canExecute(id)).to.be.true;
      });

      it('does not execute early when voting with the `tryEarlyExecution` option', async () => {
        await time.increaseTo(startDate);

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
        await time.increaseTo(startDate);

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
        await time.increaseTo(startDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await time.increaseTo(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('does not execute `if participation is high enough but support is t`oo low', async () => {
        await time.increaseTo(startDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0], // 1 votes
          no: [1, 2], // 2 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await time.increaseTo(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('executes after the duration if participation and support are met', async () => {
        await time.increaseTo(startDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 3 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await time.increaseTo(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true; // all criteria are met
      });

      it('executes early if participation and support are met and the vote outcome cannot change anymore', async () => {
        await time.increaseTo(startDate);

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
        const tx = await voting.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          startDate,
          endDate,
          VoteOption.None,
          false
        );
        const event = await findEvent<ProposalCreatedEvent>(
          tx,
          'ProposalCreated'
        );
        expect(event.args.proposalId).to.equal(id);
      });

      it('does not execute if support is high enough but participation is too low', async () => {
        await time.increaseTo(startDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await time.increaseTo(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('does not execute if participation is high enough but support is too low', async () => {
        await time.increaseTo(startDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0], // 1 votes
          no: [1, 2, 3, 4, 5, 6, 7], // 7 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await time.increaseTo(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('executes after the duration if participation and support thresholds are met', async () => {
        await time.increaseTo(startDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2], // 3 votes
          no: [3, 4], // 2 votes
          abstain: [5, 6, 7], // 3 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        await time.increaseTo(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;
      });

      it('should not allow the vote to pass if the minimum participation is not reached', async () => {
        await time.increaseTo(startDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4, 5], // 6 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;

        await time.increaseTo(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('executes early if the participation exceeds the support threshold (assuming the latter is > 50%)', async () => {
        await time.increaseTo(startDate);

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

        await time.increaseTo(endDate);

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
        time.increaseTo(startDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        // does not execute normally
        await time.increaseTo(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('executes if participation and support are met', async () => {
        // Check if the proposal can execute early
        await time.increaseTo(startDate);

        await voting.connect(signers[0]).vote(id, VoteOption.Yes, false);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;

        // Check if the proposal can execute normally
        await time.increaseTo(endDate);

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
        await time.increaseTo(startDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4, 5, 6, 7, 8], // 9 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.false;
        expect(await voting.canExecute(id)).to.be.false;

        // does not execute normally
        await time.increaseTo(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.false;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.false;
      });

      it('executes if participation and support are met', async () => {
        // Check if the proposal can execute early
        await time.increaseTo(startDate);

        await voteWithSigners(voting, id, signers, {
          yes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // 10 votes
          no: [], // 0 votes
          abstain: [], // 0 votes
        });

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReachedEarly(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;

        // Check if the proposal can execute normally
        await time.increaseTo(endDate);

        expect(await voting.isMinParticipationReached(id)).to.be.true;
        expect(await voting.isSupportThresholdReached(id)).to.be.true;
        expect(await voting.canExecute(id)).to.be.true;
      });
    });
  });
});
