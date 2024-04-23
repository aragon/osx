import {
  DAO,
  ERC20Mock,
  ERC20Mock__factory,
  ERC721Mock,
  ERC721Mock__factory,
  ERC1155Mock,
  ERC1155Mock__factory,
  GasConsumer__factory,
  DAO__factory,
  IDAO__factory,
  IERC165__factory,
  IERC721Receiver__factory,
  IERC1155Receiver__factory,
  IERC1271__factory,
  IEIP4824__factory,
  IProtocolVersion__factory,
  PermissionConditionMock__factory,
  PermissionConditionMock,
} from '../../../typechain';
import {DAO__factory as DAO_V1_0_0__factory} from '../../../typechain/@aragon/osx-v1.0.1/core/dao/DAO.sol';
import {DAO__factory as DAO_V1_3_0__factory} from '../../../typechain/@aragon/osx-v1.3.0/core/dao/DAO.sol';
import {ExecutedEvent} from '../../../typechain/DAO';
import {
  getActions,
  getERC1155TransferAction,
  getERC20TransferAction,
  getERC721TransferAction,
  TOKEN_INTERFACE_IDS,
} from '../../test-utils/dao';
import {ZERO_BYTES32, daoExampleURI} from '../../test-utils/dao';
import {osxContractsVersion} from '../../test-utils/protocol-version';
import {deployWithProxy} from '../../test-utils/proxy';
import {
  deployAndUpgradeFromToCheck,
  deployAndUpgradeSelfCheck,
} from '../../test-utils/uups-upgradeable';
import {ANY_ADDR} from '../permission/permission-manager';
import {UNREGISTERED_INTERFACE_RETURN} from './callback-handler';
import {
  findEvent,
  flipBit,
  getInterfaceId,
  DAO_PERMISSIONS,
  getProtocolVersion,
  IMPLICIT_INITIAL_PROTOCOL_VERSION,
} from '@aragon/osx-commons-sdk';
import {smock} from '@defi-wonderland/smock';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import chai, {expect} from 'chai';
import {Contract, ContractFactory} from 'ethers';
import {ethers} from 'hardhat';

chai.use(smock.matchers);

const errorSignature = '0x08c379a0'; // first 4 bytes of Error(string)

const dummyAddress1 = '0x0000000000000000000000000000000000000001';
const dummyAddress2 = '0x0000000000000000000000000000000000000002';
const dummyMetadata1 = '0x0001';
const dummyMetadata2 = '0x0002';
const MAX_ACTIONS = 256;

const OZ_INITIALIZED_SLOT_POSITION = 0;
const REENTRANCY_STATUS_SLOT_POSITION = 304;

const EMPTY_DATA = '0x';

const EVENTS = {
  MetadataSet: 'MetadataSet',
  TrustedForwarderSet: 'TrustedForwarderSet',
  DAOCreated: 'DAOCreated',
  Granted: 'Granted',
  Revoked: 'Revoked',
  Deposited: 'Deposited',
  Executed: 'Executed',
  NativeTokenDeposited: 'NativeTokenDeposited',
  StandardCallbackRegistered: 'StandardCallbackRegistered',
  CallbackReceived: 'CallbackReceived',
};

export const VALID_ERC1271_SIGNATURE = '0x1626ba7e';
export const INVALID_ERC1271_SIGNATURE = '0xffffffff';

