import chai, {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  DAO,
  DAO__factory,
  TestERC20,
  TestERC721,
  TestERC1155,
} from '../../typechain';
import {findEvent, DAO_EVENTS} from '../../utils/event';
import {flipBit} from '../test-utils/bitmap';

import {getActions} from '../test-utils/dao';

import {getInterfaceID} from '../test-utils/interfaces';
import {OZ_ERRORS} from '../test-utils/error';
import {IERC1271__factory} from '../../typechain/factories/IERC1271__factory';
import {smock} from '@defi-wonderland/smock';
import {deployWithProxy} from '../test-utils/proxy';
import {UNREGISTERED_INTERFACE_RETURN} from './component/callback-handler';
import {ZERO_BYTES32, daoExampleURI} from '../test-utils/dao';

chai.use(smock.matchers);

const errorSignature = '0x08c379a0'; // first 4 bytes of Error(string)

const dummyAddress1 = '0x0000000000000000000000000000000000000001';
const dummyAddress2 = '0x0000000000000000000000000000000000000002';
const dummyMetadata1 = '0x0001';
const dummyMetadata2 = '0x0002';
const MAX_ACTIONS = 256;
const NATIVE = ethers.constants.AddressZero;
const NO_ID = 0;
const NO_AMOUNT = 0;

const EVENTS = {
  MetadataSet: 'MetadataSet',
  TrustedForwarderSet: 'TrustedForwarderSet',
  DAOCreated: 'DAOCreated',
  Granted: 'Granted',
  Revoked: 'Revoked',
  Deposited: 'Deposited',
  Withdrawn: 'Withdrawn',
  Executed: 'Executed',
  NativeTokenDeposited: 'NativeTokenDeposited',
  SignatureValidatorSet: 'SignatureValidatorSet',
  StandardCallbackRegistered: 'StandardCallbackRegistered',
};

const PERMISSION_IDS = {
  UPGRADE_DAO_PERMISSION_ID: ethers.utils.id('UPGRADE_DAO_PERMISSION'),
  SET_METADATA_PERMISSION_ID: ethers.utils.id('SET_METADATA_PERMISSION'),
  EXECUTE_PERMISSION_ID: ethers.utils.id('EXECUTE_PERMISSION'),
  WITHDRAW_PERMISSION_ID: ethers.utils.id('WITHDRAW_PERMISSION'),
  SET_SIGNATURE_VALIDATOR_PERMISSION_ID: ethers.utils.id(
    'SET_SIGNATURE_VALIDATOR_PERMISSION'
  ),
  SET_TRUSTED_FORWARDER_PERMISSION_ID: ethers.utils.id(
    'SET_TRUSTED_FORWARDER_PERMISSION'
  ),
  MINT_PERMISSION_ID: ethers.utils.id('MINT_PERMISSION'),
  REGISTER_STANDARD_CALLBACK_PERMISSION_ID: ethers.utils.id(
    'REGISTER_STANDARD_CALLBACK_PERMISSION'
  ),
};

