import {MULTISIG_INTERFACE_ID} from '../../../../../subgraph/src/utils/constants';
import {
  Addresslist__factory,
  DAO,
  DAO__factory,
  IERC165Upgradeable__factory,
  IMembership__factory,
  IMultisig__factory,
  IPlugin__factory,
  IProposal__factory,
  IProtocolVersion__factory,
  Multisig,
  Multisig__factory,
} from '../../../../typechain';
import {Multisig__factory as Multisig_V1_0_0__factory} from '../../../../typechain/@aragon/osx-v1.0.1/plugins/governance/multisig/Multisig.sol';
import {Multisig__factory as Multisig_V1_3_0__factory} from '../../../../typechain/@aragon/osx-v1.3.0/plugins/governance/multisig/Multisig.sol';
import {ExecutedEvent} from '../../../../typechain/DAO';
import {ProposalCreatedEvent} from '../../../../typechain/IProposal';
import {
  ApprovedEvent,
  ProposalExecutedEvent,
} from '../../../../typechain/Multisig';
import {deployNewDAO} from '../../../test-utils/dao';
import {osxContractsVersion} from '../../../test-utils/protocol-version';
import {deployWithProxy} from '../../../test-utils/proxy';
import {
  getProtocolVersion,
  deployAndUpgradeFromToCheck,
  deployAndUpgradeSelfCheck,
} from '../../../test-utils/uups-upgradeable';
import {
  MULTISIG_EVENTS,
  MULTISIG_INTERFACE,
  MultisigSettings,
} from './multisig-constants';
import {
  getInterfaceId,
  proposalIdToBytes32,
  IDAO_EVENTS,
  PLUGIN_UUPS_UPGRADEABLE_PERMISSIONS,
  IMEMBERSHIP_EVENTS,
  IPROPOSAL_EVENTS,
  findEvent,
  findEventTopicLog,
  TIME,
} from '@aragon/osx-commons-sdk';
import {time} from '@nomicfoundation/hardhat-network-helpers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {Contract, ContractFactory} from 'ethers';
import {ethers} from 'hardhat';

export async function approveWithSigners(
  multisigContract: Contract,
  proposalId: number,
  signers: SignerWithAddress[],
  signerIds: number[]
) {
  let promises = signerIds.map(i =>
    multisigContract.connect(signers[i]).approve(proposalId, false)
  );

  await Promise.all(promises);
}

