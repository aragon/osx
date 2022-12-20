import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {DAO} from '../../typechain';
import {findEvent, DAO_EVENTS, VOTING_EVENTS} from '../../utils/event';
import {getMergedABI} from '../../utils/abi';
import {customError, ERRORS} from '../test-utils/custom-error-helper';
import {BigNumber} from 'ethers';

describe('Multisig', function () {
  let signers: SignerWithAddress[];
  let multisig: any;
  let dao: DAO;
  let dummyActions: any;
  let dummyMetadata: string;

  let minApprovals: number;

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

    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize(
      '0x',
      signers[0].address,
      ethers.constants.AddressZero
    );
  });

  beforeEach(async () => {
    minApprovals = 3;

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
      await multisig.initialize(dao.address, minApprovals, addresslist(5));

      await expect(
        multisig.initialize(dao.address, minApprovals, addresslist(5))
      ).to.be.revertedWith(ERRORS.ALREADY_INITIALIZED);
    });
  });

  describe('updateMinApprovals: ', async () => {
    beforeEach(async () => {
      minApprovals = 1;
      await multisig.initialize(dao.address, minApprovals, addresslist(3));
    });

    it('reverts for a minimum approval of 0', async () => {
      await expect(multisig.updateMinApprovals(0)).to.be.revertedWith(
        customError('MinApprovalsOutOfBounds', 1, 0)
      );
    });

    it('reverts if minimum approval is larger than the address list length', async () => {
      let addresslistLength: BigNumber = await multisig.addresslistLength();
      await expect(
        multisig.updateMinApprovals(addresslistLength.add(1))
      ).to.be.revertedWith(
        customError(
          'MinApprovalsOutOfBounds',
          addresslistLength,
          addresslistLength.add(1)
        )
      );
    });

    it('changes the minimum approval parameter', async () => {
      let addresslistLength: BigNumber = await multisig.addresslistLength();

      expect(await multisig.minApprovals()).to.not.eq(addresslistLength);

      await expect(multisig.updateMinApprovals(addresslistLength)).to.not.be
        .reverted;

      expect(await multisig.minApprovals()).to.eq(addresslistLength);
    });
  });

  describe('Addresslisting members: ', async () => {
    it('should return false, if a user is not listed', async () => {
      minApprovals = 1;
      await multisig.initialize(dao.address, minApprovals, addresslist(1));

      const block1 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(
        await multisig.isListedAtBlock(signers[9].address, block1.number)
      ).to.equal(false);
    });

    it('should add new members to the address list', async () => {
      minApprovals = 1;
      await multisig.initialize(dao.address, minApprovals, addresslist(1));

      const block1 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(
        await multisig.isListedAtBlock(signers[0].address, block1.number)
      ).to.equal(true);
      expect(
        await multisig.isListedAtBlock(signers[1].address, block1.number)
      ).to.equal(false);

      // add a new member
      await multisig.addAddresses([signers[1].address]);

      const block2 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(
        await multisig.isListedAtBlock(signers[0].address, block2.number)
      ).to.equal(true);
      expect(
        await multisig.isListedAtBlock(signers[1].address, block2.number)
      ).to.equal(true);
    });

    it('should remove users from the address list', async () => {
      minApprovals = 1;
      await multisig.initialize(dao.address, minApprovals, addresslist(2));

      const block1 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(
        await multisig.isListedAtBlock(signers[0].address, block1.number)
      ).to.equal(true);
      expect(
        await multisig.isListedAtBlock(signers[1].address, block1.number)
      ).to.equal(true);

      // remove an existing member
      await multisig.removeAddresses([signers[1].address]);

      const block2 = await ethers.provider.getBlock('latest');
      await ethers.provider.send('evm_mine', []);
      expect(
        await multisig.isListedAtBlock(signers[0].address, block2.number)
      ).to.equal(true);
      expect(
        await multisig.isListedAtBlock(signers[1].address, block2.number)
      ).to.equal(false);
    });

    it('reverts if the address list would become empty', async () => {
      minApprovals = 1;
      await multisig.initialize(dao.address, minApprovals, addresslist(1));

      await expect(
        multisig.removeAddresses([signers[0].address])
      ).to.be.revertedWith(
        customError(
          'MinApprovalsOutOfBounds',
          (await multisig.addresslistLength()) - 1,
          minApprovals
        )
      );
    });

    it('reverts if the address list would become shorter than the current minimum approval parameter requires', async () => {
      minApprovals = 2;
      await multisig.initialize(dao.address, minApprovals, addresslist(3));

      await expect(multisig.removeAddresses([signers[1].address])).to.not.be
        .reverted;

      await expect(
        multisig.removeAddresses([signers[2].address])
      ).to.be.revertedWith(
        customError(
          'MinApprovalsOutOfBounds',
          (await multisig.addresslistLength()) - 1,
          minApprovals
        )
      );
    });
  });

  describe('Proposal creation', async () => {
    beforeEach(async () => {
      minApprovals = 1;
    });

    it('reverts if the user is not allowed to create a proposal', async () => {
      await multisig.initialize(
        dao.address,
        minApprovals,
        addresslist(1) // signers[0] is listed
      );

      await expect(
        multisig
          .connect(signers[1])
          .createProposal(dummyMetadata, [], false, false)
      ).to.be.revertedWith(
        customError('ProposalCreationForbidden', signers[1].address)
      );

      await expect(
        multisig
          .connect(signers[0])
          .createProposal(dummyMetadata, [], false, false)
      ).to.not.be.reverted;
    });

    it('creates a proposal successfully and does not approve if not specified', async () => {
      await multisig.initialize(dao.address, minApprovals, addresslist(1));

      expect(
        await multisig.createProposal(dummyMetadata, dummyActions, false, false)
      )
        .to.emit(multisig, VOTING_EVENTS.PROPOSAL_CREATED)
        .withArgs(id, signers[0].address, dummyMetadata);

      const block = await ethers.provider.getBlock('latest');

      const proposal = await multisig.getProposal(id);
      expect(proposal.executed).to.equal(false);
      expect(proposal.parameters.snapshotBlock).to.equal(block.number - 1);
      expect(proposal.parameters.minApprovals).to.equal(minApprovals);

      expect(proposal.tally.approvals).to.equal(0);
      expect(proposal.tally.addresslistLength).to.equal(1);

      expect(await multisig.canApprove(id, signers[0].address)).to.equal(true);
      expect(await multisig.canApprove(id, signers[1].address)).to.equal(false);
      expect(await multisig.canApprove(1, signers[0].address)).to.equal(false);

      expect(proposal.actions.length).to.equal(1);
      expect(proposal.actions[0].to).to.equal(dummyActions[0].to);
      expect(proposal.actions[0].value).to.equal(dummyActions[0].value);
      expect(proposal.actions[0].data).to.equal(dummyActions[0].data);
    });

    it('creates a proposal successfully and approves if specified', async () => {
      await multisig.initialize(dao.address, minApprovals, addresslist(1));

      expect(
        await multisig.createProposal(dummyMetadata, dummyActions, true, false)
      )
        .to.emit(multisig, VOTING_EVENTS.PROPOSAL_CREATED)
        .withArgs(id, signers[0].address, dummyMetadata)
        .to.emit(multisig, 'Approved')
        .withArgs(id, signers[0].address);

      const block = await ethers.provider.getBlock('latest');
      const proposal = await multisig.getProposal(id);
      expect(proposal.open).to.equal(true);
      expect(proposal.executed).to.equal(false);
      expect(proposal.parameters.snapshotBlock).to.equal(block.number - 1);
      expect(proposal.parameters.minApprovals).to.equal(minApprovals);

      expect(proposal.tally.approvals).to.equal(1);
    });
  });

  describe('Proposal + Execute:', async () => {
    beforeEach(async () => {
      await multisig.initialize(dao.address, minApprovals, addresslist(10));

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

    it('reverts when approving multiple times', async () => {
      await multisig.approve(id, true);

      // Try to vote again
      await expect(multisig.approve(id, true)).to.be.revertedWith(
        customError('ApprovalCastForbidden', id, signers[0].address)
      );
    });

    it('reverts if minimal approval is not met yet', async () => {
      expect(await multisig.approvals(id)).to.eq(0);
      await expect(multisig.execute(id)).to.be.revertedWith(
        customError('ProposalExecutionForbidden', id)
      );
    });

    it('approves with the msg.sender address', async () => {
      let tx = await multisig.connect(signers[0]).approve(id, false);

      const event = await findEvent(tx, 'Approved');
      expect(event.args.proposalId).to.eq(id);
      expect(event.args.approver).to.not.eq(multisig.address);
      expect(event.args.approver).to.eq(signers[0].address);

      const prop = await multisig.getProposal(id);
      expect(prop.tally.approvals).to.equal(1);
    });

    it('executes if the minimum approval is met', async () => {
      await multisig.connect(signers[0]).approve(id, false);
      await multisig.connect(signers[1]).approve(id, false);
      await multisig.connect(signers[2]).approve(id, false);

      const proposal = await multisig.getProposal(id);

      expect(proposal.parameters.minApprovals).to.equal(minApprovals);
      expect(await multisig.approvals(id)).to.be.eq(minApprovals);

      expect(await multisig.canExecute(id)).to.equal(true);
      await expect(multisig.execute(id)).to.not.be.reverted;
    });

    it('executes  if the minimum approval is met when voting with the `tryExecution` option', async () => {
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
        const event = await findEvent(tx, VOTING_EVENTS.PROPOSAL_EXECUTED);
        expect(event.args.proposalId).to.equal(id);
      }

      // calling execute again should fail
      await expect(multisig.execute(id)).to.be.revertedWith(
        customError('ProposalExecutionForbidden', id)
      );
    });
  });
});