describe('DAO', function () {
  let signers: SignerWithAddress[];
  let ownerAddress: string;
  let dao: DAO;
  let erc20: TestERC20;
  let erc721: TestERC721;
  let erc1155: TestERC1155;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const DAO = await ethers.getContractFactory('DAO');
    dao = await deployWithProxy(DAO);
    await dao.initialize(
      dummyMetadata1,
      ownerAddress,
      dummyAddress1,
      daoExampleURI
    );

    const TestERC20 = await ethers.getContractFactory('TestERC20');
    erc20 = await TestERC20.deploy('ERC20', 'ERC20');

    const TestERC721 = await ethers.getContractFactory('TestERC721');
    erc721 = await TestERC721.deploy('ERC721', 'ERC721');

    const TestERC1155 = await ethers.getContractFactory('TestERC1155');
    erc1155 = await TestERC1155.deploy('ERC1155');

    // Grant permissions
    await Promise.all([
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.SET_METADATA_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.EXECUTE_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.WITHDRAW_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.UPGRADE_DAO_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.SET_SIGNATURE_VALIDATOR_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.SET_TRUSTED_FORWARDER_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.REGISTER_STANDARD_CALLBACK_PERMISSION_ID
      ),
      dao.grant(erc20.address, ownerAddress, PERMISSION_IDS.MINT_PERMISSION_ID),
    ]);
  });

  describe('initialize', async () => {
    it('reverts if trying to re-initialize', async () => {
      await expect(
        dao.initialize(
          dummyMetadata1,
          ownerAddress,
          dummyAddress1,
          daoExampleURI
        )
      ).to.be.revertedWith(OZ_ERRORS.ALREADY_INITIALIZED);
    });

    it('sets the trusted forwarder correctly', async () => {
      expect(await dao.getTrustedForwarder()).to.be.equal(dummyAddress1);
    });
  });

  describe('setTrustedForwarder:', async () => {
    it('reverts if the sender lacks the required permissionId', async () => {
      await dao.revoke(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.SET_TRUSTED_FORWARDER_PERMISSION_ID
      );

      await expect(dao.setTrustedForwarder(dummyAddress2))
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(
          dao.address,
          dao.address,
          ownerAddress,
          PERMISSION_IDS.SET_TRUSTED_FORWARDER_PERMISSION_ID
        );
    });

    it('sets a new trusted forwarder', async () => {
      await dao.setTrustedForwarder(dummyAddress2);
      expect(await dao.getTrustedForwarder()).to.be.equal(dummyAddress2);
    });

    it('emits an event containing the address', async () => {
      await expect(dao.setTrustedForwarder(dummyAddress2))
        .to.emit(dao, EVENTS.TrustedForwarderSet)
        .withArgs(dummyAddress2);
    });
  });

  describe('setMetadata:', async () => {
    it('reverts if the sender lacks the required permissionId', async () => {
      await dao.revoke(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.SET_METADATA_PERMISSION_ID
      );

      await expect(dao.setMetadata(dummyMetadata1))
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(
          dao.address,
          dao.address,
          ownerAddress,
          PERMISSION_IDS.SET_METADATA_PERMISSION_ID
        );
    });

    it('sets new metadata via an event', async () => {
      await expect(dao.setMetadata(dummyMetadata2))
        .to.emit(dao, EVENTS.MetadataSet)
        .withArgs(dummyMetadata2);
    });
  });

  describe('execute:', async () => {
    let data: any;
    before(async () => {
      data = await getActions();
    });

    it('reverts if the sender lacks the required permissionId', async () => {
      await dao.revoke(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.EXECUTE_PERMISSION_ID
      );

      await expect(dao.execute(ZERO_BYTES32, [data.succeedAction], 0))
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(
          dao.address,
          dao.address,
          ownerAddress,
          PERMISSION_IDS.EXECUTE_PERMISSION_ID
        );
    });

    it('reverts if array of actions is too big', async () => {
      let actions = [];
      for (let i = 0; i < MAX_ACTIONS; i++) {
        actions[i] = data.succeedAction;
      }

      await expect(dao.execute(ZERO_BYTES32, actions, 0)).to.not.be.reverted;

      // add one more to make sure it fails
      actions[MAX_ACTIONS] = data.failAction;

      await expect(
        dao.execute(ZERO_BYTES32, actions, 0)
      ).to.be.revertedWithCustomError(dao, 'TooManyActions');
    });

    it("reverts if action is failable and allowFailureMap doesn't include it", async () => {
      await expect(dao.execute(ZERO_BYTES32, [data.failAction], 0))
        .to.be.revertedWithCustomError(dao, 'ActionFailed')
        .withArgs(0);
    });

    it('succeeds if action is failable but allowFailureMap allows it', async () => {
      let num = ethers.BigNumber.from(0);
      num = flipBit(0, num);

      const tx = await dao.execute(ZERO_BYTES32, [data.failAction], num);
      const event = await findEvent(tx, EVENTS.Executed);

      // Check that failAction's revertMessage was correctly stored in the dao's execResults
      expect(event.args.execResults[0]).to.includes(data.failActionMessage);
      expect(event.args.execResults[0]).to.includes(errorSignature);
    });

    it('returns the correct result if action succeeds', async () => {
      const tx = await dao.execute(ZERO_BYTES32, [data.succeedAction], 0);
      const event = await findEvent(tx, EVENTS.Executed);
      expect(event.args.execResults[0]).to.equal(data.successActionResult);
    });

    it('succeeds and correctly constructs failureMap results ', async () => {
      let allowFailureMap = ethers.BigNumber.from(0);
      let actions = [];

      // First 3 actions will fail
      actions[0] = data.failAction;
      actions[1] = data.failAction;
      actions[2] = data.failAction;

      // The next 3 actions will succeed
      actions[3] = data.succeedAction;
      actions[4] = data.succeedAction;
      actions[5] = data.succeedAction;

      // add first 3 actions in the allowFailureMap
      // to make sure tx succeeds.
      for (let i = 0; i < 3; i++) {
        allowFailureMap = flipBit(i, allowFailureMap);
      }

      // If the below call not fails, means allowFailureMap is correct.
      let tx = await dao.execute(ZERO_BYTES32, actions, allowFailureMap);
      let event = await findEvent(tx, EVENTS.Executed);

      expect(event.args.actor).to.equal(ownerAddress);
      expect(event.args.callId).to.equal(ZERO_BYTES32);

      // construct the failureMap which only has those
      // bits set at indexes where actions failed
      let failureMap = ethers.BigNumber.from(0);
      for (let i = 0; i < 3; i++) {
        failureMap = flipBit(i, failureMap);
      }
      // Check that dao crrectly generated failureMap
      expect(event.args.failureMap).to.equal(failureMap);

      // Check that execResult emitted correctly stores action results.
      for (let i = 0; i < 3; i++) {
        expect(event.args.execResults[i]).to.includes(data.failActionMessage);
        expect(event.args.execResults[i]).to.includes(errorSignature);
      }
      for (let i = 3; i < 6; i++) {
        expect(event.args.execResults[i]).to.equal(data.successActionResult);
      }

      // lets remove one of the action from allowFailureMap
      // to see tx will actually revert.
      allowFailureMap = flipBit(2, allowFailureMap);
      await expect(dao.execute(ZERO_BYTES32, actions, allowFailureMap))
        .to.be.revertedWithCustomError(dao, 'ActionFailed')
        .withArgs(2); // Since we unset the 2th action from failureMap, it should fail with that index.
    });

    it('emits an event afterwards', async () => {
      let tx = await dao.execute(ZERO_BYTES32, [data.succeedAction], 0);
      let rc = await tx.wait();

      const event = await findEvent(tx, DAO_EVENTS.EXECUTED);
      expect(event.args.actor).to.equal(ownerAddress);
      expect(event.args.callId).to.equal(ZERO_BYTES32);
      expect(event.args.actions.length).to.equal(1);
      expect(event.args.actions[0].to).to.equal(data.succeedAction.to);
      expect(event.args.actions[0].value).to.equal(data.succeedAction.value);
      expect(event.args.actions[0].data).to.equal(data.succeedAction.data);
      expect(event.args.execResults[0]).to.equal(data.successActionResult);
    });

    it('should transfer native token(eth) to recipient with action', async () => {
      const recipient = signers[1].address;
      const currentBalance = await ethers.provider.getBalance(recipient);

      // deposit some eth so it can later transfer
      const depositAmount = ethers.utils.parseEther('1.23');
      await dao.deposit(NATIVE, NO_ID, depositAmount, 'ref', {
        value: depositAmount,
      });

      const transferAction = {to: recipient, value: depositAmount, data: '0x'};
      await dao.execute(ZERO_BYTES32, [transferAction], 0);
      const newBalance = await ethers.provider.getBalance(recipient);
      expect(newBalance.sub(currentBalance)).to.equal(depositAmount);
    });

    it('should transfer ERC20 tokens to recipient with action', async () => {
      await erc20.mint(ownerAddress, 20);

      await erc20.transfer(dao.address, 20);

      const recipient = signers[1].address;

      const iface = new ethers.utils.Interface(DAO__factory.abi);

      const encoded = iface.encodeFunctionData('withdraw', [
        erc20.address,
        recipient,
        NO_ID,
        20,
        'ref',
      ]);

      await dao.grant(
        dao.address,
        dao.address,
        PERMISSION_IDS.WITHDRAW_PERMISSION_ID
      );

      const transferAction = {to: dao.address, value: 0, data: encoded};

      expect(await erc20.balanceOf(dao.address)).to.equal(20);
      expect(await erc20.balanceOf(recipient)).to.equal(0);

      await dao.execute(ZERO_BYTES32, [transferAction], 0);
      expect(await erc20.balanceOf(dao.address)).to.equal(0);
      expect(await erc20.balanceOf(recipient)).to.equal(20);
    });
  });

  describe('deposit:', async () => {
    const amount = ethers.utils.parseEther('1.23');
    const tokenId = 456;
    const options = {value: amount};

    context('Native', async () => {
      it('reverts if amount is zero', async () => {
        await expect(
          dao.deposit(NATIVE, NO_ID, NO_AMOUNT, 'ref')
        ).to.be.revertedWithCustomError(dao, 'ZeroAmount');
      });

      it('reverts if tokenId is not zero', async () => {
        await expect(dao.deposit(NATIVE, tokenId, amount, 'ref'))
          .to.be.revertedWithCustomError(dao, 'NonZeroTokenId')
          .withArgs(tokenId);
      });

      it('reverts if passed amount does not match native amount', async () => {
        const passedAmount = ethers.utils.parseEther('1.22');

        await expect(dao.deposit(NATIVE, NO_ID, passedAmount, 'ref', options))
          .to.be.revertedWithCustomError(
            dao,
            'NativeTokenDepositAmountMismatch'
          )
          .withArgs(passedAmount, amount);
      });

      it('deposits native tokens into the DAO', async () => {
        // is empty at the beginning
        expect(await ethers.provider.getBalance(dao.address)).to.equal(0);

        await expect(dao.deposit(NATIVE, NO_ID, amount, 'ref', options))
          .to.emit(dao, EVENTS.Deposited)
          .withArgs(ownerAddress, NATIVE, NO_ID, amount, 'ref');

        // holds amount now
        expect(await ethers.provider.getBalance(dao.address)).to.equal(amount);
      });
    });

    context('ERC20', async () => {
      it('reverts if the amount is zero', async () => {
        await expect(
          dao.deposit(erc20.address, NO_ID, NO_AMOUNT, 'ref')
        ).to.be.revertedWithCustomError(dao, 'ZeroAmount');
      });

      it('reverts if the token ID is not zero', async () => {
        await expect(dao.deposit(erc20.address, tokenId, amount, 'ref'))
          .to.be.revertedWithCustomError(dao, 'NonZeroTokenId')
          .withArgs(tokenId);
      });

      it('reverts if the sender balance is too low', async () => {
        await expect(dao.deposit(erc20.address, NO_ID, amount, 'ref')).to.be
          .reverted;
      });

      it('reverts if native tokens are sent alongside', async () => {
        await erc20.mint(ownerAddress, amount);

        await expect(dao.deposit(erc20.address, NO_ID, amount, 'ref', options))
          .to.be.revertedWithCustomError(
            dao,
            'NativeTokenDepositAmountMismatch'
          )
          .withArgs(NO_AMOUNT, amount);
      });

      it('reverts if the sender has not approved the tokens', async () => {
        await erc20.mint(ownerAddress, amount);

        await expect(
          dao.deposit(erc20.address, NO_ID, amount, 'ref')
        ).to.be.revertedWith('ERC20: insufficient allowance');
      });

      it('deposits if tokens are approved', async () => {
        await erc20.mint(ownerAddress, amount);
        await erc20.approve(dao.address, amount);

        // is empty at the beginning
        expect(await erc20.balanceOf(dao.address)).to.equal(0);

        await expect(dao.deposit(erc20.address, NO_ID, amount, 'ref'))
          .to.emit(dao, EVENTS.Deposited)
          .withArgs(ownerAddress, erc20.address, NO_ID, amount, 'ref');

        // holds amount now
        expect(await erc20.balanceOf(dao.address)).to.equal(amount);
      });
    });

    context('ERC721', async () => {
      it('reverts if the amount is not zero', async () => {
        await expect(
          dao.withdraw(erc721.address, ownerAddress, NO_ID, amount, 'ref')
        )
          .to.be.revertedWithCustomError(dao, 'NonZeroAmount')
          .withArgs(amount);
      });

      it('reverts when the sender does not own the token', async () => {
        await expect(dao.deposit(erc721.address, tokenId, NO_AMOUNT, 'ref')).to
          .be.reverted;
      });

      it('reverts if native tokens are sent alongside', async () => {
        await erc721.mint(ownerAddress, tokenId);

        await expect(
          dao.deposit(erc721.address, tokenId, NO_AMOUNT, 'ref', options)
        )
          .to.be.revertedWithCustomError(
            dao,
            'NativeTokenDepositAmountMismatch'
          )
          .withArgs(NO_AMOUNT, amount);
      });

      it('reverts if the sender has not approved the tokens', async () => {
        await erc721.mint(ownerAddress, tokenId);

        await expect(
          dao.deposit(erc721.address, tokenId, NO_AMOUNT, 'ref')
        ).to.be.revertedWith('ERC721: caller is not token owner nor approved');
      });

      it('deposits if tokens are approved', async () => {
        await erc721.mint(ownerAddress, tokenId);
        await erc721.setApprovalForAll(dao.address, true);

        // is empty at the beginning
        expect(await erc721.balanceOf(dao.address)).to.equal(0);

        await expect(dao.deposit(erc721.address, tokenId, NO_AMOUNT, 'ref'))
          .to.emit(dao, EVENTS.Deposited)
          .withArgs(ownerAddress, erc721.address, tokenId, NO_AMOUNT, 'ref');

        // holds amount now
        expect(await erc721.balanceOf(dao.address)).to.equal(1);
      });
    });

    context('ERC1155', async () => {
      it('reverts if the amount is zero', async () => {
        await expect(
          dao.withdraw(erc1155.address, ownerAddress, NO_ID, NO_AMOUNT, 'ref')
        ).to.be.revertedWithCustomError(dao, 'ZeroAmount');
      });

      it('reverts when the sender does not own the token', async () => {
        await expect(dao.deposit(erc1155.address, tokenId, amount, 'ref')).to.be
          .reverted;
      });

      it('reverts if native tokens are sent alongside', async () => {
        await erc1155.mint(ownerAddress, tokenId, amount);

        await expect(
          dao.deposit(erc1155.address, tokenId, amount, 'ref', options)
        )
          .to.be.revertedWithCustomError(
            dao,
            'NativeTokenDepositAmountMismatch'
          )
          .withArgs(NO_AMOUNT, amount);
      });

      it('reverts if the sender has not approved the tokens', async () => {
        await erc1155.mint(ownerAddress, tokenId, amount);

        await expect(
          dao.deposit(erc1155.address, tokenId, amount, 'ref')
        ).to.be.revertedWith('ERC1155: caller is not token owner nor approved');
      });

      it('deposits if tokens are approved', async () => {
        await erc1155.mint(ownerAddress, tokenId, amount);
        await erc1155.setApprovalForAll(dao.address, true);

        // is empty at the beginning
        expect(await erc1155.balanceOf(dao.address, tokenId)).to.equal(0);

        await expect(dao.deposit(erc1155.address, tokenId, amount, 'ref'))
          .to.emit(dao, EVENTS.Deposited)
          .withArgs(ownerAddress, erc1155.address, tokenId, amount, 'ref');

        // holds amount now
        expect(await erc1155.balanceOf(dao.address, tokenId)).to.equal(amount);
      });
    });

    context('Unsupported Token', async () => {
      it('reverts if the provided address does not refer to a supported token', async () => {
        await expect(dao.deposit(dao.address, NO_ID, amount, 'ref'))
          .to.be.revertedWithCustomError(dao, 'UnsupportedTokenStandard')
          .withArgs(dao.address);
        await expect(dao.deposit(dao.address, tokenId, NO_AMOUNT, 'ref'))
          .to.be.revertedWithCustomError(dao, 'UnsupportedTokenStandard')
          .withArgs(dao.address);
        await expect(dao.deposit(dao.address, tokenId, amount, 'ref'))
          .to.be.revertedWithCustomError(dao, 'UnsupportedTokenStandard')
          .withArgs(dao.address);
        await expect(dao.deposit(dao.address, NO_ID, NO_AMOUNT, 'ref'))
          .to.be.revertedWithCustomError(dao, 'UnsupportedTokenStandard')
          .withArgs(dao.address);
      });
    });
  });

  describe('withdraw:', async () => {
    const amount = ethers.utils.parseEther('1.23');
    const tokenId = 456;
    const options = {value: amount};

    beforeEach(async () => {
      // put tokens into the DAO
      await dao.deposit(NATIVE, NO_ID, amount, 'ref', options);
      await erc20.mint(dao.address, amount);
      await erc721.mint(dao.address, tokenId);
      await erc1155.mint(dao.address, tokenId, amount);
    });

    it('reverts if the sender lacks the required permissionId', async () => {
      await dao.revoke(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.WITHDRAW_PERMISSION_ID
      );

      const expectedArgs = [
        dao.address,
        dao.address,
        ownerAddress,
        PERMISSION_IDS.WITHDRAW_PERMISSION_ID,
      ];
      await expect(dao.withdraw(NATIVE, ownerAddress, NO_ID, amount, 'ref'))
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(...expectedArgs);
      await expect(
        dao.withdraw(erc20.address, ownerAddress, NO_ID, amount, 'ref')
      )
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(...expectedArgs);
      await expect(
        dao.withdraw(erc721.address, ownerAddress, tokenId, NO_AMOUNT, 'ref')
      )
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(...expectedArgs);
      await expect(
        dao.withdraw(erc1155.address, ownerAddress, tokenId, amount, 'ref')
      )
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(...expectedArgs);
    });

    context('Native', async () => {
      it('reverts if the amount is zero', async () => {
        await expect(
          dao.withdraw(NATIVE, ownerAddress, NO_ID, NO_AMOUNT, 'ref')
        ).to.be.revertedWithCustomError(dao, 'ZeroAmount');
      });

      it('reverts if the token ID is not zero', async () => {
        await expect(dao.withdraw(NATIVE, ownerAddress, tokenId, amount, 'ref'))
          .to.be.revertedWithCustomError(dao, 'NonZeroTokenId')
          .withArgs(tokenId);
      });

      it('reverts if the native balance is too low', async () => {
        await expect(
          dao.withdraw(NATIVE, ownerAddress, NO_ID, amount.add(1), 'ref')
        ).to.be.revertedWithCustomError(dao, 'NativeTokenWithdrawFailed');
      });

      it('withdraws the native balance is high enough', async () => {
        const receiverBalance = await signers[1].getBalance();

        await expect(
          dao.withdraw(NATIVE, signers[1].address, NO_ID, amount, 'ref')
        )
          .to.emit(dao, EVENTS.Withdrawn)
          .withArgs(NATIVE, signers[1].address, NO_ID, amount, 'ref');

        expect(await signers[1].getBalance()).to.equal(
          receiverBalance.add(amount)
        );
      });
    });

    context('ERC20', async () => {
      it('reverts if the amount is zero', async () => {
        await expect(
          dao.withdraw(erc20.address, ownerAddress, NO_ID, NO_AMOUNT, 'ref')
        ).to.be.revertedWithCustomError(dao, 'ZeroAmount');
      });

      it('reverts if the token ID is not zero', async () => {
        await expect(
          dao.withdraw(erc20.address, ownerAddress, tokenId, amount, 'ref')
        )
          .to.be.revertedWithCustomError(dao, 'NonZeroTokenId')
          .withArgs(tokenId);
      });

      it('reverts if the balance is too low', async () => {
        await erc20.approve(dao.address, amount);
        await expect(
          dao.withdraw(erc20.address, ownerAddress, NO_ID, amount.add(1), 'ref')
        ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
      });

      it('withdraws if the balance is high enough', async () => {
        const receiverBalance = await erc20.balanceOf(signers[1].address);

        await expect(
          dao.withdraw(erc20.address, signers[1].address, NO_ID, amount, 'ref')
        )
          .to.emit(dao, EVENTS.Withdrawn)
          .withArgs(erc20.address, signers[1].address, NO_ID, amount, 'ref');

        expect(await erc20.balanceOf(signers[1].address)).to.equal(
          receiverBalance.add(amount)
        );
      });
    });

    context('ERC721', async () => {
      it('reverts if the amount is not zero', async () => {
        await expect(
          dao.withdraw(erc721.address, ownerAddress, NO_ID, amount, 'ref')
        )
          .to.be.revertedWithCustomError(dao, 'NonZeroAmount')
          .withArgs(amount);
      });

      it('withdraws the token', async () => {
        await expect(
          dao.withdraw(
            erc721.address,
            signers[1].address,
            tokenId,
            NO_AMOUNT,
            'ref'
          )
        )
          .to.emit(dao, EVENTS.Withdrawn)
          .withArgs(
            erc721.address,
            signers[1].address,
            tokenId,
            NO_AMOUNT,
            'ref'
          );

        expect(await erc721.balanceOf(signers[1].address)).to.equal(1);
      });
    });

    context('ERC1155', async () => {
      it('reverts if the amount is zero', async () => {
        await expect(
          dao.withdraw(erc1155.address, ownerAddress, NO_ID, NO_AMOUNT, 'ref')
        ).to.be.revertedWithCustomError(dao, 'ZeroAmount');
      });

      it('withdraws if the balance is high enough', async () => {
        const receiverBalance = await erc1155.balanceOf(
          signers[1].address,
          tokenId
        );

        await expect(
          dao.withdraw(
            erc1155.address,
            signers[1].address,
            tokenId,
            amount,
            'ref'
          )
        )
          .to.emit(dao, EVENTS.Withdrawn)
          .withArgs(
            erc1155.address,
            signers[1].address,
            tokenId,
            amount,
            'ref'
          );

        expect(await erc1155.balanceOf(signers[1].address, tokenId)).to.equal(
          receiverBalance.add(amount)
        );
      });
    });

    context('Unsupported Token', async () => {
      it('reverts if the provided address does not refer to a supported token', async () => {
        await expect(
          dao.withdraw(dao.address, ownerAddress, NO_ID, amount, 'ref')
        )
          .to.be.revertedWithCustomError(dao, 'UnsupportedTokenStandard')
          .withArgs(dao.address);

        await expect(
          dao.withdraw(dao.address, ownerAddress, tokenId, NO_AMOUNT, 'ref')
        )
          .to.be.revertedWithCustomError(dao, 'UnsupportedTokenStandard')
          .withArgs(dao.address);

        await expect(
          dao.withdraw(dao.address, ownerAddress, tokenId, amount, 'ref')
        )
          .to.be.revertedWithCustomError(dao, 'UnsupportedTokenStandard')
          .withArgs(dao.address);
        await expect(
          dao.withdraw(dao.address, ownerAddress, NO_ID, NO_AMOUNT, 'ref')
        )
          .to.be.revertedWithCustomError(dao, 'UnsupportedTokenStandard')
          .withArgs(dao.address);
      });
    });
  });

  describe('registerStandardCallback:', async () => {
    it('reverts if `REGISTER_STANDARD_CALLBACK_PERMISSION` is not granted', async () => {
      await dao.revoke(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.REGISTER_STANDARD_CALLBACK_PERMISSION_ID
      );

      await expect(
        dao.registerStandardCallback('0x00000001', '0x00000001', '0x00000001')
      )
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(
          dao.address,
          dao.address,
          ownerAddress,
          PERMISSION_IDS.REGISTER_STANDARD_CALLBACK_PERMISSION_ID
        );
    });

    it('correctly emits selector and interface id', async () => {
      // The below id (Real usecase example)
      // interfaceId for supportsInterface(type(IERC721Receiver).interfaceId)
      // callbackSelector (onERC721Received.selector)
      const id = '0x150b7a02';
      await expect(
        dao.registerStandardCallback('0x00000001', '0x00000002', '0x00000001')
      )
        .to.emit(dao, EVENTS.StandardCallbackRegistered)
        .withArgs('0x00000001', '0x00000002', '0x00000001');
    });

    it('correctly sets callback selector and interface and can call later', async () => {
      // (Real usecase example)
      // interfaceId for supportsInterface(type(IERC777Recipient).interfaceId)
      // callbackSelector (tokensReceived.selector)
      const id = '0x0023de29';

      // 0023de29 selector doesn't exist, so it should fail..
      await expect(
        signers[0].sendTransaction({
          to: dao.address,
          data: id,
        })
      )
        .to.be.revertedWithCustomError(dao, 'UnkownCallback')
        .withArgs(id, UNREGISTERED_INTERFACE_RETURN);

      // register tokensReceived selector
      await dao.registerStandardCallback(id, id, id);

      let tokensReceivedReturned = await ethers.provider.call({
        to: dao.address,
        data: id,
      });

      // TODO: ethers utils pads zero to the left. we need to pad to the right.
      expect(tokensReceivedReturned).to.equal(id + '00'.repeat(28));
      expect(await dao.supportsInterface(id)).to.equal(true);
    });
  });

  describe('receive:', async () => {
    const amount = ethers.utils.parseEther('1.23');

    it('receives native tokens ', async () => {
      const options = {value: amount};

      // is empty at the beginning
      expect(await ethers.provider.getBalance(dao.address)).to.equal(0);

      // Send a transaction
      await expect(signers[0].sendTransaction({to: dao.address, value: amount}))
        .to.emit(dao, EVENTS.NativeTokenDeposited)
        .withArgs(ownerAddress, amount);

      // holds amount now
      expect(await ethers.provider.getBalance(dao.address)).to.equal(amount);
    });
  });

  describe('ERC1271', async () => {
    it('should register the interfaceId', async () => {
      expect(
        await dao.supportsInterface(
          getInterfaceID(IERC1271__factory.createInterface())
        )
      ).to.be.eq(true);
    });

    it('should return 0 if no validator is set', async () => {
      expect(
        await dao.isValidSignature(ethers.utils.keccak256('0x00'), '0x00')
      ).to.be.eq('0x00000000');
    });

    it('should allow only `SET_SIGNATURE_VALIDATOR_PERMISSION_ID` to set validator', async () => {
      const signers = await ethers.getSigners();
      await expect(
        dao
          .connect(signers[2])
          .setSignatureValidator(ethers.Wallet.createRandom().address)
      )
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(
          dao.address,
          dao.address,
          signers[2].address,
          PERMISSION_IDS.SET_SIGNATURE_VALIDATOR_PERMISSION_ID
        );
    });

    it('should set validator and emits event', async () => {
      const validatorAddress = ethers.Wallet.createRandom().address;
      const tx = await dao.setSignatureValidator(validatorAddress);

      expect(await dao.signatureValidator()).to.be.eq(validatorAddress);

      await expect(tx)
        .to.emit(dao, EVENTS.SignatureValidatorSet)
        .withArgs(validatorAddress);
    });

    it('should call the signature validator', async () => {
      const ERC1271MockFactory = await smock.mock('ERC1271Mock');
      const erc1271Mock = await ERC1271MockFactory.deploy();

      await dao.setSignatureValidator(erc1271Mock.address);
      await dao.isValidSignature(ethers.utils.keccak256('0x00'), '0x00');
      expect(erc1271Mock.isValidSignature).has.been.callCount(1);
    });

    it('should return the validators response', async () => {
      const ERC1271MockFactory = await ethers.getContractFactory('ERC1271Mock');
      const erc1271Mock = await ERC1271MockFactory.deploy();

      await dao.setSignatureValidator(erc1271Mock.address);
      expect(
        await dao.isValidSignature(ethers.utils.keccak256('0x00'), '0x00')
      ).to.be.eq('0x41424344');
    });

    describe('ERC4824 - daoURI', async () => {
      it('should set a new URI', async () => {
        const newURI = 'https://new.example.com';
        expect(await dao.daoURI()).not.to.be.eq(newURI);
        await dao.setDaoURI(newURI);
        expect(await dao.daoURI()).to.be.eq(newURI);
      });

      it('should emit DaoURIUpdated', async () => {
        const newURI = 'https://new.example.com';
        await expect(dao.setDaoURI(newURI))
          .to.emit(dao, DAO_EVENTS.NEW_URI)
          .withArgs(newURI);
      });

      it('should revert if the sender lacks the permission to update the URI', async () => {
        await dao.revoke(
          dao.address,
          ownerAddress,
          PERMISSION_IDS.SET_METADATA_PERMISSION_ID
        );

        await expect(dao.setDaoURI('https://new.example.com'))
          .to.be.revertedWithCustomError(dao, 'Unauthorized')
          .withArgs(
            dao.address,
            dao.address,
            ownerAddress,
            PERMISSION_IDS.SET_METADATA_PERMISSION_ID
          );
      });

      it('should return the DAO URI', async () => {
        expect(await dao.daoURI()).to.be.eq(daoExampleURI);
      });
    });
  });

  describe('ERC1967', async () => {
    // TODO: Must be made as a test utils that can be imported in every upgradeable test file
    // Such as https://github.com/OpenZeppelin/openzeppelin-contracts/blob/a28aafdc85a592776544f7978c6b1a462d28ede2/test/token/ERC20/ERC20.behavior.js#L5
    // This will avoid having the same 3 tests in every file or we could just neglect this test as
    // It's coming from UUPSUpgradeable which is already tested though since contracts are very critical,
    // Still testing this most important part wouldn't be bad..
    it.skip('reverts if `UPGRADE_DAO_PERMISSION` is not granted or revoked', async () => {
      await expect(dao.connect(signers[1]).upgradeTo(dao.address))
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(
          dao.address,
          dao.address,
          signers[1].address,
          PERMISSION_IDS.UPGRADE_DAO_PERMISSION_ID
        );
    });

    it.skip('successfuly updates DAO contract', async () => {
      await expect(dao.upgradeTo(dao.address)).to.not.be.reverted;
    });
    it.skip('shouldn not update if new implementation is not UUPS compliant'); // TODO:Implement
  });
});
