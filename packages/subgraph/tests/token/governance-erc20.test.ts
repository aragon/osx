import {
  handleDelegateChanged,
  handleDelegateVotesChanged,
  handleTransfer,
} from '../../src/packages/token/governance-erc20';
import {generateMemberEntityId} from '../../src/utils/ids';
import {
  ADDRESS_ONE,
  ADDRESS_SIX,
  ADDRESS_TWO,
  ONE_ETH,
  ADDRESS_THREE,
  DAO_TOKEN_ADDRESS,
  ADDRESS_SEVEN,
} from '../constants';
import {getBalanceOf} from '../dao/utils';
import {ExtendedTokenVotingMember} from '../helpers/extended-schema';
import {
  createNewDelegateChangedEvent,
  createNewERC20TransferEventWithAddress,
  createTokenVotingMember,
  getDelegatee,
  getVotes,
} from './utils';
import {
  generateEntityIdFromAddress,
  generatePluginEntityId,
} from '@aragon/osx-commons-subgraph';
import {Address, BigInt, DataSourceContext} from '@graphprotocol/graph-ts';
import {
  assert,
  afterEach,
  beforeAll,
  clearStore,
  dataSourceMock,
  test,
  describe,
} from 'matchstick-as';

// mock plugins
const pluginAddress = Address.fromString(ADDRESS_SIX);
const pluginEntityId = generatePluginEntityId(pluginAddress);
const pluginAddressSecond = Address.fromString(ADDRESS_SEVEN);
const pluginEntityIdSecond = generatePluginEntityId(pluginAddressSecond);

// mock members
const fromAddress = Address.fromString(ADDRESS_ONE);
const memberAddress = fromAddress;
const toAddress = Address.fromString(ADDRESS_TWO);
const fromAddressHexString = fromAddress.toHexString();
const memberAddressHexString = fromAddressHexString;
const toAddressHexString = toAddress.toHexString();
const thirdAddress = Address.fromString(ADDRESS_THREE);

function setContext(pluginId: string): void {
  const context = new DataSourceContext();
  context.setString('pluginId', pluginId);
  dataSourceMock.setContext(context);
}

