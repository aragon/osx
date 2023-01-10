import {expect} from 'chai';
import {ethers} from 'hardhat';
import {Contract} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {DAO} from '../../typechain';
import {
  findEvent,
  DAO_EVENTS,
  PROPOSAL_EVENTS,
  MULTISIG_EVENTS,
} from '../../utils/event';
import {getMergedABI} from '../../utils/abi';
import {deployNewDAO} from '../test-utils/dao';
import {OZ_ERRORS} from '../test-utils/error';

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

describe('Multisig', function () {
  let signers: SignerWithAddress[];
  let multisig: any;
  let dao: DAO;
  let dummyActions: any;
  let dummyMetadata: string;
  let multisigSettings: MultisigSettings;

  const id = 0;

  let mergedAbi: any;
  let multisigFactoryBytecode: any;

  before(async () => {
    signers = await ethers.getSigners();

    ({abi: mergedAbi, bytecode: multisigFactoryBytecode} = await getMergedABI(
      // @ts-ignore
      hre,
      'Multisig',
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

  beforeEach(async () => {
    multisigSettings = {
      minApprovals: 3,
      onlyListed: true,
    };

    const MultisigFactory = new ethers.ContractFactory(
      mergedAbi,
      multisigFactoryBytecode,
      signers[0]
    );
    multisig = await MultisigFactory.deploy();

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

  describe('addAddresses:', async () => {
    it('should add new members to the address list', async () => {
      multisigSettings.minApprovals = 1;
      await multisig.initialize(
        dao.address,
        [signers[0].address],
        multisigSettings
      );

      expect(await multisig.isListed(signers[0].address)).to.equal(true);
      expect(await multisig.isListed(signers[1].address)).to.equal(false);

      // add a new member
      await multisig.addAddresses([signers[1].address]);

      expect(await multisig.isListed(signers[0].address)).to.equal(true);
      expect(await multisig.isListed(signers[1].address)).to.equal(true);
    });
  });

  describe('removeAddresses:', async () => {
    it('should remove users from the address list', async () => {
      multisigSettings.minApprovals = 1;
      await multisig.initialize(
        dao.address,
        signers.slice(0, 2).map(s => s.address),
        multisigSettings
      );

      expect(await multisig.isListed(signers[0].address)).to.equal(true);
      expect(await multisig.isListed(signers[1].address)).to.equal(true);

      // remove an existing member
      await multisig.removeAddresses([signers[1].address]);

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
          (await multisig.addresslistLength()) - 1,
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

      await expect(multisig.removeAddresses([signers[1].address])).to.not.be
        .reverted;

      await expect(multisig.removeAddresses([signers[2].address]))
        .to.be.revertedWithCustomError(multisig, 'MinApprovalsOutOfBounds')
        .withArgs(
          (await multisig.addresslistLength()) - 1,
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
        multisig.createProposal(dummyMetadata, dummyActions, false, false)
      ).to.not.be.reverted;

      expect(await multisig.proposalCount()).to.equal(1);
    });

    it('creates unique proposal IDs for each proposal', async () => {
      await multisig.initialize(
        dao.address,
        [signers[0].address], // signers[0] is listed
        multisigSettings
      );
      await ethers.provider.send('evm_mine', []);

      let proposalId0 = await multisig.callStatic.createProposal(
        dummyMetadata,
        dummyActions,
        false,
        false
      );
      // create a new proposal for the proposalCounter to be incremented
      await expect(
        multisig.createProposal(dummyMetadata, dummyActions, false, false)
      ).to.not.be.reverted;

      let proposalId1 = await multisig.callStatic.createProposal(
        dummyMetadata,
        dummyActions,
        false,
        false
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

      await expect(
        multisig
          .connect(signers[0])
          .createProposal(dummyMetadata, [], false, false)
      )
        .to.emit(multisig, PROPOSAL_EVENTS.PROPOSAL_CREATED)
        .withArgs(id, signers[0].address, dummyMetadata, []);
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
            .createProposal(dummyMetadata, [], false, false)
        )
          .to.emit(multisig, PROPOSAL_EVENTS.PROPOSAL_CREATED)
          .withArgs(id, signers[1].address, dummyMetadata, []);
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
            .createProposal(dummyMetadata, [], false, false)
        )
          .to.be.revertedWithCustomError(multisig, 'ProposalCreationForbidden')
          .withArgs(signers[1].address);

        await expect(
          multisig
            .connect(signers[0])
            .createProposal(dummyMetadata, [], false, false)
        ).to.not.be.reverted;
      });

      it('creates a proposal successfully and does not approve if not specified', async () => {
        await expect(multisig.createProposal(dummyMetadata, [], false, false))
          .to.emit(multisig, PROPOSAL_EVENTS.PROPOSAL_CREATED)
          .withArgs(id, signers[0].address, dummyMetadata, []);

        const block = await ethers.provider.getBlock('latest');

        const proposal = await multisig.getProposal(id);
        expect(proposal.executed).to.equal(false);
        expect(proposal.parameters.snapshotBlock).to.equal(block.number - 1);
        expect(proposal.parameters.minApprovals).to.equal(
          multisigSettings.minApprovals
        );
        expect(proposal.tally.approvals).to.equal(0);
        expect(proposal.tally.addresslistLength).to.equal(1);
        expect(proposal.actions.length).to.equal(0);

        expect(await multisig.canApprove(id, signers[0].address)).to.be.true;
        expect(await multisig.canApprove(id, signers[1].address)).to.be.false;
      });

      it('creates a proposal successfully and approves if specified', async () => {
        await expect(multisig.createProposal(dummyMetadata, [], true, false))
          .to.emit(multisig, PROPOSAL_EVENTS.PROPOSAL_CREATED)
          .withArgs(id, signers[0].address, dummyMetadata, [])
          .to.emit(multisig, MULTISIG_EVENTS.APPROVED)
          .withArgs(id, signers[0].address);

        const block = await ethers.provider.getBlock('latest');
        const proposal = await multisig.getProposal(id);
        expect(proposal.open).to.equal(true);
        expect(proposal.executed).to.equal(false);
        expect(proposal.parameters.snapshotBlock).to.equal(block.number - 1);
        expect(proposal.parameters.minApprovals).to.equal(
          multisigSettings.minApprovals
        );

        expect(proposal.tally.approvals).to.equal(1);
      });

      it('increases the proposal count', async () => {
        expect(await multisig.proposalCount()).to.equal(0);

        await multisig.createProposal(dummyMetadata, dummyActions, true, false);
        expect(await multisig.proposalCount()).to.equal(1);

        await multisig.createProposal(dummyMetadata, dummyActions, true, false);
        expect(await multisig.proposalCount()).to.equal(2);
      });
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

      expect(
        (
          await multisig.createProposal(
            dummyMetadata,
            dummyActions,
            false,
            false
          )
        ).value
      ).to.equal(id);
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
        expect(await multisig.approvals(id)).to.eq(0);
        await expect(multisig.execute(id))
          .to.be.revertedWithCustomError(multisig, 'ProposalExecutionForbidden')
          .withArgs(id);
      });

      it('approves with the msg.sender address', async () => {
        expect((await multisig.getProposal(id)).tally.approvals).to.equal(0);

        let tx = await multisig.connect(signers[0]).approve(id, false);

        const event = await findEvent(tx, 'Approved');
        expect(event.args.proposalId).to.eq(id);
        expect(event.args.approver).to.not.eq(multisig.address);
        expect(event.args.approver).to.eq(signers[0].address);

        expect((await multisig.getProposal(id)).tally.approvals).to.equal(1);
      });
    });

    describe('canExecute:', async () => {
      it('returns `false` if the proposal has not reached the minimum approval yet', async () => {
        expect(await multisig.approvals(id)).to.be.lt(
          (await multisig.getProposal(id)).parameters.minApprovals
        );

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
        expect(await multisig.approvals(id)).to.be.eq(
          multisigSettings.minApprovals
        );

        expect(await multisig.canExecute(id)).to.be.true;
        await expect(multisig.execute(id)).to.not.be.reverted;
      });

      it('executes if the minimum approval is met and can be called by an unlisted accounts', async () => {
        await approveWithSigners(multisig, id, signers, [0, 1, 2]);

        const proposal = await multisig.getProposal(id);

        expect(proposal.parameters.minApprovals).to.equal(
          multisigSettings.minApprovals
        );
        expect(await multisig.approvals(id)).to.be.eq(
          multisigSettings.minApprovals
        );

        expect(await multisig.canExecute(id)).to.be.true;
        expect(await multisig.isListed(signers[9].address)).to.be.false; // signers[9] is not listed
        await expect(multisig.connect(signers[9]).execute(id)).to.not.be
          .reverted;
      });

      it('executes if the minimum approval is met when voting with the `tryExecution` option', async () => {
        await multisig.connect(signers[0]).approve(id, true);

        expect(await multisig.canExecute(id)).to.equal(false);

        // `tryExecution` is turned on but the vote is not decided yet
        let tx = await multisig.connect(signers[1]).approve(id, true);
        expect(await findEvent(tx, DAO_EVENTS.EXECUTED)).to.be.undefined;

        expect(await multisig.canExecute(id)).to.equal(false);

        // `tryExecution` is turned off and the vote is decided
        tx = await multisig.connect(signers[2]).approve(id, false);
        expect(await findEvent(tx, DAO_EVENTS.EXECUTED)).to.be.undefined;

        // `tryEarlyExecution` is turned on and the vote is decided
        tx = await multisig.connect(signers[3]).approve(id, true);
        {
          const event = await findEvent(tx, DAO_EVENTS.EXECUTED);

          expect(event.args.actor).to.equal(multisig.address);
          expect(event.args.callId).to.equal(id);
          expect(event.args.actions.length).to.equal(1);
          expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
          expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
          expect(event.args.actions[0].data).to.equal(dummyActions[0].data);
          expect(event.args.execResults).to.deep.equal(['0x']);

          const prop = await multisig.getProposal(id);
          expect(prop.executed).to.equal(true);
        }

        // check for the `ProposalExecuted` event in the voting contract
        {
          const event = await findEvent(tx, PROPOSAL_EVENTS.PROPOSAL_EXECUTED);
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
    });
  });
});