describe('DAO', function () {
  let signers: SignerWithAddress[];
  let ownerAddress: string;
  let dao: DAO;
  let DAO: DAO__factory;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    DAO = new DAO__factory(signers[0]);
    dao = await deployWithProxy<DAO>(DAO);
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
        DAO_PERMISSIONS.SET_METADATA_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        DAO_PERMISSIONS.EXECUTE_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        DAO_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        DAO_PERMISSIONS.SET_TRUSTED_FORWARDER_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        DAO_PERMISSIONS.REGISTER_STANDARD_CALLBACK_PERMISSION_ID
      ),
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
      ).to.be.revertedWith('Initializable: contract is already initialized');
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
    });

    it('sets OZs `_initialized` at storage slot [0] to 3', async () => {
      expect(
        ethers.BigNumber.from(
          await ethers.provider.getStorageAt(
            dao.address,
            OZ_INITIALIZED_SLOT_POSITION
          )
        ).toNumber()
      ).to.equal(3);
    });

    it('sets the `_reentrancyStatus` at storage slot [304] to `_NOT_ENTERED = 1`', async () => {
      expect(
        ethers.BigNumber.from(
          await ethers.provider.getStorageAt(
            dao.address,
            REENTRANCY_STATUS_SLOT_POSITION
          )
        ).toNumber()
      ).to.equal(1);
    });
  });

  describe('initializeFrom', async () => {
    it('reverts if trying to upgrade from a different major release', async () => {
      const uninitializedDao = await deployWithProxy<DAO>(DAO);

      await expect(uninitializedDao.initializeFrom([0, 1, 0], EMPTY_DATA))
        .to.be.revertedWithCustomError(
          dao,
          'ProtocolVersionUpgradeNotSupported'
        )
        .withArgs([0, 1, 0]);
    });

    it('increments `_initialized` to `3`', async () => {
      // Create an unitialized DAO.
      const uninitializedDao = await deployWithProxy<DAO>(DAO);

      // Expect the contract to be uninitialized  with `_initialized = 0`.
      expect(
        ethers.BigNumber.from(
          await ethers.provider.getStorageAt(
            uninitializedDao.address,
            OZ_INITIALIZED_SLOT_POSITION
          )
        ).toNumber()
      ).to.equal(0);

      // Call `initializeFrom` with version 1.2.0.
      await expect(uninitializedDao.initializeFrom([1, 2, 0], EMPTY_DATA)).to
        .not.be.reverted;

      // Expect the contract to be initialized with `_initialized = 3`.
      expect(
        ethers.BigNumber.from(
          await ethers.provider.getStorageAt(
            uninitializedDao.address,
            OZ_INITIALIZED_SLOT_POSITION
          )
        ).toNumber()
      ).to.equal(3);
    });

    it('initializes `_reentrancyStatus` for versions < 1.3.0', async () => {
      // Create an uninitialized DAO.
      const uninitializedDao = await deployWithProxy<DAO>(DAO);

      // Expect the contract to be uninitialized  with `_reentrancyStatus = 0`.

      expect(
        ethers.BigNumber.from(
          await ethers.provider.getStorageAt(
            uninitializedDao.address,
            REENTRANCY_STATUS_SLOT_POSITION
          )
        ).toNumber()
      ).to.equal(0);

      // Call `initializeFrom` with version 1.2.0.
      await expect(uninitializedDao.initializeFrom([1, 2, 0], EMPTY_DATA)).to
        .not.be.reverted;

      // Expect the contract to be initialized with `_reentrancyStatus = 1`.
      expect(
        ethers.BigNumber.from(
          await ethers.provider.getStorageAt(
            uninitializedDao.address,
            REENTRANCY_STATUS_SLOT_POSITION
          )
        ).toNumber()
      ).to.equal(1);
    });

    it('does not initialize `_reentrancyStatus` for versions >= 1.3.0', async () => {
      // Create an uninitialized DAO.
      const uninitializedDao = await deployWithProxy<DAO>(DAO);

      // Expect the contract to be uninitialized  with `_reentrancyStatus = 0`.

      expect(
        ethers.BigNumber.from(
          await ethers.provider.getStorageAt(
            uninitializedDao.address,
            REENTRANCY_STATUS_SLOT_POSITION
          )
        ).toNumber()
      ).to.equal(0);

      // Call `initializeFrom` with version 1.3.0.
      await expect(uninitializedDao.initializeFrom([1, 3, 0], EMPTY_DATA)).to
        .not.be.reverted;

      // Expect `_reentrancyStatus` to remain unchanged.

      expect(
        ethers.BigNumber.from(
          await ethers.provider.getStorageAt(
            uninitializedDao.address,
            REENTRANCY_STATUS_SLOT_POSITION
          )
        ).toNumber()
      ).to.equal(0);
    });
  });

  describe('Upgrades', async () => {
    let legacyContractFactory: ContractFactory;
    let currentContractFactory: ContractFactory;
    let initArgs: any;

    before(() => {
      currentContractFactory = new DAO__factory(signers[0]);

      initArgs = {
        metadata: dummyMetadata1,
        initialOwner: signers[0].address,
        trustedForwarder: dummyAddress1,
        daoURI: daoExampleURI,
      };
    });

    it('upgrades to a new implementation', async () => {
      await deployAndUpgradeSelfCheck(
        signers[0],
        signers[1],
        initArgs,
        'initialize',
        currentContractFactory,
        DAO_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID
      );
    });

    it('upgrades from v1.0.0', async () => {
      legacyContractFactory = new DAO_V1_0_0__factory(signers[0]);

      const {fromImplementation, toImplementation} =
        await deployAndUpgradeFromToCheck(
          signers[0],
          signers[1],
          initArgs,
          'initialize',
          legacyContractFactory,
          currentContractFactory,
          DAO_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID
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
      expect(toProtocolVersion).to.deep.equal(osxContractsVersion());
    });

    it('from v1.3.0', async () => {
      legacyContractFactory = new DAO_V1_3_0__factory(signers[0]);

      const {fromImplementation, toImplementation} =
        await deployAndUpgradeFromToCheck(
          signers[0],
          signers[1],
          initArgs,
          'initialize',
          legacyContractFactory,
          currentContractFactory,
          DAO_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID
        );
      expect(toImplementation).to.not.equal(fromImplementation);

      const fromProtocolVersion = await getProtocolVersion(
        legacyContractFactory.attach(fromImplementation)
      );
      const toProtocolVersion = await getProtocolVersion(
        currentContractFactory.attach(toImplementation)
      );

      expect(fromProtocolVersion).to.not.deep.equal(toProtocolVersion);
      expect(fromProtocolVersion).to.deep.equal([1, 3, 0]);
      expect(toProtocolVersion).to.deep.equal(osxContractsVersion());
    });
  });

  describe('ERC-165', async () => {
    it('does not support the empty interface', async () => {
      expect(await dao.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165` interface', async () => {
      const iface = IERC165__factory.createInterface();
      expect(await dao.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IDAO` interface', async () => {
      const iface = IDAO__factory.createInterface();
      expect(getInterfaceId(iface)).to.equal('0x9385547e'); // the interfaceID from IDAO v1.0.0
      expect(await dao.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IProtocolVersion` interface', async () => {
      const iface = IProtocolVersion__factory.createInterface();
      expect(await dao.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IERC1271` interface', async () => {
      const iface = IERC1271__factory.createInterface();
      expect(await dao.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IEIP4824` interface', async () => {
      const iface = IEIP4824__factory.createInterface();
      expect(await dao.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IERC721Receiver` interface', async () => {
      expect(
        await dao.supportsInterface(TOKEN_INTERFACE_IDS.erc1155InterfaceId)
      ).to.be.true;
    });

    it('supports the `IERC1155Receiver` interface', async () => {
      expect(
        await dao.supportsInterface(TOKEN_INTERFACE_IDS.erc1155InterfaceId)
      ).to.be.true;
    });
  });

  describe('Protocol version', async () => {
    it('returns the current protocol version', async () => {
      expect(await dao.protocolVersion()).to.deep.equal(osxContractsVersion());
    });
  });

  describe('setTrustedForwarder:', async () => {
    it('reverts if the sender lacks the required permissionId', async () => {
      await dao.revoke(
        dao.address,
        ownerAddress,
        DAO_PERMISSIONS.SET_TRUSTED_FORWARDER_PERMISSION_ID
      );

      await expect(dao.setTrustedForwarder(dummyAddress2))
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(
          dao.address,
          ownerAddress,
          DAO_PERMISSIONS.SET_TRUSTED_FORWARDER_PERMISSION_ID
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
        DAO_PERMISSIONS.SET_METADATA_PERMISSION_ID
      );

      await expect(dao.setMetadata(dummyMetadata1))
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(
          dao.address,
          ownerAddress,
          DAO_PERMISSIONS.SET_METADATA_PERMISSION_ID
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
        DAO_PERMISSIONS.EXECUTE_PERMISSION_ID
      );

      await expect(dao.execute(ZERO_BYTES32, [data.succeedAction], 0))
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(
          dao.address,
          ownerAddress,
          DAO_PERMISSIONS.EXECUTE_PERMISSION_ID
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

    it('reverts on re-entrant actions', async () => {
      // Grant DAO execute permission on itself.
      await dao.grant(
        dao.address,
        dao.address,
        DAO_PERMISSIONS.EXECUTE_PERMISSION_ID
      );

      // Create a reentrant action calling `dao.execute` again.
      const reentrantAction = {
        to: dao.address,
        data: dao.interface.encodeFunctionData('execute', [
          ZERO_BYTES32,
          [data.succeedAction],
          0,
        ]),
        value: 0,
      };

      // Create  an action array with an normal action and an reentrant action.
      const actions = [data.succeedAction, reentrantAction];

      // Expect the execution of the reentrant action (second action) to fail.
      await expect(dao.execute(ZERO_BYTES32, actions, 0))
        .to.be.revertedWithCustomError(dao, 'ActionFailed')
        .withArgs(1);
    });

    it('succeeds if action is failable but allowFailureMap allows it', async () => {
      let num = ethers.BigNumber.from(0);
      num = flipBit(0, num);

      const tx = await dao.execute(ZERO_BYTES32, [data.failAction], num);
      const event = findEvent<ExecutedEvent>(await tx.wait(), EVENTS.Executed);

      // Check that failAction's revertMessage was correctly stored in the dao's execResults
      expect(event.args.execResults[0]).to.includes(data.failActionMessage);
      expect(event.args.execResults[0]).to.includes(errorSignature);
    });

    it('returns the correct result if action succeeds', async () => {
      const tx = await dao.execute(ZERO_BYTES32, [data.succeedAction], 0);
      const event = findEvent<ExecutedEvent>(await tx.wait(), EVENTS.Executed);
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
      let event = findEvent<ExecutedEvent>(await tx.wait(), EVENTS.Executed);

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
      const tx = await dao.execute(ZERO_BYTES32, [data.succeedAction], 0);
      const rc = await tx.wait();

      const event = findEvent<ExecutedEvent>(rc, 'Executed');
      expect(event.args.actor).to.equal(ownerAddress);
      expect(event.args.callId).to.equal(ZERO_BYTES32);
      expect(event.args.actions.length).to.equal(1);
      expect(event.args.actions[0].to).to.equal(data.succeedAction.to);
      expect(event.args.actions[0].value).to.equal(data.succeedAction.value);
      expect(event.args.actions[0].data).to.equal(data.succeedAction.data);
      expect(event.args.execResults[0]).to.equal(data.successActionResult);
      expect(event.args.allowFailureMap).to.equal(0);
    });

    it('reverts if failure is allowed but not enough gas is provided (many actions)', async () => {
      const GasConsumer = new GasConsumer__factory(signers[0]);
      let gasConsumer = await GasConsumer.deploy();

      // Prepare an action array calling `consumeGas` twenty times.
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
      );

      // Provide too little gas so that the last `to.call` fails, but the remaining gas is enough to finish the subsequent operations.
      await expect(
        dao.execute(ZERO_BYTES32, [gasConsumingAction], allowFailureMap, {
          gasLimit: expectedGas.sub(3000),
        })
      ).to.be.revertedWithCustomError(dao, 'InsufficientGas');

      // Provide enough gas so that the entire call passes.
      await expect(
        dao.execute(ZERO_BYTES32, [gasConsumingAction], allowFailureMap, {
          gasLimit: expectedGas,
        })
      ).to.not.be.reverted;
    });

    it('reverts if failure is allowed but not enough gas is provided (one action)', async () => {
      const GasConsumer = new GasConsumer__factory(signers[0]);
      let gasConsumer = await GasConsumer.deploy();

      // Prepare an action array calling `consumeGas` one times.
      const gasConsumingAction = {
        to: gasConsumer.address,
        data: GasConsumer.interface.encodeFunctionData('consumeGas', [1]),
        value: 0,
      };

      let allowFailureMap = ethers.BigNumber.from(0);
      allowFailureMap = flipBit(0, allowFailureMap); // allow the action to fail

      const expectedGas = await dao.estimateGas.execute(
        ZERO_BYTES32,
        [gasConsumingAction],
        allowFailureMap
      );

      // Provide too little gas so that the last `to.call` fails, but the remaining gas is enough to finish the subsequent operations.
      await expect(
        dao.execute(ZERO_BYTES32, [gasConsumingAction], allowFailureMap, {
          gasLimit: expectedGas.sub(10000),
        })
      ).to.be.revertedWithCustomError(dao, 'InsufficientGas');

      // Provide enough gas so that the entire call passes.
      await expect(
        dao.execute(ZERO_BYTES32, [gasConsumingAction], allowFailureMap, {
          gasLimit: expectedGas,
        })
      ).to.not.be.reverted;
    });

    describe('Transferring tokens', async () => {
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
        let erc20Token: ERC20Mock;

        beforeEach(async () => {
          const ERC20Mock = new ERC20Mock__factory(signers[0]);
          erc20Token = await ERC20Mock.deploy('name', 'symbol');
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
        let erc721Token: ERC721Mock;

        beforeEach(async () => {
          const ERC721Mock = new ERC721Mock__factory(signers[0]);
          erc721Token = await ERC721Mock.deploy('name', 'symbol');
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
        let erc1155Token: ERC1155Mock;

        beforeEach(async () => {
          const ERC1155Mock = new ERC1155Mock__factory(signers[0]);
          erc1155Token = await ERC1155Mock.deploy('URI');
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
    let erc721Token: ERC721Mock;
    let erc1155Token: ERC1155Mock;

    beforeEach(async () => {
      const ERC1155Mock = new ERC1155Mock__factory(signers[0]);
      erc1155Token = await ERC1155Mock.deploy('URI');

      const ERC721Mock = new ERC721Mock__factory(signers[0]);
      erc721Token = await ERC721Mock.deploy('name', 'symbol');

      await erc721Token.mint(ownerAddress, 1);
      await erc1155Token.mint(ownerAddress, 1, 2);
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
      const IERC721 = IERC721Receiver__factory.createInterface();

      const encoded = IERC721.encodeFunctionData('onERC721Received', [
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
      const IERC1155 = IERC1155Receiver__factory.createInterface();

      // encode onERC1155Received call
      const erc1155ReceivedEncoded = IERC1155.encodeFunctionData(
        'onERC1155Received',
        [ownerAddress, ownerAddress, 1, 1, '0x']
      );

      // encode onERC1155BatchReceived call
      const erc1155BatchReceivedEncoded = IERC1155.encodeFunctionData(
        'onERC1155BatchReceived',
        [ownerAddress, ownerAddress, [1], [1], '0x']
      );

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
    let token: ERC20Mock;

    beforeEach(async () => {
      const ERC20Mock = new ERC20Mock__factory(signers[0]);
      token = await ERC20Mock.deploy('name', 'symbol');
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
        DAO_PERMISSIONS.REGISTER_STANDARD_CALLBACK_PERMISSION_ID
      );

      await expect(
        dao.registerStandardCallback('0x00000001', '0x00000001', '0x00000001')
      )
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(
          dao.address,
          ownerAddress,
          DAO_PERMISSIONS.REGISTER_STANDARD_CALLBACK_PERMISSION_ID
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
    let signer: SignerWithAddress;
    let caller: SignerWithAddress;
    let otherCaller: SignerWithAddress;

    let message: string;
    let hash: string;
    let signature: string;

    let mockConditionFactory: PermissionConditionMock__factory;

    beforeEach(async () => {
      caller = signers[0];
      signer = signers[1];
      otherCaller = signers[2];

      mockConditionFactory = new PermissionConditionMock__factory(caller);

      message = 'The message!';
      hash = ethers.utils.hashMessage(message);
      signature = await signer.signMessage(message);
    });

    it('treats signatures as invalid by default if no permission is set', async () => {
      expect(
        await dao.connect(caller).isValidSignature(hash, signature)
      ).to.equal(INVALID_ERC1271_SIGNATURE);
    });

    it('allows caller-specific signature validation bypassing', async () => {
      // Grant the permission to validate signatures to the caller without a condition
      await dao.grant(
        dao.address,
        caller.address,
        DAO_PERMISSIONS.VALIDATE_SIGNATURE_PERMISSION_ID
      );

      // The caller can validate signatures now.
      expect(await dao.connect(caller).isValidSignature(hash, signature)).to.not
        .be.reverted;

      // Because the caller is allowed unconditionally, the signature is always valid.
      expect(
        await dao.connect(caller).isValidSignature(hash, signature)
      ).to.equal(VALID_ERC1271_SIGNATURE);

      // Because the other caller is not allowed, the signature is always invalid.
      expect(
        await dao.connect(otherCaller).isValidSignature(hash, signature)
      ).to.equal(INVALID_ERC1271_SIGNATURE);
    });

    it('allows caller-specific signature validation conditions', async () => {
      // Try to call with caller but caller has no permission
      expect(await dao.connect(caller).isValidSignature(hash, signature))
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs();

      // Deploy a mock condition
      const mockCondition = await mockConditionFactory.deploy();

      // Grant the permission to validate signatures to the caller
      await dao.grantWithCondition(
        dao.address,
        caller.address,
        DAO_PERMISSIONS.VALIDATE_SIGNATURE_PERMISSION_ID,
        mockCondition.address
      );

      // The caller can validate signatures now.
      expect(await dao.connect(caller).isValidSignature(hash, signature)).to.not
        .be.reverted;

      // Check that the mock condition will answer true.
      expect(await mockCondition.answer()).to.be.true;

      // Check that the signature is valid in this case.
      expect(
        await dao.connect(caller).isValidSignature(hash, signature)
      ).to.equal(VALID_ERC1271_SIGNATURE);

      // Set the mock condition to answer false.
      await mockCondition.setAnswer(false);

      // Check that the mock condition will answer false.
      expect(await mockCondition.answer()).to.be.false;

      // Check that the signature is invalid in this case.
      expect(
        await dao.connect(caller).isValidSignature(hash, signature)
      ).to.equal(INVALID_ERC1271_SIGNATURE);
    });

    it('allows generic signature validation by granting to ANY_ADDR', async () => {
      // Deploy a mock condition
      const mockCondition = await mockConditionFactory.deploy();

      // Grant the permission to validate signatures to the ANY caller conditionally (granting it unconditionally is not possible in combination with `_who: ANY_ADDR`)
      await dao.grantWithCondition(
        dao.address,
        ANY_ADDR,
        DAO_PERMISSIONS.VALIDATE_SIGNATURE_PERMISSION_ID,
        mockCondition.address
      );

      // Check that the mock condition will answer true.
      expect(await mockCondition.answer()).to.be.true;

      // Any caller can validate signatures using this condition now.
      expect(
        await dao.connect(caller).isValidSignature(hash, signature)
      ).to.equal(VALID_ERC1271_SIGNATURE);
      expect(
        await dao.connect(otherCaller).isValidSignature(hash, signature)
      ).to.equal(VALID_ERC1271_SIGNATURE);

      // Set the mock condition to answer false.
      await mockCondition.setAnswer(false);

      // Check that the mock condition will answer false.
      expect(await mockCondition.answer()).to.be.false;

      // Check that the signature is invalid in this case for every caller.
      expect(
        await dao.connect(caller).isValidSignature(hash, signature)
      ).to.equal(INVALID_ERC1271_SIGNATURE);
      expect(
        await dao.connect(otherCaller).isValidSignature(hash, signature)
      ).to.equal(INVALID_ERC1271_SIGNATURE);
    });

    context(
      'A caller-specific and a generic condition are both set',
      async () => {
        let specificMockCondition: PermissionConditionMock;
        let genericMockCondition: PermissionConditionMock;

        beforeEach(async () => {
          // Setup the specific condition for a specific caller
          specificMockCondition = await mockConditionFactory.deploy();
          await dao.grantWithCondition(
            dao.address,
            caller.address,
            DAO_PERMISSIONS.VALIDATE_SIGNATURE_PERMISSION_ID,
            specificMockCondition.address
          );

          // Setup the generic condition for ANY caller
          genericMockCondition = await mockConditionFactory.deploy();
          await dao.grantWithCondition(
            dao.address,
            ANY_ADDR,
            DAO_PERMISSIONS.VALIDATE_SIGNATURE_PERMISSION_ID,
            genericMockCondition.address
          );
        });

        it('returns valid if both conditions are met', async () => {
          expect(
            await dao.connect(caller).isValidSignature(hash, signature)
          ).to.equal(VALID_ERC1271_SIGNATURE);
        });

        it('returns valid if only the specific condition is met', async () => {
          await genericMockCondition.setAnswer(false);
          expect(
            await dao.connect(caller).isValidSignature(hash, signature)
          ).to.equal(VALID_ERC1271_SIGNATURE);
        });

        it('returns invalid if the specific condition is not met although the generic condition is met (no fallback)', async () => {
          await specificMockCondition.setAnswer(false);
          expect(
            await dao.connect(caller).isValidSignature(hash, signature)
          ).to.equal(INVALID_ERC1271_SIGNATURE);
        });

        it('returns invalid if both conditions are not met', async () => {
          await specificMockCondition.setAnswer(false);
          await genericMockCondition.setAnswer(false);
          expect(
            await dao.connect(caller).isValidSignature(hash, signature)
          ).to.equal(INVALID_ERC1271_SIGNATURE);
        });
      }
    );

    it('should revert if `setSignatureValidator` is called', async () => {
      await expect(
        dao
          .connect(caller)
          .setSignatureValidator(ethers.Wallet.createRandom().address)
      ).to.be.revertedWithCustomError(dao, 'FunctionRemoved');
    });
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
        .to.emit(dao, 'NewURI')
        .withArgs(newURI);
    });

    it('should revert if the sender lacks the permission to update the URI', async () => {
      await dao.revoke(
        dao.address,
        ownerAddress,
        DAO_PERMISSIONS.SET_METADATA_PERMISSION_ID
      );

      await expect(dao.setDaoURI('https://new.example.com'))
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(
          dao.address,
          ownerAddress,
          DAO_PERMISSIONS.SET_METADATA_PERMISSION_ID
        );
    });

    it('should return the DAO URI', async () => {
      expect(await dao.daoURI()).to.be.eq(daoExampleURI);
    });
  });
});
