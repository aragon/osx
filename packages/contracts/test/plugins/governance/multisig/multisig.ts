import {expect} from 'chai';
import hre, {ethers} from 'hardhat';
import {Contract, ContractFactory} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  Addresslist__factory,
  DAO,
  DAO__factory,
  IERC165Upgradeable__factory,
  IMembership__factory,
  IMultisig__factory,
  IPlugin__factory,
  IProposal__factory,
  Multisig,
  Multisig__factory,
} from '../../../../typechain';
import {Multisig__factory as Multisig_V1_0_0__factory} from '../../../../typechain/@aragon/osx-v1.0.1/plugins/governance/multisig/Multisig.sol';
import {
  ApprovedEvent,
  ProposalExecutedEvent,
} from '../../../../typechain/Multisig';
import {ProposalCreatedEvent} from '../../../../typechain/IProposal';

import {
  findEvent,
  findEventTopicLog,
  DAO_EVENTS,
  PROPOSAL_EVENTS,
  MULTISIG_EVENTS,
  MEMBERSHIP_EVENTS,
} from '../../../../utils/event';
import {deployNewDAO} from '../../../test-utils/dao';
import {OZ_ERRORS} from '../../../test-utils/error';
import {
  getTime,
  setTimeForNextBlock,
  timestampIn,
  toBytes32,
} from '../../../test-utils/voting';
import {UPGRADE_PERMISSIONS} from '../../../test-utils/permissions';
import {getInterfaceID} from '../../../test-utils/interfaces';
import {
  getProtocolVersion,
  ozUpgradeCheckManagedContract,
} from '../../../test-utils/uups-upgradeable';
import {CURRENT_PROTOCOL_VERSION} from '../../../test-utils/protocol-version';
import {ARTIFACT_SOURCES} from '../../../test-utils/wrapper';
import {skipTestIfNetworkIsZkSync} from '../../../test-utils/skip-functions';

export const multisigInterface = new ethers.utils.Interface([
  'function initialize(address,address[],tuple(bool,uint16))',
  'function updateMultisigSettings(tuple(bool,uint16))',
  'function createProposal(bytes,tuple(address,uint256,bytes)[],uint256,bool,bool,uint64,uint64) ',
  'function getProposal(uint256)',
]);

export type MultisigSettings = {
  minApprovals: number;
  onlyListed: boolean;
};

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

async function advanceTime(time: number) {
  if (hre.network.config.zksync) {
    time = time / 1000;
  }
  await ethers.provider.send('evm_increaseTime', [time]);
  await ethers.provider.send('evm_mine', []);
}

function expectedBlockNumber(blockNumber: number) {
  if (hre.network.config.zksync) {
    return blockNumber - 2;
  }
  return blockNumber - 1;
}

function expectedTime(time: number) {
  if (hre.network.config.zksync) {
    return time + 1;
  }
  return time;
}

