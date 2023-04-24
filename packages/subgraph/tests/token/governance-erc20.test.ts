import {
  assert,
  afterEach,
  beforeAll,
  clearStore,
  dataSourceMock,
  test,
  describe,
  logStore
} from 'matchstick-as';
import {
  ADDRESS_ONE,
  ADDRESS_SIX,
  ADDRESS_TWO,
  ONE_ETH,
  ADDRESS_THREE
} from '../constants';
import {createNewERC20TransferEvent, createTokenVotingMember} from './utils';
import {
  handleDelegateChanged,
  handleDelegateVotesChanged,
  handleTransfer
} from '../../src/packages/token/governance-erc20';
import {BigInt, DataSourceContext} from '@graphprotocol/graph-ts';
import {ExtendedTokenVotingMember} from '../helpers/extended-schema';

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

  describe('handleDelegateChanged', () => {
    test('it should create a member from `fromDelegate`.', () => {
      let memberAddress = ADDRESS_ONE;
      let pluginAddress = ADDRESS_SIX;
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddress,
        pluginAddress
      );

      let event = member.createEvent_DelegateChanged();

      handleDelegateChanged(event);

      member.assertEntity();
      assert.entityCount('TokenVotingMember', 1);
    });

    test('it should create a member from `toDelegate`.', () => {
      let memberAddress = ADDRESS_ONE;
      let pluginAddress = ADDRESS_SIX;
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddress,
        pluginAddress
      );

      let event = member.createEvent_DelegateChanged(
        memberAddress,
        ADDRESS_ONE,
        ADDRESS_TWO
      );

      handleDelegateChanged(event);

      // assert
      // expected changes
      member.delegatee = ADDRESS_TWO.concat('_').concat(pluginAddress);
      member.assertEntity();
      assert.entityCount('TokenVotingMember', 2);
    });

    test('it should create a member for `delegator`, `fromDelegate` and `toDelegate`, and set delegatee as `toDelegate`.', () => {
      let memberAddress = ADDRESS_ONE;
      let pluginAddress = ADDRESS_SIX;
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddress,
        pluginAddress
      );

      let delegateeAddress = ADDRESS_THREE;
      let event = member.createEvent_DelegateChanged(
        memberAddress,
        ADDRESS_TWO,
        delegateeAddress
      );

      handleDelegateChanged(event);

      // assert
      // expected changes
      member.delegatee = delegateeAddress.concat('_').concat(pluginAddress);
      member.assertEntity();
      assert.entityCount('TokenVotingMember', 3);
    });

    test('it should update delegatee of an existing member', () => {
      let memberAddress = ADDRESS_ONE;
      let pluginAddress = ADDRESS_SIX;
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddress,
        pluginAddress
      );

      member.buildOrUpdate();
      // there should be one member in the store
      assert.entityCount('TokenVotingMember', 1);

      let fromDelegate = memberAddress;
      let delegateeAddress = ADDRESS_TWO;
      let event = member.createEvent_DelegateChanged(
        memberAddress,
        fromDelegate,
        delegateeAddress
      );

      handleDelegateChanged(event);

      // assert
      // expected changes
      member.delegatee = delegateeAddress.concat('_').concat(pluginAddress);
      member.assertEntity();
      // there must be the second member in the store for the delegatee
      assert.entityCount('TokenVotingMember', 2);
    });
  });

  describe('handleDelegateChanged', () => {
    test('it should create member for delegate address', () => {
      let memberAddress = ADDRESS_ONE;
      let pluginAddress = ADDRESS_SIX;
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddress,
        pluginAddress
      );

      let event = member.createEvent_DelegateVotesChanged();

      handleDelegateVotesChanged(event);

      member.assertEntity();
      assert.entityCount('TokenVotingMember', 1);
    });

    test('it should update delegateVotes of members', () => {
      let memberAddress = ADDRESS_ONE;
      let pluginAddress = ADDRESS_SIX;
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddress,
        pluginAddress
      );

      let newBalance = '111';
      let event = member.createEvent_DelegateVotesChanged(newBalance);

      handleDelegateVotesChanged(event);

      // assert
      // expected changes
      member.votingPower = BigInt.fromString(newBalance);
      member.assertEntity();
      assert.entityCount('TokenVotingMember', 1);
    });
  });
});
