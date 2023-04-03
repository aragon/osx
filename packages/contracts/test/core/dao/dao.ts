import chai, {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  DAO,
  TestERC1155,
  TestERC20,
  TestERC721,
  IERC1271__factory,
  GasConsumer__factory,
} from '../../../typechain';
import {findEvent, DAO_EVENTS} from '../../../utils/event';
import {flipBit} from '../../test-utils/bitmap';

import {
  getActions,
  getERC1155TransferAction,
  getERC20TransferAction,
  getERC721TransferAction,
  TOKEN_INTERFACE_IDS,
} from '../../test-utils/dao';

import {getInterfaceID} from '../../test-utils/interfaces';
import {OZ_ERRORS} from '../../test-utils/error';
import {smock} from '@defi-wonderland/smock';
import {deployWithProxy} from '../../test-utils/proxy';
import {UNREGISTERED_INTERFACE_RETURN} from './callback-handler';
import {shouldUpgradeCorrectly} from '../../test-utils/uups-upgradeable';
import {UPGRADE_PERMISSIONS} from '../../test-utils/permissions';
import {ZERO_BYTES32, daoExampleURI} from '../../test-utils/dao';
import {ExecutedEvent} from '../../../typechain/DAO';

chai.use(smock.matchers);

const errorSignature = '0x08c379a0'; // first 4 bytes of Error(string)

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
  Executed: 'Executed',
  NativeTokenDeposited: 'NativeTokenDeposited',
  SignatureValidatorSet: 'SignatureValidatorSet',
  StandardCallbackRegistered: 'StandardCallbackRegistered',
  CallbackReceived: 'CallbackReceived',
};

