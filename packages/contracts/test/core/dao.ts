import {expect} from 'chai';
import {ethers} from 'hardhat';
import {ERRORS, customError} from '../test-utils/custom-error-helper';

import {DAO, GovernanceERC20} from '../../typechain';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

const dummyAddress1 = '0x0000000000000000000000000000000000000001';
const dummyAddress2 = '0x0000000000000000000000000000000000000002';
const dummyMetadata1 = '0x0001';
const dummyMetadata2 = '0x0002';

const EVENTS = {
  MetadataSet: 'MetadataSet',
  TrustedForwarderSet: 'TrustedForwarderSet',
  ConfigUpdated: 'ConfigUpdated',
  DAOCreated: 'DAOCreated',
  Granted: 'Granted',
  Revoked: 'Revoked',
  Deposited: 'Deposited',
  Withdrawn: 'Withdrawn',
  Executed: 'Executed',
  ETHDeposited: 'ETHDeposited',
};

const ROLES = {
  UPGRADE_ROLE: ethers.utils.id('UPGRADE_ROLE'),
  DAO_CONFIG_ROLE: ethers.utils.id('DAO_CONFIG_ROLE'),
  EXEC_ROLE: ethers.utils.id('EXEC_ROLE'),
  WITHDRAW_ROLE: ethers.utils.id('WITHDRAW_ROLE'),
  SET_SIGNATURE_VALIDATOR_ROLE: ethers.utils.id('SET_SIGNATURE_VALIDATOR_ROLE'),
  MODIFY_TRUSTED_FORWARDER: ethers.utils.id('MODIFY_TRUSTED_FORWARDER'),
  TOKEN_MINTER_ROLE: ethers.utils.id('TOKEN_MINTER_ROLE'),
};

