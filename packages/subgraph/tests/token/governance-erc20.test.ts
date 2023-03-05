import {
  assert,
  afterEach,
  beforeAll,
  clearStore,
  dataSourceMock,
  test,
  describe
} from 'matchstick-as';
import {
  ADDRESS_FIVE,
  ADDRESS_ONE,
  ADDRESS_SIX,
  ADDRESS_TWO,
  ONE_ETH
} from '../constants';
import {createNewERC20TransferEvent, createTokenVotingMember} from './utils';
import {handleTransfer} from '../../src/packages/token/governance-erc20';
import {BigInt, DataSourceContext} from '@graphprotocol/graph-ts';

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
      const fromUserId = createTokenVotingMember(
        ADDRESS_ONE,
        ADDRESS_SIX,
        ONE_ETH + '0'
      );

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
        ADDRESS_SIX
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
      const toUserId = createTokenVotingMember(
        ADDRESS_TWO,
        ADDRESS_SIX,
        ONE_ETH + '0'
      );

      const mockEvent = createNewERC20TransferEvent(
        ADDRESS_ONE,
        ADDRESS_TWO,
        ONE_ETH
      );

      handleTransfer(mockEvent);
      assert.fieldEquals('TokenVotingMember', toUserId, 'id', toUserId);
      assert.fieldEquals('TokenVotingMember', toUserId, 'address', ADDRESS_TWO);
      assert.fieldEquals('TokenVotingMember', toUserId, 'plugin', ADDRESS_SIX);
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