const PERMISSION_IDS = {
  UPGRADE_DAO_PERMISSION_ID: UPGRADE_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID,
  SET_METADATA_PERMISSION_ID: ethers.utils.id('SET_METADATA_PERMISSION'),
  EXECUTE_PERMISSION_ID: ethers.utils.id('EXECUTE_PERMISSION'),
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

  beforeEach(async function () {
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
    ]);

    this.upgrade = {
      contract: dao,
      dao: dao,
      user: signers[8],
    };
  });

  shouldUpgradeCorrectly(
    UPGRADE_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID,
    'Unauthorized'
  );

  it('does not support the empty interface', async () => {
    expect(await dao.supportsInterface('0xffffffff')).to.be.false;
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

    it('initializes with the correct trusted forwarder', async () => {
      expect(await dao.getTrustedForwarder()).to.be.equal(dummyAddress1);
    });

    it('initializes with the correct token interfaces', async () => {
      const callbacksReturned = await Promise.all([
        ethers.provider.call({
          to: dao.address,
          data: TOKEN_INTERFACE_IDS.erc721ReceivedId,
        }),
        ethers.provider.call({
          to: dao.address,
          data: TOKEN_INTERFACE_IDS.erc1155ReceivedId,
        }),
        ethers.provider.call({
          to: dao.address,
          data: TOKEN_INTERFACE_IDS.erc1155BatchReceivedId,
        }),
      ]);

      // confirm callbacks are registered.
      expect(callbacksReturned[0]).to.equal(
        TOKEN_INTERFACE_IDS.erc721ReceivedId + '00'.repeat(28)
      );
      expect(callbacksReturned[1]).to.equal(
        TOKEN_INTERFACE_IDS.erc1155ReceivedId + '00'.repeat(28)
      );
      expect(callbacksReturned[2]).to.equal(
        TOKEN_INTERFACE_IDS.erc1155BatchReceivedId + '00'.repeat(28)
      );

      // confirm interfaces are registered.
      expect(
        await dao.supportsInterface(TOKEN_INTERFACE_IDS.erc721InterfaceId)
      ).to.equal(true);
      expect(
        await dao.supportsInterface(TOKEN_INTERFACE_IDS.erc1155InterfaceId)
      ).to.equal(true);
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
          ownerAddress,
          PERMISSION_IDS.EXECUTE_PERMISSION_ID
        );
    });

    it('reverts if array of actions is too big', async () => {
      let actions = [];
      for (let i = 0; i < MAX_ACTIONS; i++) {
        actions[i] = data.succeedAction;
      }

      await expect(dao.execute(ZERO_BYTES32, actions, 0)).not.to.be.reverted;

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
      const event = await findEvent<ExecutedEvent>(tx, EVENTS.Executed);

      // Check that failAction's revertMessage was correctly stored in the dao's execResults
      expect(event.args.execResults[0]).to.includes(data.failActionMessage);
      expect(event.args.execResults[0]).to.includes(errorSignature);
    });

    it('returns the correct result if action succeeds', async () => {
      const tx = await dao.execute(ZERO_BYTES32, [data.succeedAction], 0);
      const event = await findEvent<ExecutedEvent>(tx, EVENTS.Executed);
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
      let event = await findEvent<ExecutedEvent>(tx, EVENTS.Executed);

      expect(event.args.actor).to.equal(ownerAddress);
      expect(event.args.callId).to.equal(ZERO_BYTES32);
      expect(event.args.allowFailureMap).to.equal(allowFailureMap);

      // construct the failureMap which only has those
      // bits set at indexes where actions failed
      let failureMap = ethers.BigNumber.from(0);
      for (let i = 0; i < 3; i++) {
        failureMap = flipBit(i, failureMap);
      }
      // Check that dao correctly generated failureMap
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

      const event = await findEvent<ExecutedEvent>(tx, DAO_EVENTS.EXECUTED);
      expect(event.args.actor).to.equal(ownerAddress);
      expect(event.args.callId).to.equal(ZERO_BYTES32);
      expect(event.args.actions.length).to.equal(1);
      expect(event.args.actions[0].to).to.equal(data.succeedAction.to);
      expect(event.args.actions[0].value).to.equal(data.succeedAction.value);
      expect(event.args.actions[0].data).to.equal(data.succeedAction.data);
      expect(event.args.execResults[0]).to.equal(data.successActionResult);
      expect(event.args.allowFailureMap).to.equal(0);
    });

    it('reverts if failure is allowed but not enough gas is provided', async () => {
      const GasConsumer = new GasConsumer__factory(signers[0]);
      let gasConsumer = await GasConsumer.deploy();

      const gasConsumingAction = {
        to: gasConsumer.address,
        data: GasConsumer.interface.encodeFunctionData('consumeGas', [20]),
        value: 0,
      };

      let allowFailureMap = ethers.BigNumber.from(0);
      allowFailureMap = flipBit(0, allowFailureMap); // allow the action to fail

      const expectedGas = await dao.estimateGas.execute(
        ZERO_BYTES32,
        [gasConsumingAction],
        allowFailureMap
      ); // exact gas required: 495453

      // Providing less gas causes the `to.call` of the `gasConsumingAction` to fail, but is still enough for the overall `dao.execute` call to finish successfully.
      await expect(
        dao.execute(ZERO_BYTES32, [gasConsumingAction], allowFailureMap, {
          gasLimit: expectedGas.sub(800),
        })
      ).to.be.revertedWithCustomError(dao, 'InsufficientGas');

      await expect(
        dao.execute(ZERO_BYTES32, [gasConsumingAction], allowFailureMap, {
          gasLimit: expectedGas,
        })
      ).to.not.be.reverted;
    });

    describe('Transfering tokens', async () => {
      const amount = ethers.utils.parseEther('1.23');
      const options = {value: amount};

      describe('ETH Transfer', async () => {
        it('reverts if transfers more eth than dao has', async () => {
          const transferAction = {
            to: signers[1].address,
            value: amount,
            data: '0x',
          };
          await expect(dao.execute(ZERO_BYTES32, [transferAction], 0)).to.be
            .reverted;
        });

        it('transfers native token(eth) to recipient', async () => {
          // put native tokens into the DAO
          await dao.deposit(
            ethers.constants.AddressZero,
            amount,
            'ref',
            options
          );

          const recipient = signers[1].address;
          const currentBalance = await ethers.provider.getBalance(recipient);

          const transferAction = {to: recipient, value: amount, data: '0x'};
          await dao.execute(ZERO_BYTES32, [transferAction], 0);
          const newBalance = await ethers.provider.getBalance(recipient);
          expect(newBalance.sub(currentBalance)).to.equal(amount);
        });
      });

      describe('ERC20 Transfer', async () => {
        let erc20Token: TestERC20;

        beforeEach(async () => {
          const TestERC20 = await ethers.getContractFactory('TestERC20');
          erc20Token = await TestERC20.deploy('name', 'symbol', 0);
        });

        it('reverts if transfers more ERC20 than dao has', async () => {
          const transferAction = getERC20TransferAction(
            erc20Token.address,
            signers[1].address,
            amount
          );

          await expect(dao.execute(ZERO_BYTES32, [transferAction], 0)).to.be
            .reverted;
        });

        it('transfers native token(eth) to recipient', async () => {
          // put ERC20 into the DAO
          await erc20Token.setBalance(dao.address, amount);

          const recipient = signers[1].address;

          const transferAction = getERC20TransferAction(
            erc20Token.address,
            recipient,
            amount
          );

          expect(await erc20Token.balanceOf(dao.address)).to.equal(amount);
          expect(await erc20Token.balanceOf(recipient)).to.equal(0);

          await dao.execute(ZERO_BYTES32, [transferAction], 0);
          expect(await erc20Token.balanceOf(dao.address)).to.equal(0);
          expect(await erc20Token.balanceOf(recipient)).to.equal(amount);
        });
      });

      describe('ERC721 Transfer', async () => {
        let erc721Token: TestERC721;

        beforeEach(async () => {
          const TestERC721 = await ethers.getContractFactory('TestERC721');
          erc721Token = await TestERC721.deploy('name', 'symbol');
        });

        it('reverts if transfers more ERC721 than dao has', async () => {
          const transferAction = getERC721TransferAction(
            erc721Token.address,
            dao.address,
            signers[1].address,
            1
          );

          await expect(dao.execute(ZERO_BYTES32, [transferAction], 0)).to.be
            .reverted;
        });

        it('transfers native ERC721(eth) to recipient', async () => {
          // put ERC721 into the DAO
          await erc721Token.mint(dao.address, 1);

          const recipient = signers[1].address;

          const transferAction = getERC721TransferAction(
            erc721Token.address,
            dao.address,
            recipient,
            1
          );

          expect(await erc721Token.balanceOf(dao.address)).to.equal(1);
          expect(await erc721Token.balanceOf(recipient)).to.equal(0);

          await dao.execute(ZERO_BYTES32, [transferAction], 0);

          expect(await erc721Token.balanceOf(dao.address)).to.equal(0);
          expect(await erc721Token.balanceOf(recipient)).to.equal(1);
        });
      });

      describe('ERC1155 Transfer', async () => {
        let erc1155Token: TestERC1155;

        beforeEach(async () => {
          const TestERC1155 = await ethers.getContractFactory('TestERC1155');
          erc1155Token = await TestERC1155.deploy('URI');
        });

        it('reverts if transfers more ERC1155 than dao has', async () => {
          const transferAction = getERC1155TransferAction(
            erc1155Token.address,
            dao.address,
            signers[1].address,
            1,
            1
          );

          await expect(dao.execute(ZERO_BYTES32, [transferAction], 0)).to.be
            .reverted;
        });

        it('transfers ERC1155 tokens to recipient', async () => {
          await erc1155Token.mint(dao.address, 1, 1);
          await erc1155Token.mint(dao.address, 2, 50);
          const recipient = signers[1].address;

          const transferAction1 = getERC1155TransferAction(
            erc1155Token.address,
            dao.address,
            signers[1].address,
            1,
            1
          );
          const transferAction2 = getERC1155TransferAction(
            erc1155Token.address,
            dao.address,
            signers[1].address,
            2,
            50
          );

          expect(await erc1155Token.balanceOf(dao.address, 1)).to.equal(1);
          expect(await erc1155Token.balanceOf(dao.address, 2)).to.equal(50);
          expect(await erc1155Token.balanceOf(recipient, 1)).to.equal(0);
          expect(await erc1155Token.balanceOf(recipient, 2)).to.equal(0);

          await dao.execute(
            ZERO_BYTES32,
            [transferAction1, transferAction2],
            0
          );
          expect(await erc1155Token.balanceOf(dao.address, 1)).to.equal(0);
          expect(await erc1155Token.balanceOf(dao.address, 2)).to.equal(0);
          expect(await erc1155Token.balanceOf(recipient, 1)).to.equal(1);
          expect(await erc1155Token.balanceOf(recipient, 2)).to.equal(50);
        });
      });
    });
  });

  describe('Deposit through direct transfer:', async () => {
    let erc721Token: TestERC721;
    let erc1155Token: TestERC1155;

    beforeEach(async () => {
      const TestERC1155 = await ethers.getContractFactory('TestERC1155');
      erc1155Token = await TestERC1155.deploy('URI');

      const TestERC721 = await ethers.getContractFactory('TestERC721');
      erc721Token = await TestERC721.deploy('name', 'symbol');

      erc721Token.mint(ownerAddress, 1);
      erc1155Token.mint(ownerAddress, 1, 2);
    });

    it('reverts if erc721 callback is not registered', async () => {
      await dao.registerStandardCallback(
        TOKEN_INTERFACE_IDS.erc721ReceivedId,
        TOKEN_INTERFACE_IDS.erc721ReceivedId,
        UNREGISTERED_INTERFACE_RETURN
      );

      await expect(
        erc721Token['safeTransferFrom(address,address,uint256)'](
          ownerAddress,
          dao.address,
          1
        )
      ).to.be.reverted;
    });

    it('successfully transfers erc721 into the dao and emits the correct callback received event', async () => {
      const ABI = ['function onERC721Received(address,address,uint256,bytes)'];
      const iface = new ethers.utils.Interface(ABI);
      const encoded = iface.encodeFunctionData('onERC721Received', [
        ownerAddress,
        ownerAddress,
        1,
        '0x',
      ]);

      await expect(
        erc721Token['safeTransferFrom(address,address,uint256)'](
          ownerAddress,
          dao.address,
          1
        )
      )
        .to.emit(dao, EVENTS.CallbackReceived)
        .withArgs(
          erc721Token.address,
          TOKEN_INTERFACE_IDS.erc721ReceivedId,
          encoded
        );
    });

    it('reverts if erc1155 callbacks are not registered', async () => {
      await dao.registerStandardCallback(
        TOKEN_INTERFACE_IDS.erc1155ReceivedId,
        TOKEN_INTERFACE_IDS.erc1155ReceivedId,
        UNREGISTERED_INTERFACE_RETURN
      );

      await dao.registerStandardCallback(
        TOKEN_INTERFACE_IDS.erc1155BatchReceivedId,
        TOKEN_INTERFACE_IDS.erc1155BatchReceivedId,
        UNREGISTERED_INTERFACE_RETURN
      );

      await expect(
        erc1155Token.safeTransferFrom(ownerAddress, dao.address, 1, 1, '0x')
      ).to.be.reverted;
      await expect(
        erc1155Token.safeBatchTransferFrom(
          ownerAddress,
          dao.address,
          [1],
          [1],
          '0x'
        )
      ).to.be.reverted;
    });

    it('successfully transfers erc1155 into the dao', async () => {
      // encode onERC1155Received call
      const erc1155ReceivedEncoded = new ethers.utils.Interface([
        'function onERC1155Received(address,address,uint256,uint256,bytes)',
      ]).encodeFunctionData('onERC1155Received', [
        ownerAddress,
        ownerAddress,
        1,
        1,
        '0x',
      ]);

      // encode onERC1155BatchReceived call
      const erc1155BatchReceivedEncoded = new ethers.utils.Interface([
        'function onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)',
      ]).encodeFunctionData('onERC1155BatchReceived', [
        ownerAddress,
        ownerAddress,
        [1],
        [1],
        '0x',
      ]);

      await expect(
        erc1155Token.safeTransferFrom(ownerAddress, dao.address, 1, 1, '0x')
      )
        .to.emit(dao, EVENTS.CallbackReceived)
        .withArgs(
          erc1155Token.address,
          TOKEN_INTERFACE_IDS.erc1155ReceivedId,
          erc1155ReceivedEncoded
        );
      await expect(
        erc1155Token.safeBatchTransferFrom(
          ownerAddress,
          dao.address,
          [1],
          [1],
          '0x'
        )
      )
        .to.emit(dao, EVENTS.CallbackReceived)
        .withArgs(
          erc1155Token.address,
          TOKEN_INTERFACE_IDS.erc1155BatchReceivedId,
          erc1155BatchReceivedEncoded
        );
    });
  });

  describe('Deposit through deposit function:', async () => {
    const amount = ethers.utils.parseEther('1.23');
    let token: TestERC20;

    beforeEach(async () => {
      const TestERC20 = await ethers.getContractFactory('TestERC20');
      token = await TestERC20.deploy('name', 'symbol', 0);
    });

    it('reverts if amount is zero', async () => {
      await expect(
        dao.deposit(ethers.constants.AddressZero, 0, 'ref')
      ).to.be.revertedWithCustomError(dao, 'ZeroAmount');
    });

    it('reverts if passed amount does not match native amount value', async () => {
      const options = {value: amount};
      const passedAmount = ethers.utils.parseEther('1.22');

      await expect(
        dao.deposit(ethers.constants.AddressZero, passedAmount, 'ref', options)
      )
        .to.be.revertedWithCustomError(dao, 'NativeTokenDepositAmountMismatch')
        .withArgs(passedAmount, amount);
    });

    it('reverts if ERC20 and native tokens are deposited at the same time', async () => {
      const options = {value: amount};
      await token.setBalance(ownerAddress, amount);

      await expect(dao.deposit(token.address, amount, 'ref', options))
        .to.be.revertedWithCustomError(dao, 'NativeTokenDepositAmountMismatch')
        .withArgs(0, amount);
    });

    it('reverts when tries to deposit ERC20 token while sender does not have token amount', async () => {
      await expect(dao.deposit(token.address, amount, 'ref')).to.be.reverted;
    });

    it('reverts when tries to deposit ERC20 token while sender does not have approved token transfer', async () => {
      await token.setBalance(ownerAddress, amount);

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
      await token.setBalance(ownerAddress, amount);
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
          ownerAddress,
          PERMISSION_IDS.REGISTER_STANDARD_CALLBACK_PERMISSION_ID
        );
    });

    it('correctly emits selector and interface id', async () => {
      await expect(
        dao.registerStandardCallback('0x00000001', '0x00000002', '0x00000001')
      )
        .to.emit(dao, EVENTS.StandardCallbackRegistered)
        .withArgs('0x00000001', '0x00000002', '0x00000001');
    });

    it('correctly sets callback selector and interface and can call later', async () => {
      const id = '0x11111111';

      // onERC721Received selector doesn't exist, so it should fail..
      await expect(
        signers[0].sendTransaction({
          to: dao.address,
          data: id,
        })
      )
        .to.be.revertedWithCustomError(dao, 'UnkownCallback')
        .withArgs(id, UNREGISTERED_INTERFACE_RETURN);

      await dao.registerStandardCallback(id, id, id);

      let onCallbackReturned = await ethers.provider.call({
        to: dao.address,
        data: id,
      });

      // TODO: ethers utils pads zero to the left. we need to pad to the right.
      expect(onCallbackReturned).to.equal(id + '00'.repeat(28));
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

  describe('hasPermission', async () => {
    const permission = ethers.utils.id('PERMISSION_TEST');

    it('returns `false` if the permission is not set', async () => {
      expect(
        await dao.hasPermission(dao.address, ownerAddress, permission, '0x')
      ).to.be.false;
    });

    it('returns `true` if permission is set', async () => {
      await dao.grant(dao.address, ownerAddress, permission);
      expect(
        await dao.hasPermission(dao.address, ownerAddress, permission, '0x')
      ).to.be.true;
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
            ownerAddress,
            PERMISSION_IDS.SET_METADATA_PERMISSION_ID
          );
      });

      it('should return the DAO URI', async () => {
        expect(await dao.daoURI()).to.be.eq(daoExampleURI);
      });
    });
  });
});