describe('Multisig', function () {
  let signers: SignerWithAddress[];
  let multisig: Multisig;
  let dao: DAO;
  let dummyActions: any;
  let dummyMetadata: string;
  let startDate: number;
  let endDate: number;
  let multisigSettings: MultisigSettings;

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
    startDate = (await time.latest()) + 1000;
    endDate = startDate + 1000;

    multisigSettings = {
      minApprovals: 3,
      onlyListed: true,
    };

    const MultisigFactory = new Multisig__factory(signers[0]);
    multisig = await deployWithProxy(MultisigFactory);

    dao.grant(
      dao.address,
      multisig.address,
      ethers.utils.id('EXECUTE_PERMISSION')
    );
    dao.grant(
      multisig.address,
      signers[0].address,
      ethers.utils.id('UPDATE_MULTISIG_SETTINGS_PERMISSION')
    );
  });

  describe('initialize:', async () => {
    it('reverts if trying to re-initialize', async () => {
      await multisig.initialize(
        dao.address,
        signers.slice(0, 5).map(s => s.address),
        multisigSettings
      );

      await expect(
        multisig.initialize(
          dao.address,
          signers.slice(0, 5).map(s => s.address),
          multisigSettings
        )
      ).to.be.revertedWith('Initializable: contract is already initialized');
    });

    it('adds the initial addresses to the address list', async () => {
      expect(await multisig.addresslistLength()).to.equal(0);

      multisigSettings.minApprovals = 2;
      await multisig.initialize(
        dao.address,
        signers.slice(0, 2).map(s => s.address),
        multisigSettings
      );

      expect(await multisig.addresslistLength()).to.equal(2);
      expect(await multisig.isListed(signers[0].address)).to.equal(true);
      expect(await multisig.isListed(signers[1].address)).to.equal(true);
    });

    it('should set the `minApprovals`', async () => {
      await multisig.initialize(
        dao.address,
        signers.slice(0, 5).map(s => s.address),
        multisigSettings
      );
      expect((await multisig.multisigSettings()).minApprovals).to.be.eq(
        multisigSettings.minApprovals
      );
    });

    it('should set `onlyListed`', async () => {
      await multisig.initialize(
        dao.address,
        signers.slice(0, 5).map(s => s.address),
        multisigSettings
      );
      expect((await multisig.multisigSettings()).onlyListed).to.be.eq(
        multisigSettings.onlyListed
      );
    });

    it('should emit `MultisigSettingsUpdated` during initialization', async () => {
      await expect(
        multisig.initialize(
          dao.address,
          signers.slice(0, 5).map(s => s.address),
          multisigSettings
        )
      )
        .to.emit(multisig, MULTISIG_EVENTS.MULTISIG_SETTINGS_UPDATED)
        .withArgs(multisigSettings.onlyListed, multisigSettings.minApprovals);
    });

    it('should revert if members list is longer than uint16 max', async () => {
      const megaMember = signers[1];
      const members: string[] = new Array(65536).fill(megaMember.address);
      await expect(multisig.initialize(dao.address, members, multisigSettings))
        .to.revertedWithCustomError(multisig, 'AddresslistLengthOutOfBounds')
        .withArgs(65535, members.length);
    });
  });

  describe('Upgrades', () => {
    let legacyContractFactory: ContractFactory;
    let currentContractFactory: ContractFactory;
    let initArgs: any;

    before(() => {
      currentContractFactory = new Multisig__factory(signers[0]);
    });

    beforeEach(() => {
      initArgs = {
        dao: dao.address,
        members: [signers[0].address, signers[1].address, signers[2].address],
        multisigSettings: multisigSettings,
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
      legacyContractFactory = new Multisig_V1_0_0__factory(signers[0]);

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
      expect(toImplementation).to.not.equal(fromImplementation); // The build did change

      const fromProtocolVersion = await getProtocolVersion(
        legacyContractFactory.attach(fromImplementation)
      );
      const toProtocolVersion = await getProtocolVersion(
        currentContractFactory.attach(toImplementation)
      );

      expect(fromProtocolVersion).to.not.deep.equal(toProtocolVersion);
      expect(fromProtocolVersion).to.deep.equal([1, 0, 0]);
      expect(toProtocolVersion).to.deep.equal(osxContractsVersion());
    });

    it('from v1.3.0', async () => {
      legacyContractFactory = new Multisig_V1_3_0__factory(signers[0]);

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
      expect(fromProtocolVersion).to.deep.equal([1, 0, 0]);
      expect(toProtocolVersion).to.deep.equal(osxContractsVersion());
    });
  });

  describe('ERC-165', async () => {
    it('does not support the empty interface', async () => {
      expect(await multisig.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165Upgradeable` interface', async () => {
      const iface = IERC165Upgradeable__factory.createInterface();
      expect(await multisig.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `IPlugin` interface', async () => {
      const iface = IPlugin__factory.createInterface();
      expect(await multisig.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `IProtocolVersion` interface', async () => {
      const iface = IProtocolVersion__factory.createInterface();
      expect(await multisig.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `IProposal` interface', async () => {
      const iface = IProposal__factory.createInterface();
      expect(await multisig.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `IMembership` interface', async () => {
      const iface = IMembership__factory.createInterface();
      expect(await multisig.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `Addresslist` interface', async () => {
      const iface = Addresslist__factory.createInterface();
      expect(await multisig.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `IMultisig` interface', async () => {
      const iface = IMultisig__factory.createInterface();
      expect(await multisig.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `Multisig` interface', async () => {
      const iface = getInterfaceId(MULTISIG_INTERFACE);
      expect(iface).to.equal(MULTISIG_INTERFACE_ID); // checks that it didn't change
      expect(await multisig.supportsInterface(iface)).to.be.true;
    });
  });

  describe('updateMultisigSettings:', async () => {
    beforeEach(async () => {
      await multisig.initialize(
        dao.address,
        signers.slice(0, 5).map(s => s.address),
        multisigSettings
      );
    });

    it('should not allow to set minApprovals larger than the address list length', async () => {
      let addresslistLength = (await multisig.addresslistLength()).toNumber();

      multisigSettings.minApprovals = addresslistLength + 1;

      await expect(multisig.updateMultisigSettings(multisigSettings))
        .to.be.revertedWithCustomError(multisig, 'MinApprovalsOutOfBounds')
        .withArgs(addresslistLength, multisigSettings.minApprovals);
    });

    it('should not allow to set `minApprovals` to 0', async () => {
      multisigSettings.minApprovals = 0;
      await expect(multisig.updateMultisigSettings(multisigSettings))
        .to.be.revertedWithCustomError(multisig, 'MinApprovalsOutOfBounds')
        .withArgs(1, 0);
    });

    it('should emit `MultisigSettingsUpdated` when `updateMutlsigSettings` gets called', async () => {
      await expect(multisig.updateMultisigSettings(multisigSettings))
        .to.emit(multisig, MULTISIG_EVENTS.MULTISIG_SETTINGS_UPDATED)
        .withArgs(multisigSettings.onlyListed, multisigSettings.minApprovals);
    });
  });

  describe('isListed:', async () => {
    it('should return false, if a user is not listed', async () => {
      multisigSettings.minApprovals = 1;
      await multisig.initialize(
        dao.address,
        [signers[0].address],
        multisigSettings
      );

      expect(await multisig.isListed(signers[9].address)).to.equal(false);
    });
  });

  describe('isMember', async () => {
    it('should return false, if user is not listed', async () => {
      expect(await multisig.isMember(signers[0].address)).to.be.false;
    });

    it('should return true if user is in the latest list', async () => {
      multisigSettings.minApprovals = 1;
      await multisig.initialize(
        dao.address,
        [signers[0].address],
        multisigSettings
      );
      expect(await multisig.isMember(signers[0].address)).to.be.true;
    });
  });

  describe('addAddresses:', async () => {
    it('should add new members to the address list and emit the `MembersAdded` event', async () => {
      multisigSettings.minApprovals = 1;
      await multisig.initialize(
        dao.address,
        [signers[0].address],
        multisigSettings
      );

      expect(await multisig.isListed(signers[0].address)).to.equal(true);
      expect(await multisig.isListed(signers[1].address)).to.equal(false);

      // add a new member
      await expect(multisig.addAddresses([signers[1].address]))
        .to.emit(multisig, IMEMBERSHIP_EVENTS.MEMBERS_ADDED)
        .withArgs([signers[1].address]);

      expect(await multisig.isListed(signers[0].address)).to.equal(true);
      expect(await multisig.isListed(signers[1].address)).to.equal(true);
    });
  });

  describe('removeAddresses:', async () => {
    it('should remove users from the address list and emit the `MembersRemoved` event', async () => {
      multisigSettings.minApprovals = 1;
      await multisig.initialize(
        dao.address,
        signers.slice(0, 2).map(s => s.address),
        multisigSettings
      );

      expect(await multisig.isListed(signers[0].address)).to.equal(true);
      expect(await multisig.isListed(signers[1].address)).to.equal(true);

      // remove an existing member
      await expect(multisig.removeAddresses([signers[1].address]))
        .to.emit(multisig, IMEMBERSHIP_EVENTS.MEMBERS_REMOVED)
        .withArgs([signers[1].address]);

      expect(await multisig.isListed(signers[0].address)).to.equal(true);
      expect(await multisig.isListed(signers[1].address)).to.equal(false);
    });

    it('reverts if the address list would become empty', async () => {
      multisigSettings.minApprovals = 1;
      await multisig.initialize(
        dao.address,
        [signers[0].address],
        multisigSettings
      );

      await expect(multisig.removeAddresses([signers[0].address]))
        .to.be.revertedWithCustomError(multisig, 'MinApprovalsOutOfBounds')
        .withArgs(
          (await multisig.addresslistLength()).sub(1),
          multisigSettings.minApprovals
        );
    });

    it('reverts if the address list would become shorter than the current minimum approval parameter requires', async () => {
      multisigSettings.minApprovals = 2;
      await multisig.initialize(
        dao.address,
        signers.slice(0, 3).map(s => s.address),
        multisigSettings
      );

      await expect(multisig.removeAddresses([signers[1].address])).not.to.be
        .reverted;

      await expect(multisig.removeAddresses([signers[2].address]))
        .to.be.revertedWithCustomError(multisig, 'MinApprovalsOutOfBounds')
        .withArgs(
          (await multisig.addresslistLength()).sub(1),
          multisigSettings.minApprovals
        );
    });
  });

  describe('createProposal:', async () => {
    beforeEach(async () => {
      multisigSettings.minApprovals = 1;
    });

    it('increments the proposal counter', async () => {
      await multisig.initialize(
        dao.address,
        [signers[0].address], // signers[0] is listed
        multisigSettings
      );

      expect(await multisig.proposalCount()).to.equal(0);

      await expect(
        multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          false,
          false,
          0,
          startDate
        )
      ).not.to.be.reverted;

      expect(await multisig.proposalCount()).to.equal(1);
    });

    it('creates unique proposal IDs for each proposal', async () => {
      await multisig.initialize(
        dao.address,
        [signers[0].address], // signers[0] is listed
        multisigSettings
      );
      await ethers.provider.send('evm_mine', []);

      const proposalId0 = await multisig.callStatic.createProposal(
        dummyMetadata,
        dummyActions,
        0,
        false,
        false,
        0,
        endDate
      );
      // create a new proposal for the proposalCounter to be incremented
      await expect(
        multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          false,
          false,
          0,
          startDate
        )
      ).not.to.be.reverted;

      const proposalId1 = await multisig.callStatic.createProposal(
        dummyMetadata,
        dummyActions,
        0,
        false,
        false,
        0,
        endDate
      );

      expect(proposalId0).to.equal(0); // To be removed when proposal ID is generated as a hash.
      expect(proposalId1).to.equal(1); // To be removed when proposal ID is generated as a hash.

      expect(proposalId0).to.not.equal(proposalId1);
    });

    it('emits the `ProposalCreated` event', async () => {
      await multisig.initialize(
        dao.address,
        [signers[0].address], // signers[0] is listed
        multisigSettings
      );

      const allowFailureMap = 1;

      await expect(
        multisig
          .connect(signers[0])
          .createProposal(
            dummyMetadata,
            [],
            allowFailureMap,
            false,
            false,
            startDate,
            endDate
          )
      )
        .to.emit(multisig, IPROPOSAL_EVENTS.PROPOSAL_CREATED)
        .withArgs(
          id,
          signers[0].address,
          startDate,
          endDate,
          dummyMetadata,
          [],
          allowFailureMap
        );
    });

    it('reverts if the multisig settings have been changed in the same block', async () => {
      await multisig.initialize(
        dao.address,
        [signers[0].address], // signers[0] is listed
        multisigSettings
      );
      await dao.grant(
        multisig.address,
        dao.address,
        await multisig.UPDATE_MULTISIG_SETTINGS_PERMISSION_ID()
      );

      await ethers.provider.send('evm_setAutomine', [false]);

      await multisig.connect(signers[0]).createProposal(
        dummyMetadata,
        [
          {
            to: multisig.address,
            value: 0,
            data: multisig.interface.encodeFunctionData(
              'updateMultisigSettings',
              [
                {
                  onlyListed: false,
                  minApprovals: 1,
                },
              ]
            ),
          },
        ],
        0,
        true,
        true,
        0,
        endDate
      );
      await expect(
        multisig
          .connect(signers[0])
          .createProposal(dummyMetadata, [], 0, true, true, 0, endDate)
      )
        .to.revertedWithCustomError(multisig, 'ProposalCreationForbidden')
        .withArgs(signers[0].address);

      await ethers.provider.send('evm_setAutomine', [true]);
    });

    context('`onlyListed` is set to `false`:', async () => {
      beforeEach(async () => {
        multisigSettings.onlyListed = false;

        await multisig.initialize(
          dao.address,
          [signers[0].address], // signers[0] is listed
          multisigSettings
        );
      });

      it('creates a proposal when unlisted accounts are allowed', async () => {
        await expect(
          multisig
            .connect(signers[1]) // not listed
            .createProposal(
              dummyMetadata,
              [],
              0,
              false,
              false,
              startDate,
              endDate
            )
        )
          .to.emit(multisig, IPROPOSAL_EVENTS.PROPOSAL_CREATED)
          .withArgs(
            id,
            signers[1].address,
            startDate,
            endDate,
            dummyMetadata,
            [],
            0
          );
      });
    });

    context('`onlyListed` is set to `true`:', async () => {
      beforeEach(async () => {
        multisigSettings.onlyListed = true;

        await multisig.initialize(
          dao.address,
          [signers[0].address], // signers[0] is listed
          multisigSettings
        );
      });

      it('reverts if the user is not on the list and only listed accounts can create proposals', async () => {
        await expect(
          multisig
            .connect(signers[1]) // not listed
            .createProposal(dummyMetadata, [], 0, false, false, 0, startDate)
        )
          .to.be.revertedWithCustomError(multisig, 'ProposalCreationForbidden')
          .withArgs(signers[1].address);

        await expect(
          multisig
            .connect(signers[0])
            .createProposal(dummyMetadata, [], 0, false, false, 0, startDate)
        ).not.to.be.reverted;
      });

      it('reverts if `_msgSender` is not listed in the current block although he was listed in the last block', async () => {
        await ethers.provider.send('evm_setAutomine', [false]);
        const expectedSnapshotBlockNumber = (
          await ethers.provider.getBlock('latest')
        ).number;

        // Transaction 1 & 2: Add signers[1] and remove signers[0]
        const tx1 = await multisig.addAddresses([signers[1].address]);
        const tx2 = await multisig.removeAddresses([signers[0].address]);

        // Transaction 3: Expect the proposal creation to fail for signers[0] because he was removed as a member in transaction 2.
        await expect(
          multisig
            .connect(signers[0])
            .createProposal(dummyMetadata, [], 0, false, false, 0, startDate)
        )
          .to.be.revertedWithCustomError(multisig, 'ProposalCreationForbidden')
          .withArgs(signers[0].address);

        // Transaction 4: Create the proposal as signers[1]
        const tx4 = await multisig
          .connect(signers[1])
          .createProposal(dummyMetadata, [], 0, false, false, 0, startDate);

        // Check the listed members before the block is mined
        expect(await multisig.isListed(signers[0].address)).to.equal(true);
        expect(await multisig.isListed(signers[1].address)).to.equal(false);

        // Mine the block
        await ethers.provider.send('evm_mine', []);
        const minedBlockNumber = (await ethers.provider.getBlock('latest'))
          .number;

        // Expect all transaction receipts to be in the same block after the snapshot block.
        expect((await tx1.wait()).blockNumber).to.equal(minedBlockNumber);
        expect((await tx2.wait()).blockNumber).to.equal(minedBlockNumber);
        expect((await tx4.wait()).blockNumber).to.equal(minedBlockNumber);
        expect(minedBlockNumber).to.equal(expectedSnapshotBlockNumber + 1);

        // Expect the listed member to have changed
        expect(await multisig.isListed(signers[0].address)).to.equal(false);
        expect(await multisig.isListed(signers[1].address)).to.equal(true);

        // Check the `ProposalCreatedEvent` for the creator and proposalId
        const event = await findEvent<ProposalCreatedEvent>(
          tx4,
          'ProposalCreated'
        );
        expect(event.args.proposalId).to.equal(id);
        expect(event.args.creator).to.equal(signers[1].address);

        // Check that the snapshot block stored in the proposal struct
        const proposal = await multisig.getProposal(id);
        expect(proposal.parameters.snapshotBlock).to.equal(
          expectedSnapshotBlockNumber
        );

        await ethers.provider.send('evm_setAutomine', [true]);
      });

      it('creates a proposal successfully and does not approve if not specified', async () => {
        await time.setNextBlockTimestamp(startDate);

        await expect(
          multisig.createProposal(
            dummyMetadata,
            [],
            0,
            false,
            false,
            startDate,
            endDate
          )
        )
          .to.emit(multisig, IPROPOSAL_EVENTS.PROPOSAL_CREATED)
          .withArgs(
            id,
            signers[0].address,
            startDate,
            endDate,
            dummyMetadata,
            [],
            0
          );

        const block = await ethers.provider.getBlock('latest');

        const proposal = await multisig.getProposal(id);
        expect(proposal.executed).to.equal(false);
        expect(proposal.parameters.snapshotBlock).to.equal(block.number - 1);
        expect(proposal.parameters.minApprovals).to.equal(
          multisigSettings.minApprovals
        );
        expect(proposal.allowFailureMap).to.equal(0);
        expect(proposal.parameters.startDate).to.equal(startDate);
        expect(proposal.parameters.endDate).to.equal(endDate);
        expect(proposal.approvals).to.equal(0);
        expect(proposal.actions.length).to.equal(0);

        expect(await multisig.canApprove(id, signers[0].address)).to.be.true;
        expect(await multisig.canApprove(id, signers[1].address)).to.be.false;
      });

      it('creates a proposal successfully and approves if specified', async () => {
        const allowFailureMap = 1;

        await time.setNextBlockTimestamp(startDate);

        await expect(
          multisig.createProposal(
            dummyMetadata,
            [],
            allowFailureMap,
            true,
            false,
            0,
            endDate
          )
        )
          .to.emit(multisig, IPROPOSAL_EVENTS.PROPOSAL_CREATED)
          .withArgs(
            id,
            signers[0].address,
            startDate,
            endDate,
            dummyMetadata,
            [],
            allowFailureMap
          )
          .to.emit(multisig, MULTISIG_EVENTS.APPROVED)
          .withArgs(id, signers[0].address);

        const block = await ethers.provider.getBlock('latest');

        const proposal = await multisig.getProposal(id);
        expect(proposal.executed).to.equal(false);
        expect(proposal.allowFailureMap).to.equal(allowFailureMap);
        expect(proposal.parameters.snapshotBlock).to.equal(block.number - 1);
        expect(proposal.parameters.minApprovals).to.equal(
          multisigSettings.minApprovals
        );
        expect(proposal.parameters.startDate).to.equal(startDate);
        expect(proposal.parameters.endDate).to.equal(endDate);
        expect(proposal.approvals).to.equal(1);
      });

      it('increases the proposal count', async () => {
        expect(await multisig.proposalCount()).to.equal(0);

        await multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          true,
          false,
          0,
          endDate
        );
        expect(await multisig.proposalCount()).to.equal(1);

        await multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          true,
          false,
          0,
          endDate
        );
        expect(await multisig.proposalCount()).to.equal(2);
      });
    });

    it('should revert if startDate is < than now', async () => {
      await multisig.initialize(
        dao.address,
        [signers[0].address], // signers[0] is listed
        multisigSettings
      );

      const currentDate = await time.latest();
      const startDateInThePast = currentDate - 1;
      const endDate = 0; // startDate + minDuration

      await expect(
        multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          true,
          false,
          startDateInThePast,
          endDate
        )
      )
        .to.be.revertedWithCustomError(multisig, 'DateOutOfBounds')
        .withArgs(
          currentDate + 1, // await takes one second
          startDateInThePast
        );
    });

    it('should revert if endDate is < than startDate', async () => {
      await multisig.initialize(
        dao.address,
        [signers[0].address], // signers[0] is listed
        multisigSettings
      );

      const startDate = (await time.latest()) + TIME.MINUTE;
      const endDate = startDate - 1; // endDate < startDate
      await expect(
        multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          true,
          false,
          startDate,
          endDate
        )
      )
        .to.be.revertedWithCustomError(multisig, 'DateOutOfBounds')
        .withArgs(startDate, endDate);
    });
  });

  context('Approving and executing proposals', async () => {
    beforeEach(async () => {
      multisigSettings.minApprovals = 3;
      await multisig.initialize(
        dao.address,
        signers.slice(0, 5).map(s => s.address),
        multisigSettings
      );

      await multisig.createProposal(
        dummyMetadata,
        dummyActions,
        0,
        false,
        false,
        0,
        endDate
      );
    });

    describe('canApprove:', async () => {
      it('returns `false` if the proposal is already executed', async () => {
        await approveWithSigners(multisig, id, signers, [0, 1]);

        await multisig.connect(signers[2]).approve(id, true);
        expect((await multisig.getProposal(id)).executed).to.be.true;

        expect(await multisig.canApprove(id, signers[3].address)).to.be.false;
      });

      it('returns `false` if the approver is not listed', async () => {
        expect(await multisig.isListed(signers[9].address)).to.be.false;

        expect(await multisig.canApprove(id, signers[9].address)).to.be.false;
      });

      it('returns `false` if the approver has already approved', async () => {
        await multisig.connect(signers[0]).approve(id, false);
        expect(await multisig.canApprove(id, signers[0].address)).to.be.false;
      });

      it('returns `true` if the approver is listed', async () => {
        expect(await multisig.canApprove(id, signers[0].address)).to.be.true;
      });

      it("returns `false` if the proposal hasn't started yet", async () => {
        await multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          false,
          false,
          startDate,
          endDate
        );

        expect(await multisig.canApprove(1, signers[0].address)).to.be.false;

        await time.increaseTo(startDate);

        expect(await multisig.canApprove(1, signers[0].address)).to.be.true;
      });

      it('returns `false` if the proposal has ended', async () => {
        await multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          false,
          false,
          0,
          endDate
        );

        expect(await multisig.canApprove(1, signers[0].address)).to.be.true;

        await time.increaseTo(endDate + 1);

        expect(await multisig.canApprove(1, signers[0].address)).to.be.false;
      });
    });

    describe('hasApproved', async () => {
      it("returns `false` if user hasn't approved yet", async () => {
        expect(await multisig.hasApproved(id, signers[0].address)).to.be.false;
      });

      it('returns `true` if user has approved', async () => {
        await multisig.approve(id, true);
        expect(await multisig.hasApproved(id, signers[0].address)).to.be.true;
      });
    });

    describe('approve:', async () => {
      it('reverts when approving multiple times', async () => {
        await multisig.approve(id, true);

        // Try to vote again
        await expect(multisig.approve(id, true))
          .to.be.revertedWithCustomError(multisig, 'ApprovalCastForbidden')
          .withArgs(id, signers[0].address);
      });

      it('reverts if minimal approval is not met yet', async () => {
        const proposal = await multisig.getProposal(id);
        expect(proposal.approvals).to.eq(0);
        await expect(multisig.execute(id))
          .to.be.revertedWithCustomError(multisig, 'ProposalExecutionForbidden')
          .withArgs(id);
      });

      it('approves with the msg.sender address', async () => {
        expect((await multisig.getProposal(id)).approvals).to.equal(0);

        const tx = await multisig.connect(signers[0]).approve(id, false);

        const event = await findEvent<ApprovedEvent>(tx, 'Approved');
        expect(event.args.proposalId).to.eq(id);
        expect(event.args.approver).to.not.eq(multisig.address);
        expect(event.args.approver).to.eq(signers[0].address);

        expect((await multisig.getProposal(id)).approvals).to.equal(1);
      });

      it("reverts if the proposal hasn't started yet", async () => {
        await multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          false,
          false,
          startDate,
          endDate
        );

        await expect(multisig.approve(1, false)).to.be.revertedWithCustomError(
          multisig,
          'ApprovalCastForbidden'
        );

        await time.increaseTo(startDate);

        await expect(multisig.approve(1, false)).not.to.be.reverted;
      });

      it('reverts if the proposal has ended', async () => {
        await multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          false,
          false,
          0,
          endDate
        );

        await expect(multisig.connect(signers[1]).approve(1, false)).not.to.be
          .reverted;

        await time.increaseTo(endDate + 1);

        await expect(multisig.approve(1, false)).to.be.revertedWithCustomError(
          multisig,
          'ApprovalCastForbidden'
        );
      });
    });

    describe('canExecute:', async () => {
      it('returns `false` if the proposal has not reached the minimum approval yet', async () => {
        const proposal = await multisig.getProposal(id);
        expect(proposal.approvals).to.be.lt(proposal.parameters.minApprovals);

        expect(await multisig.canExecute(id)).to.be.false;
      });

      it('returns `false` if the proposal is already executed', async () => {
        await approveWithSigners(multisig, id, signers, [0, 1]);
        await multisig.connect(signers[2]).approve(id, true);

        expect((await multisig.getProposal(id)).executed).to.be.true;

        expect(await multisig.canExecute(id)).to.be.false;
      });

      it('returns `true` if the proposal can be executed', async () => {
        await approveWithSigners(multisig, id, signers, [0, 1, 2]);

        expect((await multisig.getProposal(id)).executed).to.be.false;

        expect(await multisig.canExecute(id)).to.be.true;
      });

      it("returns `false` if the proposal hasn't started yet", async () => {
        await multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          false,
          false,
          startDate,
          endDate
        );

        expect(await multisig.canExecute(1)).to.be.false;

        await time.increaseTo(startDate);
        await multisig.connect(signers[0]).approve(1, false);
        await multisig.connect(signers[1]).approve(1, false);
        await multisig.connect(signers[2]).approve(1, false);

        expect(await multisig.canExecute(1)).to.be.true;
      });

      it('returns `false` if the proposal has ended', async () => {
        await multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          false,
          false,
          0,
          endDate
        );

        await multisig.connect(signers[0]).approve(1, false);
        await multisig.connect(signers[1]).approve(1, false);
        await multisig.connect(signers[2]).approve(1, false);

        expect(await multisig.canExecute(1)).to.be.true;

        await time.increaseTo(endDate + 1);

        expect(await multisig.canExecute(1)).to.be.false;
      });
    });

    describe('execute:', async () => {
      it('reverts if the minimum approval is not met', async () => {
        await expect(multisig.execute(id))
          .to.be.revertedWithCustomError(multisig, 'ProposalExecutionForbidden')
          .withArgs(id);
      });

      it('executes if the minimum approval is met', async () => {
        await approveWithSigners(multisig, id, signers, [0, 1, 2]);

        const proposal = await multisig.getProposal(id);

        expect(proposal.parameters.minApprovals).to.equal(
          multisigSettings.minApprovals
        );
        expect(proposal.approvals).to.be.eq(multisigSettings.minApprovals);

        expect(await multisig.canExecute(id)).to.be.true;
        await expect(multisig.execute(id)).not.to.be.reverted;
      });

      it('executes if the minimum approval is met and can be called by an unlisted accounts', async () => {
        await approveWithSigners(multisig, id, signers, [0, 1, 2]);

        const proposal = await multisig.getProposal(id);

        expect(proposal.parameters.minApprovals).to.equal(
          multisigSettings.minApprovals
        );
        expect(proposal.approvals).to.be.eq(multisigSettings.minApprovals);

        expect(await multisig.canExecute(id)).to.be.true;
        expect(await multisig.isListed(signers[9].address)).to.be.false; // signers[9] is not listed
        await expect(multisig.connect(signers[9]).execute(id)).not.to.be
          .reverted;
      });

      it('executes if the minimum approval is met when multisig with the `tryExecution` option', async () => {
        await multisig.connect(signers[0]).approve(id, true);

        expect(await multisig.canExecute(id)).to.equal(false);

        // `tryExecution` is turned on but the vote is not decided yet
        let tx = await multisig.connect(signers[1]).approve(id, true);
        await expect(
          findEventTopicLog<ExecutedEvent>(
            tx,
            DAO__factory.createInterface(),
            IDAO_EVENTS.EXECUTED
          )
        ).to.rejectedWith(
          `Event "${IDAO_EVENTS.EXECUTED}" could not be found in transaction ${tx.hash}.`
        );

        expect(await multisig.canExecute(id)).to.equal(false);

        // `tryExecution` is turned off and the vote is decided
        tx = await multisig.connect(signers[2]).approve(id, false);
        await expect(
          findEventTopicLog<ExecutedEvent>(
            tx,
            DAO__factory.createInterface(),
            IDAO_EVENTS.EXECUTED
          )
        ).to.rejectedWith(
          `Event "${IDAO_EVENTS.EXECUTED}" could not be found in transaction ${tx.hash}.`
        );

        // `tryEarlyExecution` is turned on and the vote is decided
        tx = await multisig.connect(signers[3]).approve(id, true);
        {
          const event = await findEventTopicLog<ExecutedEvent>(
            tx,
            DAO__factory.createInterface(),
            IDAO_EVENTS.EXECUTED
          );

          expect(event.args.actor).to.equal(multisig.address);
          expect(event.args.callId).to.equal(proposalIdToBytes32(id));
          expect(event.args.actions.length).to.equal(1);
          expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
          expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
          expect(event.args.actions[0].data).to.equal(dummyActions[0].data);
          expect(event.args.execResults).to.deep.equal(['0x']);

          const prop = await multisig.getProposal(id);
          expect(prop.executed).to.equal(true);
        }

        // check for the `ProposalExecuted` event in the multisig contract
        {
          const event = await findEvent<ProposalExecutedEvent>(
            tx,
            IPROPOSAL_EVENTS.PROPOSAL_EXECUTED
          );
          expect(event.args.proposalId).to.equal(id);
        }

        // calling execute again should fail
        await expect(multisig.execute(id))
          .to.be.revertedWithCustomError(multisig, 'ProposalExecutionForbidden')
          .withArgs(id);
      });

      it('emits the `ProposalExecuted` and `Executed` events', async () => {
        await approveWithSigners(multisig, id, signers, [0, 1, 2]);

        await expect(multisig.connect(signers[3]).execute(id))
          .to.emit(dao, IDAO_EVENTS.EXECUTED)
          .to.emit(multisig, IPROPOSAL_EVENTS.PROPOSAL_EXECUTED)
          .to.not.emit(multisig, MULTISIG_EVENTS.APPROVED);
      });

      it('emits the `Approved`, `ProposalExecuted`, and `Executed` events if execute is called inside the `approve` method', async () => {
        await approveWithSigners(multisig, id, signers, [0, 1]);

        await expect(multisig.connect(signers[2]).approve(id, true))
          .to.emit(dao, IDAO_EVENTS.EXECUTED)
          .to.emit(multisig, IPROPOSAL_EVENTS.PROPOSAL_EXECUTED)
          .to.emit(multisig, MULTISIG_EVENTS.APPROVED);
      });

      it("reverts if the proposal hasn't started yet", async () => {
        await multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          false,
          false,
          startDate,
          endDate
        );

        await expect(multisig.execute(1)).to.be.revertedWithCustomError(
          multisig,
          'ProposalExecutionForbidden'
        );

        await time.increaseTo(startDate);

        await multisig.connect(signers[0]).approve(1, false);
        await multisig.connect(signers[1]).approve(1, false);
        await multisig.connect(signers[2]).approve(1, false);

        await expect(multisig.execute(1)).not.to.be.reverted;
      });

      it('reverts if the proposal has ended', async () => {
        await multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          false,
          false,
          0,
          endDate
        );
        await multisig.connect(signers[0]).approve(1, false);
        await multisig.connect(signers[1]).approve(1, false);
        await multisig.connect(signers[2]).approve(1, false);

        await time.increase(10000);
        await expect(
          multisig.connect(signers[1]).execute(1)
        ).to.be.revertedWithCustomError(multisig, 'ProposalExecutionForbidden');
      });
    });
  });
});