describe('Multisig', function () {
  let signers: SignerWithAddress[];
  let multisig: Multisig;
  let dao: DAO;
  let dummyActions: any;
  let dummyMetadata: string;
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
    multisigSettings = {
      minApprovals: 3,
      onlyListed: true,
    };

    multisig = await hre.wrapper.deploy(ARTIFACT_SOURCES.MULTISIG, {
      withProxy: true,
    });

    await dao.grant(
      dao.address,
      multisig.address,
      ethers.utils.id('EXECUTE_PERMISSION')
    );
    await dao.grant(
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
      ).to.be.revertedWith(OZ_ERRORS.ALREADY_INITIALIZED);
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

    skipTestIfNetworkIsZkSync(
      'should revert if members list is longer than uint16 max',
      async () => {
        const megaMember = signers[1];
        const members: string[] = new Array(65537).fill(megaMember.address);
        await expect(
          multisig.initialize(dao.address, members, multisigSettings)
        )
          .to.revertedWithCustomError(multisig, 'AddresslistLengthOutOfBounds')
          .withArgs(65535, members.length);
      }
    );
  });

  describe('Upgrades', () => {
    let legacyContractFactory: ContractFactory;
    let currentContractFactory: ContractFactory;

    before(() => {
      currentContractFactory = new Multisig__factory(signers[0]);
    });

    it('from v1.0.0', async () => {
      legacyContractFactory = new Multisig_V1_0_0__factory(signers[0]);

      const {fromImplementation, toImplementation} =
        await ozUpgradeCheckManagedContract(
          0,
          1,
          dao,
          {
            initArgs: {
              dao: dao.address,
              members: [
                signers[0].address,
                signers[1].address,
                signers[2].address,
              ],
              multisigSettings: multisigSettings,
            },
            initializer: 'initialize',
          },
          ARTIFACT_SOURCES.MULTISIG_V1_0_0,
          ARTIFACT_SOURCES.MULTISIG,
          UPGRADE_PERMISSIONS.UPGRADE_PLUGIN_PERMISSION_ID
        );

      const fromProtocolVersion = await getProtocolVersion(
        legacyContractFactory.attach(fromImplementation)
      );
      const toProtocolVersion = await getProtocolVersion(
        currentContractFactory.attach(toImplementation)
      );

      expect(fromProtocolVersion).to.deep.equal(toProtocolVersion); // The contracts inherited from OSx did not change from 1.0.0 to the current version
      expect(fromProtocolVersion).to.deep.equal([1, 0, 0]);
      expect(toProtocolVersion).to.not.deep.equal(CURRENT_PROTOCOL_VERSION);
    });
  });

  describe('plugin interface: ', async () => {
    it('does not support the empty interface', async () => {
      expect(await multisig.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165Upgradeable` interface', async () => {
      const iface = IERC165Upgradeable__factory.createInterface();
      expect(await multisig.supportsInterface(getInterfaceID(iface))).to.be
        .true;
    });

    it('supports the `IPlugin` interface', async () => {
      const iface = IPlugin__factory.createInterface();
      expect(await multisig.supportsInterface(getInterfaceID(iface))).to.be
        .true;
    });

    it('supports the `IProposal` interface', async () => {
      const iface = IProposal__factory.createInterface();
      expect(await multisig.supportsInterface(getInterfaceID(iface))).to.be
        .true;
    });

    it('supports the `IMembership` interface', async () => {
      const iface = IMembership__factory.createInterface();
      expect(await multisig.supportsInterface(getInterfaceID(iface))).to.be
        .true;
    });

    it('supports the `Addresslist` interface', async () => {
      const iface = Addresslist__factory.createInterface();
      expect(await multisig.supportsInterface(getInterfaceID(iface))).to.be
        .true;
    });

    it('supports the `IMultisig` interface', async () => {
      const iface = IMultisig__factory.createInterface();
      expect(await multisig.supportsInterface(getInterfaceID(iface))).to.be
        .true;
    });

    it('supports the `Multisig` interface', async () => {
      expect(
        await multisig.supportsInterface(getInterfaceID(multisigInterface))
      ).to.be.true;
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
        .to.emit(multisig, MEMBERSHIP_EVENTS.MEMBERS_ADDED)
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
        .to.emit(multisig, MEMBERSHIP_EVENTS.MEMBERS_REMOVED)
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
          await timestampIn(1000)
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
        await timestampIn(1000)
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
          await timestampIn(1000)
        )
      ).not.to.be.reverted;

      const proposalId1 = await multisig.callStatic.createProposal(
        dummyMetadata,
        dummyActions,
        0,
        false,
        false,
        0,
        await timestampIn(1000)
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

      const startDate = await timestampIn(1000);
      const endDate = await timestampIn(5000);
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
        .to.emit(multisig, PROPOSAL_EVENTS.PROPOSAL_CREATED)
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

    skipTestIfNetworkIsZkSync(
      'reverts if the multisig settings have been changed in the same block',
      async () => {
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

        const endDate = await timestampIn(5000);

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
      }
    );

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
        const startDate = await timestampIn(1000);
        const endDate = await timestampIn(5000);

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
          .to.emit(multisig, PROPOSAL_EVENTS.PROPOSAL_CREATED)
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
            .createProposal(
              dummyMetadata,
              [],
              0,
              false,
              false,
              0,
              await timestampIn(1000)
            )
        )
          .to.be.revertedWithCustomError(multisig, 'ProposalCreationForbidden')
          .withArgs(signers[1].address);

        await expect(
          multisig
            .connect(signers[0])
            .createProposal(
              dummyMetadata,
              [],
              0,
              false,
              false,
              0,
              await timestampIn(1000)
            )
        ).not.to.be.reverted;
      });

      skipTestIfNetworkIsZkSync(
        'reverts if `_msgSender` is not listed in the current block although he was listed in the last block',
        async () => {
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
              .createProposal(
                dummyMetadata,
                [],
                0,
                false,
                false,
                0,
                await timestampIn(1000)
              )
          )
            .to.be.revertedWithCustomError(
              multisig,
              'ProposalCreationForbidden'
            )
            .withArgs(signers[0].address);

          // Transaction 4: Create the proposal as signers[1]
          const tx4 = await multisig
            .connect(signers[1])
            .createProposal(
              dummyMetadata,
              [],
              0,
              false,
              false,
              0,
              await timestampIn(1000)
            );

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
        }
      );

      it('creates a proposal successfully and does not approve if not specified', async () => {
        const startDate = await timestampIn(1000);
        const endDate = await timestampIn(5000);

        await ethers.provider.send('evm_setNextBlockTimestamp', [startDate]);

        // on zksync, even though evm_setNextBlockTimestamp sets the timestamp to our desired value,
        // once the transaction is being made, timestamp on the smart contract is equal to our value + 1,
        // whereas on hardhat, it's the same value that we set. So, we must pass startDate + 1 to avoid
        // the "if(startDate < block.timestamp) { revert ... }" error.
        await expect(
          multisig.createProposal(
            dummyMetadata,
            [],
            0,
            false,
            false,
            startDate + 1,
            endDate
          )
        )
          .to.emit(multisig, PROPOSAL_EVENTS.PROPOSAL_CREATED)
          .withArgs(
            id,
            signers[0].address,
            startDate + 1,
            endDate,
            dummyMetadata,
            [],
            0
          );

        const block = await ethers.provider.getBlock('latest');

        const proposal = await multisig.getProposal(id);
        expect(proposal.executed).to.equal(false);

        expect(proposal.parameters.snapshotBlock).to.equal(
          expectedBlockNumber(block.number)
        );

        expect(proposal.parameters.minApprovals).to.equal(
          multisigSettings.minApprovals
        );
        expect(proposal.allowFailureMap).to.equal(0);
        expect(proposal.parameters.startDate).to.equal(startDate + 1);
        expect(proposal.parameters.endDate).to.equal(endDate);
        expect(proposal.approvals).to.equal(0);
        expect(proposal.actions.length).to.equal(0);

        await ethers.provider.send('evm_mine', []);

        expect(await multisig.canApprove(id, signers[0].address)).to.be.true;
        expect(await multisig.canApprove(id, signers[1].address)).to.be.false;
      });

      it('creates a proposal successfully and approves if specified', async () => {
        const startDate = await timestampIn(3000);
        const endDate = await timestampIn(5000);

        const allowFailureMap = 1;

        await ethers.provider.send('evm_setNextBlockTimestamp', [startDate]);

        const expectedStartDate = expectedTime(startDate);
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
          .to.emit(multisig, PROPOSAL_EVENTS.PROPOSAL_CREATED)
          .withArgs(
            id,
            signers[0].address,
            expectedStartDate,
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
        expect(proposal.parameters.snapshotBlock).to.equal(
          expectedBlockNumber(block.number)
        );
        expect(proposal.parameters.minApprovals).to.equal(
          multisigSettings.minApprovals
        );
        expect(proposal.parameters.startDate).to.equal(expectedStartDate);
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
          await timestampIn(5000)
        );
        expect(await multisig.proposalCount()).to.equal(1);

        await multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          true,
          false,
          0,
          await timestampIn(5000)
        );
        expect(await multisig.proposalCount()).to.equal(2);
      });
    });

    it('should revert if startDate is < than now', async () => {
      const blockTimestamp = (await getTime()) + 20;
      await setTimeForNextBlock(blockTimestamp);

      const expectedTimestamp = expectedTime(blockTimestamp);

      await expect(
        multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          true,
          false,
          5,
          0
        )
      )
        .to.be.revertedWithCustomError(multisig, 'DateOutOfBounds')
        .withArgs(expectedTimestamp, 5);
    });

    it('should revert if endDate is < than startDate', async () => {
      // set next block time & mine a block with this time.
      const nextBlockTime = (await getTime()) + 500;

      await setTimeForNextBlock(nextBlockTime);

      // set next block's timestamp
      let nextTimeStamp = nextBlockTime + 500;
      await setTimeForNextBlock(nextTimeStamp);

      const expectedTimestamp = expectedTime(nextTimeStamp);
      await expect(
        multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          true,
          false,
          0,
          5
        )
      )
        .to.be.revertedWithCustomError(multisig, 'DateOutOfBounds')
        .withArgs(expectedTimestamp, 5);
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
        await timestampIn(1000)
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
          await timestampIn(2000),
          await timestampIn(5000)
        );

        expect(await multisig.canApprove(1, signers[0].address)).to.be.false;

        await advanceTime(2000);

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
          await timestampIn(5000)
        );

        expect(await multisig.canApprove(1, signers[0].address)).to.be.true;

        await advanceTime(5000);

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
          await timestampIn(5000),
          await timestampIn(10000)
        );

        await expect(multisig.approve(1, false)).to.be.revertedWithCustomError(
          multisig,
          'ApprovalCastForbidden'
        );

        await advanceTime(7000);

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
          await timestampIn(5000)
        );
        await advanceTime(2000);

        await expect(multisig.connect(signers[1]).approve(1, false)).not.to.be
          .reverted;

        await advanceTime(10000);

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
          await timestampIn(1000),
          await timestampIn(10000)
        );

        expect(await multisig.canExecute(1)).to.be.false;

        await advanceTime(2000);
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
          await timestampIn(5000)
        );

        await advanceTime(2000);

        await multisig.connect(signers[0]).approve(1, false);
        await multisig.connect(signers[1]).approve(1, false);
        await multisig.connect(signers[2]).approve(1, false);

        expect(await multisig.canExecute(1)).to.be.true;

        await advanceTime(5000);

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
            DAO_EVENTS.EXECUTED
          )
        ).to.rejectedWith('No logs found for the topic of event "Executed".');

        expect(await multisig.canExecute(id)).to.equal(false);

        // `tryExecution` is turned off and the vote is decided
        tx = await multisig.connect(signers[2]).approve(id, false);
        await expect(
          findEventTopicLog<ExecutedEvent>(
            tx,
            DAO__factory.createInterface(),
            DAO_EVENTS.EXECUTED
          )
        ).to.rejectedWith('No logs found for the topic of event "Executed".');

        // `tryEarlyExecution` is turned on and the vote is decided
        tx = await multisig.connect(signers[3]).approve(id, true);
        {
          const event = await findEventTopicLog<ExecutedEvent>(
            tx,
            DAO__factory.createInterface(),
            DAO_EVENTS.EXECUTED
          );

          expect(event.args.actor).to.equal(multisig.address);
          expect(event.args.callId).to.equal(toBytes32(id));
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
            PROPOSAL_EVENTS.PROPOSAL_EXECUTED
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
          .to.emit(dao, DAO_EVENTS.EXECUTED)
          .to.emit(multisig, PROPOSAL_EVENTS.PROPOSAL_EXECUTED)
          .to.not.emit(multisig, MULTISIG_EVENTS.APPROVED);
      });

      it('emits the `Approved`, `ProposalExecuted`, and `Executed` events if execute is called inside the `approve` method', async () => {
        await approveWithSigners(multisig, id, signers, [0, 1]);

        await expect(multisig.connect(signers[2]).approve(id, true))
          .to.emit(dao, DAO_EVENTS.EXECUTED)
          .to.emit(multisig, PROPOSAL_EVENTS.PROPOSAL_EXECUTED)
          .to.emit(multisig, MULTISIG_EVENTS.APPROVED);
      });

      it("reverts if the proposal hasn't started yet", async () => {
        await multisig.createProposal(
          dummyMetadata,
          dummyActions,
          0,
          false,
          false,
          await timestampIn(1000),
          await timestampIn(5000)
        );

        await expect(multisig.execute(1)).to.be.revertedWithCustomError(
          multisig,
          'ProposalExecutionForbidden'
        );

        await advanceTime(2000);

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
          await timestampIn(5000)
        );
        await multisig.connect(signers[0]).approve(1, false);
        await multisig.connect(signers[1]).approve(1, false);
        await multisig.connect(signers[2]).approve(1, false);

        await advanceTime(10000);
        await expect(
          multisig.connect(signers[1]).execute(1)
        ).to.be.revertedWithCustomError(multisig, 'ProposalExecutionForbidden');
      });
    });
  });
});
