import chai, {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  DAO,
  GovernanceERC20,
  DAO__factory,
  ActionExecute__factory,
  IDAO,
} from '../../typechain';
import {findEvent, DAO_EVENTS} from '../../utils/event';
import {setIndex, unsetIndex, getIndex} from '../test-utils/bitmap';

import {ERRORS, customError} from '../test-utils/custom-error-helper';
import {getInterfaceID} from '../test-utils/interfaces';
import {IERC1271__factory} from '../../typechain/factories/IERC1271__factory';
import {smock} from '@defi-wonderland/smock';

chai.use(smock.matchers);

const abiCoder = ethers.utils.defaultAbiCoder;

const dummyAddress1 = '0x0000000000000000000000000000000000000001';
const dummyAddress2 = '0x0000000000000000000000000000000000000002';
const dummyMetadata1 = '0x0001';
const dummyMetadata2 = '0x0002';
const MAX_ACTIONS = 256;

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

async function getActions() {
  const ActionExecuteFactory = await ethers.getContractFactory('ActionExecute');
  let ActionExecute = await ActionExecuteFactory.deploy();
  const iface = new ethers.utils.Interface(ActionExecute__factory.abi);
  return {
    failAction: {
      to: ActionExecute.address,
      data: iface.encodeFunctionData('fail'),
      value: 0,
    },
    succeedAction: {
      to: ActionExecute.address,
      data: iface.encodeFunctionData('setTest', [20]),
      value: 0,
    },
  };
}

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
    token = await Token.deploy(dao.address, 'GOV', 'GOV', {
      receivers: [],
      amounts: [],
    });

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
      dao.grant(token.address, ownerAddress, PERMISSION_IDS.MINT_PERMISSION_ID),
    ]);
  });

  describe('initialize', async () => {
    it('reverts if trying to re-initialize', async () => {
      await expect(
        dao.initialize(dummyMetadata1, ownerAddress, dummyAddress1)
      ).to.be.revertedWith(ERRORS.ALREADY_INITIALIZED);
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

      await expect(dao.setTrustedForwarder(dummyAddress2)).to.be.revertedWith(
        customError(
          'Unauthorized',
          dao.address,
          dao.address,
          ownerAddress,
          PERMISSION_IDS.SET_TRUSTED_FORWARDER_PERMISSION_ID
        )
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

      await expect(dao.setMetadata(dummyMetadata1)).to.be.revertedWith(
        customError(
          'Unauthorized',
          dao.address,
          dao.address,
          ownerAddress,
          PERMISSION_IDS.SET_METADATA_PERMISSION_ID
        )
      );
    });

    it('sets new metadata via an event', async () => {
      await expect(dao.setMetadata(dummyMetadata2))
        .to.emit(dao, EVENTS.MetadataSet)
        .withArgs(dummyMetadata2);
    });
  });

  describe.only('execute:', async () => {
    let succeedAction: any;
    let failAction: any;
    before(async () => {
      let actions = await getActions();
      succeedAction = actions.succeedAction;
      failAction = actions.failAction;
    });

    const dummyActions = [
      {
        to: dummyAddress1,
        data: dummyMetadata1,
        value: 0,
      },
    ];
    const expectedDummyResults = ['0x'];

    it('reverts if the sender lacks the required permissionId', async () => {
      await dao.revoke(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.EXECUTE_PERMISSION_ID
      );

      await expect(dao.execute(0, [succeedAction], 0)).to.be.revertedWith(
        customError(
          'Unauthorized',
          dao.address,
          dao.address,
          ownerAddress,
          PERMISSION_IDS.EXECUTE_PERMISSION_ID
        )
      );
    });

    it('reverts if array of actions is too big', async () => {
      let actions = [];
      for (let i = 0; i < MAX_ACTIONS; i++) {
        actions[i] = succeedAction;
      }

      await expect(dao.execute(0, actions, 0)).to.not.be.reverted;

      // add one more to make sure it fails
      actions[MAX_ACTIONS] = failAction;

      await expect(dao.execute(0, actions, 0)).to.be.revertedWith(
        customError('TooManyActions')
      );
    });

    it("reverts if action is called on EOA address", async () => {
      let wrongEOAAction = {...succeedAction, to: ownerAddress}
      await expect(dao.execute(0, [wrongEOAAction], 0)).to.be.revertedWith(
        customError('NotAContract')
      );
    });

    it("reverts if action is fallable and allowFailureMap doesn't include it", async () => {
      await expect(dao.execute(0, [failAction], 0)).to.be.revertedWith(
        customError('ActionFailed')
      );
    });

    it('succeeds if action is fallable but allowFailureMap allows it', async () => {
      let num = ethers.BigNumber.from(0);
      num = setIndex(0, num);

      const tx = await dao.execute(0, [failAction], num);
      const event = await findEvent(tx, EVENTS.Executed);
      
      // TODO: check that event.args.execResults[0] is the correct revert message
      // console.log(event.args.execResults[0], ' ooooooo1')
      // TODO: GIORGI
      // expect(event.args.execResults[0]).to.equal('ActionExecute:Revert');
    });

    it('returns the correct succeed result if action succeeds', async () => {
      const tx = await dao.execute(0, [succeedAction], 0);
      const event = await findEvent(tx, EVENTS.Executed);
      // TODO:
      // event.args.execResults[0] compare to 20 number.
      // 0x0000000000000000000000000000000000000000000000000000000000000014 how to compare this to 20 ?
      // console.log(event.args.execResults[0], ' ooooooo2')
    })

    it('only succeeds if failing action index is set in the failuremap', async () => {
      let allowFailureMap = ethers.BigNumber.from(0);
      let actions = [];

      // Some random indexes less than MAX_ACTIONS
      let succeedActionIndexes = [17, 99, 120];

      // The loop constructs an array of actions out of which
      // only 3 will be succeeded. For every action,
      // it adds it in the allowFailureMap to make sure tx never fails.
      for (let i = 0; i < MAX_ACTIONS; i++) {
        actions[i] = succeedActionIndexes.includes(i)
          ? succeedAction
          : failAction;

        allowFailureMap = setIndex(i, allowFailureMap);
      }

      // If the below call not fails, means allowFailureMap is correct.
      let tx = await dao.execute(0, actions, allowFailureMap);
      let event = await findEvent(tx, EVENTS.Executed);

      expect(event.args.actor).to.equal(ownerAddress);
      expect(event.args.callId).to.equal(0);

      // construct the failureMap which only has those
      // bits set at indexes where actions failed
      let failureMap = ethers.BigNumber.from(0);
      for (let i = 0; i < MAX_ACTIONS; i++) {
        if (!succeedActionIndexes.includes(i)) {
          failureMap = setIndex(i, failureMap);
        }
      }
      expect(event.args.failureMap).to.equal(failureMap);

      // TODO: compare it with `ActionExecute:Revert`
      // expect(event.args.execResults[0]).to.equal("")

      // lets remove one of the action from allowFailureMap
      // to see tx will actually revert.
      allowFailureMap = unsetIndex(250, allowFailureMap);
      await expect(dao.execute(0, actions, allowFailureMap)).to.be.revertedWith(
        customError('ActionFailed')
      );
    });

    it('emits an event afterwards', async () => {
      let tx = await dao.execute(0, [succeedAction], 0);
      let rc = await tx.wait();

      const event = await findEvent(tx, DAO_EVENTS.EXECUTED);

      expect(event.args.actor).to.equal(ownerAddress);
      expect(event.args.callId).to.equal(0);
      expect(event.args.actions.length).to.equal(1);
      expect(event.args.actions[0].to).to.equal(succeedAction.to);
      expect(event.args.actions[0].value).to.equal(succeedAction.value);
      expect(event.args.actions[0].data).to.equal(succeedAction.data);
      // TODO: compare to 20...
      // expect(event.args.execResults).to.deep.equal(['0x']);
    });
  });

  describe('deposit:', async () => {
    const amount = ethers.utils.parseEther('1.23');

    it('reverts if amount is zero', async () => {
      await expect(
        dao.deposit(ethers.constants.AddressZero, 0, 'ref')
      ).to.be.revertedWith(customError('ZeroAmount'));
    });

    it('reverts if passed amount does not match native amount value', async () => {
      const options = {value: amount};
      const passedAmount = ethers.utils.parseEther('1.22');

      await expect(
        dao.deposit(ethers.constants.AddressZero, passedAmount, 'ref', options)
      ).to.be.revertedWith(
        customError('NativeTokenDepositAmountMismatch', passedAmount, amount)
      );
    });

    it('reverts if ERC20 and native tokens are deposited at the same time', async () => {
      const options = {value: amount};
      await token.mint(ownerAddress, amount);

      await expect(
        dao.deposit(token.address, amount, 'ref', options)
      ).to.be.revertedWith(
        customError('NativeTokenDepositAmountMismatch', 0, amount)
      );
    });

    it('reverts when tries to deposit ERC20 token while sender does not have token amount', async () => {
      await expect(dao.deposit(token.address, amount, 'ref')).to.be.reverted;
    });

    it('reverts when tries to deposit ERC20 token while sender does not have approved token transfer', async () => {
      await token.mint(ownerAddress, amount);

      await expect(
        dao.deposit(token.address, amount, 'ref')
      ).to.be.revertedWith('ERC20: insufficient allowance');
    });

    it('deposits native tokens into the DAO', async () => {
      const options = {value: amount};

      // is empty at the beginning
      expect(await ethers.provider.getBalance(dao.address)).to.equal(0);

      await expect(
        dao.deposit(ethers.constants.AddressZero, amount, 'ref', options)
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

      await expect(dao.deposit(token.address, amount, 'ref'))
        .to.emit(dao, EVENTS.Deposited)
        .withArgs(ownerAddress, token.address, amount, 'ref');

      // holds amount now
      expect(await token.balanceOf(dao.address)).to.equal(amount);
    });
  });

  describe('withdraw:', async () => {
    const amount = ethers.utils.parseEther('1.23');
    const options = {value: amount};

    beforeEach(async () => {
      // put native tokens into the DAO
      await dao.deposit(ethers.constants.AddressZero, amount, 'ref', options);

      // put ERC20 into the DAO
      await token.mint(dao.address, amount);
    });

    it('reverts if the sender lacks the required permissionId', async () => {
      await dao.revoke(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.WITHDRAW_PERMISSION_ID
      );

      await expect(
        dao.withdraw(ethers.constants.AddressZero, ownerAddress, amount, 'ref')
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          dao.address,
          dao.address,
          ownerAddress,
          PERMISSION_IDS.WITHDRAW_PERMISSION_ID
        )
      );
    });

    it('withdraws native tokens if DAO balance is high enough', async () => {
      const receiverBalance = await signers[1].getBalance();

      await expect(
        dao.withdraw(
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

    it('throws an error if the native token balance is too low', async () => {
      await expect(
        dao.withdraw(
          ethers.constants.AddressZero,
          ownerAddress,
          amount.add(1),
          'ref'
        )
      ).to.be.revertedWith(customError('NativeTokenWithdrawFailed'));
    });

    it('withdraws ERC20 if DAO balance is high enough', async () => {
      const receiverBalance = await token.balanceOf(signers[1].address);

      await expect(
        dao.withdraw(token.address, signers[1].address, amount, 'ref')
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

  describe('registerStandardCallback:', async () => {
    it('reverts if `REGISTER_STANDARD_CALLBACK_PERMISSION` is not granted', async () => {
      await dao.revoke(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.REGISTER_STANDARD_CALLBACK_PERMISSION_ID
      );

      await expect(
        dao.registerStandardCallback('0x00000001', '0x00000001', '0x00000001')
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          dao.address,
          dao.address,
          ownerAddress,
          PERMISSION_IDS.REGISTER_STANDARD_CALLBACK_PERMISSION_ID
        )
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
      // interfaceId for supportsInterface(type(IERC721Receiver).interfaceId)
      // callbackSelector (onERC721Received.selector)
      const id = '0x150b7a02';

      // onERC721Received selector doesn't exist, so it should fail..
      await expect(
        signers[0].sendTransaction({
          to: dao.address,
          data: id,
        })
      ).to.be.revertedWith(
        customError('UnkownCallback', id, `0x${'00'.repeat(32)}`)
      );

      // register onERC721Received selector
      await dao.registerStandardCallback(id, id, id);

      let onERC721ReceivedReturned = await ethers.provider.call({
        to: dao.address,
        data: id,
      });

      // TODO: ethers utils pads zero to the left. we need to pad to the right.
      expect(onERC721ReceivedReturned).to.equal(id + '00'.repeat(28));
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

    it('should allow only SET_SIGNATURE_VALIDATOR_PERMISSION_ID to set validator', async () => {
      const signers = await ethers.getSigners();
      await expect(
        dao
          .connect(signers[2])
          .setSignatureValidator(ethers.Wallet.createRandom().address)
      ).to.be.revertedWith('');
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
  });

  describe('ERC1967', async () => {
    it('reverts if `UPGRADE_DAO_PERMISSION` is not granted or revoked', async () => {
      const iface = new ethers.utils.Interface(DAO__factory.abi);
      const initData = iface.encodeFunctionData('initialize', [
        dummyMetadata1,
        ownerAddress,
        dummyAddress1,
      ]);

      const ERC1967 = await ethers.getContractFactory('ERC1967Proxy');
      const erc1967Proxy = await ERC1967.deploy(dao.address, initData);

      const daoProxyContract = dao.attach(erc1967Proxy.address);

      await expect(daoProxyContract.upgradeTo(dao.address)).to.be.revertedWith(
        customError(
          'Unauthorized',
          daoProxyContract.address,
          daoProxyContract.address,
          ownerAddress,
          PERMISSION_IDS.UPGRADE_DAO_PERMISSION_ID
        )
      );
    });

    it('successfuly updates DAO contract', async () => {
      const iface = new ethers.utils.Interface(DAO__factory.abi);
      const initData = iface.encodeFunctionData('initialize', [
        dummyMetadata1,
        ownerAddress,
        dummyAddress1,
      ]);

      // function start here
      const ERC1967 = await ethers.getContractFactory('ERC1967Proxy');
      const erc1967Proxy = await ERC1967.deploy(dao.address, initData);

      const daoProxyContract = dao.attach(erc1967Proxy.address);

      await daoProxyContract.grant(
        daoProxyContract.address,
        ownerAddress,
        PERMISSION_IDS.UPGRADE_DAO_PERMISSION_ID
      );

      await dao.attach(erc1967Proxy.address).upgradeTo(dao.address);

      await expect(dao.attach(erc1967Proxy.address).upgradeTo(dao.address)).to
        .not.be.reverted;
    });
  });
});