describe('Governance ERC20', () => {
  beforeAll(() => {
    setContext(pluginEntityId);
  });

  afterEach(() => {
    clearStore();
  });

  describe('handleTransfer', () => {
    test('it should create a new member of from', () => {
      const mockEvent = createNewERC20TransferEventWithAddress(
        fromAddressHexString,
        toAddressHexString,
        ONE_ETH,
        DAO_TOKEN_ADDRESS
      );

      getBalanceOf(DAO_TOKEN_ADDRESS, fromAddress.toHexString(), '0');
      getBalanceOf(DAO_TOKEN_ADDRESS, toAddress.toHexString(), ONE_ETH);
      getDelegatee(DAO_TOKEN_ADDRESS, fromAddress.toHexString(), null);
      getDelegatee(DAO_TOKEN_ADDRESS, toAddress.toHexString(), null);
      getVotes(DAO_TOKEN_ADDRESS, fromAddress.toHexString(), '0');
      getVotes(DAO_TOKEN_ADDRESS, toAddress.toHexString(), ONE_ETH);

      handleTransfer(mockEvent);

      const memberEntityId = generateMemberEntityId(pluginAddress, fromAddress);
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'id',
        memberEntityId
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'address',
        fromAddressHexString
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'plugin',
        pluginEntityId
      );
      assert.fieldEquals('TokenVotingMember', memberEntityId, 'balance', '0');
    });

    test('it should create a new member of to', () => {
      const mockEvent = createNewERC20TransferEventWithAddress(
        fromAddressHexString,
        toAddressHexString,
        ONE_ETH,
        DAO_TOKEN_ADDRESS
      );

      getBalanceOf(DAO_TOKEN_ADDRESS, fromAddress.toHexString(), '0');
      getBalanceOf(DAO_TOKEN_ADDRESS, toAddress.toHexString(), ONE_ETH);

      handleTransfer(mockEvent);

      const memberEntityId = generateMemberEntityId(pluginAddress, toAddress);
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'id',
        memberEntityId
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'address',
        toAddressHexString
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'plugin',
        pluginEntityId
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'balance',
        ONE_ETH
      );
    });

    test('it should update an existing from entity', () => {
      const memberEntityId = createTokenVotingMember(
        fromAddressHexString,
        pluginEntityId,
        ONE_ETH + '0' /* 10 ETH */
      );

      const mockEvent = createNewERC20TransferEventWithAddress(
        fromAddressHexString,
        toAddressHexString,
        ONE_ETH,
        DAO_TOKEN_ADDRESS
      );

      getBalanceOf(DAO_TOKEN_ADDRESS, fromAddress.toHexString(), '0');
      getBalanceOf(DAO_TOKEN_ADDRESS, toAddress.toHexString(), ONE_ETH + '0');

      handleTransfer(mockEvent);
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'id',
        memberEntityId
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'address',
        fromAddressHexString
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'plugin',
        pluginEntityId
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'balance',
        BigInt.fromString(ONE_ETH).times(BigInt.fromString('9')).toString()
      );
    });

    test('it should update an existing to entity', () => {
      const memberEntityId = createTokenVotingMember(
        toAddressHexString,
        pluginEntityId,
        ONE_ETH + '0'
      );

      const mockEvent = createNewERC20TransferEventWithAddress(
        fromAddressHexString,
        toAddressHexString,
        ONE_ETH,
        DAO_TOKEN_ADDRESS
      );

      getBalanceOf(DAO_TOKEN_ADDRESS, fromAddress.toHexString(), ONE_ETH + '0');
      getBalanceOf(DAO_TOKEN_ADDRESS, toAddress.toHexString(), '0');
      handleTransfer(mockEvent);

      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'id',
        memberEntityId
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'address',
        ADDRESS_TWO
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'plugin',
        ADDRESS_SIX
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'balance',
        BigInt.fromString(ONE_ETH).times(BigInt.fromString('11')).toString()
      );
    });

    test("it should initialize with the user's existing balance, if she has one", () => {
      // constants
      const STARTING_BALANCE = '10';
      const TRANSFER = '3';
      const REMAINING = '7';

      // mocked calls
      getBalanceOf(DAO_TOKEN_ADDRESS, fromAddress.toHexString(), REMAINING);
      getBalanceOf(DAO_TOKEN_ADDRESS, toAddress.toHexString(), TRANSFER);

      const memberEntityIdFrom = createTokenVotingMember(
        fromAddressHexString,
        pluginEntityId,
        STARTING_BALANCE
      );

      const memberEntityIdFromSecondPlugin = generateMemberEntityId(
        pluginAddressSecond,
        Address.fromString(fromAddressHexString)
      );

      const memberEntityIdTo = generateMemberEntityId(
        pluginAddressSecond,
        Address.fromString(toAddressHexString)
      );

      const memberEntityIdToSecondPlugin = generateMemberEntityId(
        pluginAddressSecond,
        Address.fromString(toAddressHexString)
      );

      // handle a transfer to another user
      const transferEvent = createNewERC20TransferEventWithAddress(
        fromAddressHexString,
        toAddressHexString,
        TRANSFER,
        DAO_TOKEN_ADDRESS
      );

      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityIdFrom,
        'id',
        memberEntityIdFrom
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityIdFrom,
        'address',
        fromAddressHexString
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityIdFrom,
        'plugin',
        pluginEntityId
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityIdFrom,
        'balance',
        STARTING_BALANCE
      );

      // execute the transfer in the context of both plugins
      handleTransfer(transferEvent);
      setContext(pluginEntityIdSecond);
      handleTransfer(transferEvent);

      // we should see:
      // user A has balances updated in both plugins
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityIdFrom,
        'balance',
        REMAINING
      );

      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityIdFromSecondPlugin,
        'balance',
        REMAINING
      );

      // user B has balances updated in both plugins
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityIdTo,
        'balance',
        TRANSFER
      );

      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityIdToSecondPlugin,
        'balance',
        TRANSFER
      );

      // set the context back to the first plugin
      setContext(pluginEntityId);
    });
  });

  describe('handleDelegateChanged', () => {
    beforeAll(() => {
      getBalanceOf(DAO_TOKEN_ADDRESS, fromAddress.toHexString(), '0');
      getBalanceOf(DAO_TOKEN_ADDRESS, toAddress.toHexString(), '0');
      getBalanceOf(DAO_TOKEN_ADDRESS, thirdAddress.toHexString(), '0');
      getVotes(DAO_TOKEN_ADDRESS, fromAddress.toHexString(), '0');
      getVotes(DAO_TOKEN_ADDRESS, toAddress.toHexString(), '0');
      getVotes(DAO_TOKEN_ADDRESS, thirdAddress.toHexString(), '0');
      getDelegatee(DAO_TOKEN_ADDRESS, fromAddress.toHexString(), null);
      getDelegatee(DAO_TOKEN_ADDRESS, toAddress.toHexString(), null);
      getDelegatee(DAO_TOKEN_ADDRESS, thirdAddress.toHexString(), null);
    });

    test('it should create a member from `fromDelegate`.', () => {
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddressHexString,
        pluginEntityId
      );

      let event = member.createEvent_DelegateChanged();

      handleDelegateChanged(event);

      member.delegatee = generateMemberEntityId(pluginAddress, memberAddress);
      member.assertEntity();
      assert.entityCount('TokenVotingMember', 1);
    });

    test('it should create a member from `toDelegate`.', () => {
      const memberTwoAddress = Address.fromString(ADDRESS_TWO);
      const memberTwoAddressHexString = memberTwoAddress.toHexString();
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddressHexString,
        pluginEntityId
      );

      let event = member.createEvent_DelegateChanged(
        memberAddressHexString,
        memberAddressHexString,
        memberTwoAddressHexString
      );

      handleDelegateChanged(event);

      let expectedDelegatee = generateMemberEntityId(
        pluginAddress,
        memberTwoAddress
      );

      member.delegatee = expectedDelegatee;
      member.assertEntity();

      assert.entityCount('TokenVotingMember', 2);
      assert.fieldEquals(
        'TokenVotingMember',
        member.id,
        'delegatee',
        expectedDelegatee
      );
      assert.fieldEquals(
        'TokenVotingMember',
        member.id,
        'address',
        memberAddressHexString
      );
      assert.fieldEquals(
        'TokenVotingMember',
        member.id,
        'plugin',
        pluginEntityId
      );
      assert.fieldEquals('TokenVotingMember', member.id, 'balance', '0');
    });

    test('it should create a member for `delegator`, `fromDelegate` and `toDelegate`, and set delegatee as `toDelegate`.', () => {
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddressHexString,
        pluginEntityId
      );
      const oldDelegateeId = ADDRESS_TWO;
      const newDelegateeAddress = Address.fromString(ADDRESS_THREE);
      const newDelegateeId = generateEntityIdFromAddress(newDelegateeAddress);

      let event = member.createEvent_DelegateChanged(
        memberAddressHexString,
        oldDelegateeId,
        newDelegateeId
      );

      handleDelegateChanged(event);

      // assert
      // expected changes
      member.delegatee = generateMemberEntityId(
        pluginAddress,
        newDelegateeAddress
      );
      member.assertEntity();
      assert.entityCount('TokenVotingMember', 3);
    });

    test('it should update delegatee of an existing member', () => {
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddressHexString,
        pluginEntityId
      );

      member.buildOrUpdate();
      // there should be one member in the store
      assert.entityCount('TokenVotingMember', 1);

      let delegateeAddress = Address.fromString(ADDRESS_TWO);
      let delegateeId = generateEntityIdFromAddress(delegateeAddress);
      let event = member.createEvent_DelegateChanged(
        // member address is ADDRESS ONE
        memberAddressHexString,
        memberAddressHexString,
        delegateeId
      );

      handleDelegateChanged(event);

      // assert
      // expected changes
      member.delegatee = generateMemberEntityId(
        pluginAddress,
        delegateeAddress
      );
      member.assertEntity();
      // there must be the second member in the store for the delegatee
      assert.entityCount('TokenVotingMember', 2);
    });
  });

  describe('handleDelegatevotesChanged', () => {
    test('it should create member for delegate address', () => {
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddressHexString,
        pluginEntityId
      );
      member.votingPower = BigInt.fromString('100');
      let event = member.createEvent_DelegateVotesChanged('100', '0');

      handleDelegateVotesChanged(event);

      member.delegatee = generateMemberEntityId(pluginAddress, memberAddress);
      member.assertEntity();
      assert.entityCount('TokenVotingMember', 1);
    });

    test('it should update delegateVotes of members', () => {
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddressHexString,
        pluginEntityId
      );

      let newBalance = '111';
      let event = member.createEvent_DelegateVotesChanged(newBalance);

      handleDelegateVotesChanged(event);

      // assert
      // expected changes
      member.delegatee = generateMemberEntityId(pluginAddress, memberAddress);
      member.votingPower = BigInt.fromString(newBalance);
      member.assertEntity();
      assert.entityCount('TokenVotingMember', 1);
    });

    test('it should delete a member without voting power and balance and not delegating to another address', () => {
      const memberTwoAddress = Address.fromString(ADDRESS_TWO);
      const memberTwoAddressHexString =
        generateEntityIdFromAddress(memberTwoAddress);

      let memberOne = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddressHexString,
        pluginEntityId
      );
      let memberTwo = new ExtendedTokenVotingMember().withDefaultValues(
        memberTwoAddressHexString,
        pluginEntityId
      );
      /* member one has 100 token delegated to member two*/
      memberOne.balance = BigInt.fromString('100');
      memberOne.votingPower = BigInt.fromString('0');
      /* member two balance is 0 but has 100 voting power from the delegation of member one */
      memberTwo.balance = BigInt.fromString('0');
      memberTwo.votingPower = BigInt.fromString('100');
      /* member three has 100 tokens and none delegated */

      memberOne.buildOrUpdate();
      memberTwo.buildOrUpdate();

      assert.entityCount('TokenVotingMember', 2);

      // member one un-delegates from member two
      let eventOne = memberOne.createEvent_DelegateVotesChanged('100');
      let eventTwo = memberTwo.createEvent_DelegateVotesChanged('0');

      memberTwo.mockCall_delegatesCall(
        DAO_TOKEN_ADDRESS,
        memberTwoAddressHexString,
        memberTwoAddressHexString
      );

      handleDelegateVotesChanged(eventOne);
      handleDelegateVotesChanged(eventTwo);

      // assert
      // expected changes
      memberOne.votingPower = BigInt.fromString('100');
      memberOne.assertEntity();
      // member two should be deleted because it has no (balance and voting power) and not delegates to another address.
      assert.notInStore('TokenVotingMember', memberTwo.id);
      assert.entityCount('TokenVotingMember', 1);
    });

    test('it should not delete a member without voting power and balance, but delegating to another address', () => {
      const memberTwoAddress = Address.fromString(ADDRESS_TWO);
      const memberTwoAddressHexString =
        generateEntityIdFromAddress(memberTwoAddress);
      let memberOne = new ExtendedTokenVotingMember().withDefaultValues(
        memberAddressHexString,
        pluginEntityId
      );
      let memberTwo = new ExtendedTokenVotingMember().withDefaultValues(
        memberTwoAddressHexString,
        pluginEntityId
      );
      /* member one has 100 token delegated to member two*/
      memberOne.balance = BigInt.fromString('100');
      memberOne.votingPower = BigInt.fromString('0');
      /* member two balance is 0 but has 100 voting power from the delegation of member one */
      memberTwo.balance = BigInt.fromString('0');
      memberTwo.votingPower = BigInt.fromString('100');
      /* member three has 100 tokens and none delegated */

      memberOne.buildOrUpdate();
      memberTwo.buildOrUpdate();

      assert.entityCount('TokenVotingMember', 2);

      // member one un-delegates from member two
      let eventOne = memberOne.createEvent_DelegateVotesChanged('100');
      let eventTwo = memberTwo.createEvent_DelegateVotesChanged('0');

      memberTwo.mockCall_delegatesCall(
        DAO_TOKEN_ADDRESS,
        memberTwoAddressHexString,
        memberAddressHexString
      );

      handleDelegateVotesChanged(eventOne);
      handleDelegateVotesChanged(eventTwo);

      // assert
      // expected changes
      memberOne.votingPower = BigInt.fromString('100');
      memberOne.assertEntity();

      assert.fieldEquals('TokenVotingMember', memberOne.id, 'id', memberOne.id);
      // memberTwo should not be deleted because it has no (balance and voting power), but it delegates to another address.
      assert.fieldEquals('TokenVotingMember', memberTwo.id, 'id', memberTwo.id);
      assert.entityCount('TokenVotingMember', 2);
    });

    test("It should initialize with the user's existing voting power and delegation, if she has any", () => {
      // constants
      const STARTING_BALANCE = '10';

      // mocked calls
      getBalanceOf(
        DAO_TOKEN_ADDRESS,
        fromAddress.toHexString(),
        STARTING_BALANCE
      );
      getBalanceOf(DAO_TOKEN_ADDRESS, toAddress.toHexString(), '0');
      getVotes(DAO_TOKEN_ADDRESS, fromAddress.toHexString(), STARTING_BALANCE);
      getVotes(DAO_TOKEN_ADDRESS, toAddress.toHexString(), '0');
      getDelegatee(
        DAO_TOKEN_ADDRESS,
        fromAddress.toHexString(),
        fromAddress.toHexString()
      );
      getDelegatee(DAO_TOKEN_ADDRESS, toAddress.toHexString(), null);

      const memberEntityIdFrom = generateMemberEntityId(
        pluginAddress,
        fromAddress
      );

      const memberEntityIdFromSecondPlugin = generateMemberEntityId(
        pluginAddressSecond,
        Address.fromString(fromAddressHexString)
      );

      // delegate to self
      const delegateChangedEvent = createNewDelegateChangedEvent(
        fromAddressHexString,
        fromAddressHexString,
        fromAddressHexString,
        DAO_TOKEN_ADDRESS
      );

      handleDelegateChanged(delegateChangedEvent);

      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityIdFrom,
        'votingPower',
        STARTING_BALANCE
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityIdFrom,
        'delegatee',
        memberEntityIdFrom
      );

      // now do the delegation in the context of the second plugin
      setContext(pluginEntityIdSecond);
      handleDelegateChanged(delegateChangedEvent);

      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityIdFromSecondPlugin,
        'votingPower',
        STARTING_BALANCE
      );
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityIdFromSecondPlugin,
        'delegatee',
        memberEntityIdFromSecondPlugin
      );

      // set the context back to the first plugin
      setContext(pluginEntityId);
    });
  });
});