describe('DAO', function () {
  let signers: SignerWithAddress[];
  let ownerAddress: string;
  let dao: DAO;
  let token: GovernanceERC20;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize(dummyMetadata1, ownerAddress, dummyAddress1);

    const Token = await ethers.getContractFactory('GovernanceERC20');
    token = await Token.deploy();
    await token.initialize(dao.address, 'GOV', 'GOV');

    // Grant Roles
    await Promise.all([
      dao.grant(dao.address, ownerAddress, ROLES.DAO_CONFIG_ROLE),
      dao.grant(dao.address, ownerAddress, ROLES.EXEC_ROLE),
      dao.grant(dao.address, ownerAddress, ROLES.WITHDRAW_ROLE),
      dao.grant(dao.address, ownerAddress, ROLES.UPGRADE_ROLE),
      dao.grant(dao.address, ownerAddress, ROLES.SET_SIGNATURE_VALIDATOR_ROLE),
      dao.grant(dao.address, ownerAddress, ROLES.MODIFY_TRUSTED_FORWARDER),
      dao.grant(token.address, ownerAddress, ROLES.TOKEN_MINTER_ROLE),
    ]);
  });

  describe('initialize', async () => {
    it('reverts if trying to re-initialize', async () => {
      await expect(
        dao.initialize(dummyMetadata1, ownerAddress, dummyAddress1)
      ).to.be.revertedWith(ERRORS.ALREADY_INITIALIZED);
    });

    it('sets the trusted forwarder correctly', async () => {
      expect(await dao.trustedForwarder()).to.be.equal(dummyAddress1);
    });
  });

  describe('setTrustedForwarder:', async () => {
    it('reverts if the sender lacks the required role', async () => {
      await dao.revoke(
        dao.address,
        ownerAddress,
        ROLES.MODIFY_TRUSTED_FORWARDER
      );

      await expect(dao.setTrustedForwarder(dummyAddress2)).to.be.revertedWith(
        customError(
          'ACLAuth',
          dao.address,
          dao.address,
          ownerAddress,
          ROLES.MODIFY_TRUSTED_FORWARDER
        )
      );
    });

    it('sets a new trusted forwarder', async () => {
      await dao.setTrustedForwarder(dummyAddress2);
      expect(await dao.trustedForwarder()).to.be.equal(dummyAddress2);
    });

    it('emits an event containing the address', async () => {
      expect(await dao.setTrustedForwarder(dummyAddress2))
        .to.emit(dao, EVENTS.TrustedForwarderSet)
        .withArgs(dummyAddress2);
    });
  });

  describe('setMetadata:', async () => {
    it('reverts if the sender lacks the required role', async () => {
      await dao.revoke(dao.address, ownerAddress, ROLES.DAO_CONFIG_ROLE);

      await expect(dao.setMetadata(dummyMetadata1)).to.be.revertedWith(
        customError(
          'ACLAuth',
          dao.address,
          dao.address,
          ownerAddress,
          ROLES.DAO_CONFIG_ROLE
        )
      );
    });

    it('sets new metadata via an event', async () => {
      expect(await dao.setMetadata(dummyMetadata2))
        .to.emit(dao, EVENTS.MetadataSet)
        .withArgs(dummyMetadata2);
    });
  });

  describe('setSignatureValidator:', async () => {
    it('reverts if the sender lacks the required role', async () => {
      await dao.revoke(
        dao.address,
        ownerAddress,
        ROLES.SET_SIGNATURE_VALIDATOR_ROLE
      );

      await expect(dao.setSignatureValidator(dummyAddress2)).to.be.revertedWith(
        customError(
          'ACLAuth',
          dao.address,
          dao.address,
          ownerAddress,
          ROLES.SET_SIGNATURE_VALIDATOR_ROLE
        )
      );
    });

    it.skip('sets a new signature validator', async () => {
      expect(false).to.be.equal(true); // TODO
    });

    it.skip('validates signatures', async () => {
      expect(false).to.be.equal(true); // TODO
    });
  });

  describe('execute:', async () => {
    const dummyActions = [
      {
        to: dummyAddress1,
        data: dummyMetadata1,
        value: 0,
      },
    ];
    const expectedDummyResults = ['0x'];

    it('reverts if the sender lacks the required role', async () => {
      await dao.revoke(dao.address, ownerAddress, ROLES.EXEC_ROLE);

      await expect(dao.execute(0, dummyActions)).to.be.revertedWith(
        customError(
          'ACLAuth',
          dao.address,
          dao.address,
          ownerAddress,
          ROLES.EXEC_ROLE
        )
      );
    });

    it('executes an array of actions', async () => {
      expect(await dao.callStatic.execute(0, dummyActions)).to.deep.equal(
        expectedDummyResults
      );
    });

    it('emits an event afterwards', async () => {
      let tx = await dao.execute(0, dummyActions);
      let rc = await tx.wait();

      const {actor, callId, actions, execResults} = dao.interface.parseLog(
        rc.logs[0]
      ).args;

      expect(actor).to.equal(ownerAddress);
      expect(callId).to.equal(0);
      expect(actions.length).to.equal(1);
      expect(actions[0].to).to.equal(dummyActions[0].to);
      expect(actions[0].value).to.equal(dummyActions[0].value);
      expect(actions[0].data).to.equal(dummyActions[0].data);
      expect(execResults).to.deep.equal(expectedDummyResults);
    });
  });

  describe('deposit:', async () => {
    const amount = ethers.utils.parseEther('1.23');

    it('deposits ETH into the DAO', async () => {
      const options = {value: amount};

      // is empty at the beginning
      expect(await ethers.provider.getBalance(dao.address)).to.equal(0);

      expect(
        await dao.deposit(ethers.constants.AddressZero, amount, 'ref', options)
      )
        .to.emit(dao, EVENTS.Deposited)
        .withArgs(ownerAddress, ethers.constants.AddressZero, amount, 'ref');

      // holds amount now
      expect(await ethers.provider.getBalance(dao.address)).to.equal(amount);
    });

    it('deposits ERC20 into the DAO', async () => {
      await token.mint(ownerAddress, amount);
      await token.approve(dao.address, amount);

      // is empty at the beginning
      expect(await token.balanceOf(dao.address)).to.equal(0);

      expect(await dao.deposit(token.address, amount, 'ref'))
        .to.emit(dao, EVENTS.Deposited)
        .withArgs(ownerAddress, token.address, amount, 'ref');

      // holds amount now
      expect(await token.balanceOf(dao.address)).to.equal(amount);
    });

    it('throws an error if ERC20 and ETH are deposited at the same time', async () => {
      const options = {value: amount};
      await token.mint(ownerAddress, amount);

      await expect(
        dao.deposit(token.address, amount, 'ref', options)
      ).to.be.revertedWith(customError('ETHDepositAmountMismatch', 0, amount));
    });
  });

  describe('withdraw:', async () => {
    const amount = ethers.utils.parseEther('1.23');
    const options = {value: amount};

    beforeEach(async () => {
      // put ETH into the DAO
      await dao.deposit(ethers.constants.AddressZero, amount, 'ref', options);

      // put ERC20 into the DAO
      await token.mint(dao.address, amount);
    });

    it('reverts if the sender lacks the required role', async () => {
      await dao.revoke(dao.address, ownerAddress, ROLES.WITHDRAW_ROLE);

      await expect(
        dao.withdraw(ethers.constants.AddressZero, ownerAddress, amount, 'ref')
      ).to.be.revertedWith(
        customError(
          'ACLAuth',
          dao.address,
          dao.address,
          ownerAddress,
          ROLES.WITHDRAW_ROLE
        )
      );
    });

    it('withdraws ETH if DAO balance is high enough', async () => {
      const receiverBalance = await signers[1].getBalance();

      expect(
        await dao.withdraw(
          ethers.constants.AddressZero,
          signers[1].address,
          amount,
          'ref'
        )
      )
        .to.emit(dao, EVENTS.Withdrawn)
        .withArgs(
          ethers.constants.AddressZero,
          signers[1].address,
          amount,
          'ref'
        );

      expect(await signers[1].getBalance()).to.equal(
        receiverBalance.add(amount)
      );
    });

    it('throws an error if the ETH balance is too low', async () => {
      await expect(
        dao.withdraw(
          ethers.constants.AddressZero,
          ownerAddress,
          amount.add(1),
          'ref'
        )
      ).to.be.revertedWith(customError('ETHWithdrawFailed'));
    });

    it('withdraws ERC20 if DAO balance is high enough', async () => {
      const receiverBalance = await token.balanceOf(signers[1].address);

      expect(
        await dao.withdraw(token.address, signers[1].address, amount, 'ref')
      )
        .to.emit(dao, EVENTS.Withdrawn)
        .withArgs(token.address, signers[1].address, amount, 'ref');

      expect(await token.balanceOf(signers[1].address)).to.equal(
        receiverBalance.add(amount)
      );
    });

    it('throws an error if the ERC20 balance is too low', async () => {
      await expect(
        dao.withdraw(token.address, ownerAddress, amount.add(1), 'ref')
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });

    it('throws an error if the amount is 0', async () => {
      await expect(
        dao.withdraw(token.address, ownerAddress, 0, 'ref')
      ).to.be.revertedWith(customError('ZeroAmount'));
    });
  });

  describe('receive:', async () => {
    const amount = ethers.utils.parseEther('1.23');

    it('receives ETH ', async () => {
      const options = {value: amount};

      // is empty at the beginning
      expect(await ethers.provider.getBalance(dao.address)).to.equal(0);

      // Send a transaction
      expect(await signers[0].sendTransaction({to: dao.address, value: amount}))
        .to.emit(dao, EVENTS.ETHDeposited)
        .withArgs(ownerAddress, amount);

      // holds amount now
      expect(await ethers.provider.getBalance(dao.address)).to.equal(amount);
    });
  });
});
