import {
  assert,
  afterEach,
  beforeAll,
  clearStore,
  dataSourceMock,
  test,
  describe,
} from 'matchstick-as';
import {
  ADDRESS_FIVE,
  ADDRESS_ONE,
  ADDRESS_SIX,
  ADDRESS_TWO,
  ONE_ETH,
} from '../constants';
import {createNewERC20TransferEvent} from './utils';
import {handleTransfer} from '../../src/packages/token/governance-erc20';
import {Address, BigInt, DataSourceContext} from '@graphprotocol/graph-ts';
import {TokenVotingMember} from '../../generated/schema';

describe('Governance ERC20', () => {
  beforeAll(() => {
    const context = new DataSourceContext();
    context.setString('pluginId', ADDRESS_SIX);
    dataSourceMock.setContext(context);
  });

  afterEach(() => {
    clearStore();
  });

  describe('handleTransfer', () => {
    test('it should create a new member of from', () => {
      const mockEvent = createNewERC20TransferEvent(
        ADDRESS_ONE,
        ADDRESS_TWO,
        ONE_ETH
      );

      handleTransfer(mockEvent);

      const fromUserId = ADDRESS_ONE.concat('_').concat(ADDRESS_SIX);
      assert.fieldEquals('TokenVotingMember', fromUserId, 'id', fromUserId);
      assert.fieldEquals(
        'TokenVotingMember',
        fromUserId,
        'address',
        ADDRESS_ONE
      );
      assert.fieldEquals(
        'TokenVotingMember',
        fromUserId,
        'plugin',
        ADDRESS_SIX
      );
      assert.fieldEquals(
        'TokenVotingMember',
        fromUserId,
        'balance',
        `-${ONE_ETH}`
      );
    });

    test('it should create a new member of to', () => {
      const mockEvent = createNewERC20TransferEvent(
        ADDRESS_ONE,
        ADDRESS_TWO,
        ONE_ETH
      );

      handleTransfer(mockEvent);

      const toUserId = ADDRESS_TWO.concat('_').concat(ADDRESS_SIX);
      assert.fieldEquals('TokenVotingMember', toUserId, 'id', toUserId);
      assert.fieldEquals('TokenVotingMember', toUserId, 'address', ADDRESS_TWO);
      assert.fieldEquals('TokenVotingMember', toUserId, 'plugin', ADDRESS_SIX);
      assert.fieldEquals('TokenVotingMember', toUserId, 'balance', ONE_ETH);
    });

    test('it should update an existing from entity', () => {
      const fromUserId = ADDRESS_ONE.concat('_').concat(ADDRESS_SIX);

      const user = new TokenVotingMember(fromUserId);
      user.address = Address.fromString(ADDRESS_ONE);
      user.plugin = ADDRESS_FIVE; // uses other plugin address to make sure that the code reuses the entity
      user.balance = BigInt.fromString(ONE_ETH).times(BigInt.fromString('10'));
      user.save();

      const mockEvent = createNewERC20TransferEvent(
        ADDRESS_ONE,
        ADDRESS_TWO,
        ONE_ETH
      );

      handleTransfer(mockEvent);
      assert.fieldEquals('TokenVotingMember', fromUserId, 'id', fromUserId);
      assert.fieldEquals(
        'TokenVotingMember',
        fromUserId,
        'address',
        ADDRESS_ONE
      );
      assert.fieldEquals(
        'TokenVotingMember',
        fromUserId,
        'plugin',
        ADDRESS_FIVE
      );
      assert.fieldEquals(
        'TokenVotingMember',
        fromUserId,
        'balance',
        BigInt.fromString(ONE_ETH)
          .times(BigInt.fromString('9'))
          .toString()
      );
    });

    test('it should update an existing to entity', () => {
      const toUserId = ADDRESS_TWO.concat('_').concat(ADDRESS_SIX);

      const user = new TokenVotingMember(toUserId);
      user.address = Address.fromString(ADDRESS_TWO);
      user.plugin = ADDRESS_FIVE; // uses other plugin address to make sure that the code reuses the entity
      user.balance = BigInt.fromString(ONE_ETH).times(BigInt.fromString('10'));
      user.save();

      const mockEvent = createNewERC20TransferEvent(
        ADDRESS_ONE,
        ADDRESS_TWO,
        ONE_ETH
      );

      handleTransfer(mockEvent);
      assert.fieldEquals('TokenVotingMember', toUserId, 'id', toUserId);
      assert.fieldEquals('TokenVotingMember', toUserId, 'address', ADDRESS_TWO);
      assert.fieldEquals('TokenVotingMember', toUserId, 'plugin', ADDRESS_FIVE);
      assert.fieldEquals(
        'TokenVotingMember',
        toUserId,
        'balance',
        BigInt.fromString(ONE_ETH)
          .times(BigInt.fromString('11'))
          .toString()
      );
    });
  });
});
