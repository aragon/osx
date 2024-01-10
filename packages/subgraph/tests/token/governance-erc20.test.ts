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
} from '../constants';
import {ExtendedTokenVotingMember} from '../helpers/extended-schema';
import {createNewERC20TransferEvent, createTokenVotingMember} from './utils';
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

const pluginAddress = Address.fromString(ADDRESS_SIX);
const pluginEntityId = generatePluginEntityId(pluginAddress);
const fromAddress = Address.fromString(ADDRESS_ONE);
const memberAddress = fromAddress;
const toAddress = Address.fromString(ADDRESS_TWO);
const fromId = generateEntityIdFromAddress(fromAddress);
const memberId = fromId;
const toId = generateEntityIdFromAddress(toAddress);

describe('Governance ERC20', () => {
  beforeAll(() => {
    const context = new DataSourceContext();
    context.setString('pluginId', pluginEntityId);
    dataSourceMock.setContext(context);
  });

  afterEach(() => {
    clearStore();
  });

  describe('handleTransfer', () => {
    test('it should create a new member of from', () => {
      const mockEvent = createNewERC20TransferEvent(fromId, toId, ONE_ETH);

      handleTransfer(mockEvent);

      const memberEntityId = generateMemberEntityId(fromAddress, pluginAddress);
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
        fromId
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
        `-${ONE_ETH}`
      );
    });

    test('it should create a new member of to', () => {
      const mockEvent = createNewERC20TransferEvent(fromId, toId, ONE_ETH);

      handleTransfer(mockEvent);

      const memberEntityId = generateMemberEntityId(toAddress, pluginAddress);
      assert.fieldEquals(
        'TokenVotingMember',
        memberEntityId,
        'id',
        memberEntityId
      );
      assert.fieldEquals('TokenVotingMember', memberEntityId, 'address', toId);
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
        fromId,
        pluginEntityId,
        ONE_ETH + '0'
      );

      const mockEvent = createNewERC20TransferEvent(fromId, toId, ONE_ETH);

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
        fromId
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
        toId,
        pluginEntityId,
        ONE_ETH + '0'
      );

      const mockEvent = createNewERC20TransferEvent(fromId, toId, ONE_ETH);

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
  });

  describe('handleDelegateChanged', () => {
    test('it should create a member from `fromDelegate`.', () => {
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberId,
        pluginEntityId
      );

      let event = member.createEvent_DelegateChanged();

      handleDelegateChanged(event);

      // expected changes
      member.delegatee = generateMemberEntityId(memberAddress, pluginAddress);

      member.assertEntity();
      assert.entityCount('TokenVotingMember', 1);
    });

    test('it should create a member from `toDelegate`.', () => {
      const memberTwoAddress = Address.fromString(ADDRESS_TWO);
      const memberTwoId = generateEntityIdFromAddress(memberTwoAddress);
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberId,
        pluginEntityId
      );

      let event = member.createEvent_DelegateChanged(
        memberId,
        memberId,
        memberTwoId
      );

      handleDelegateChanged(event);

      // assert
      // expected changes
      member.delegatee = generateMemberEntityId(
        memberTwoAddress,
        pluginAddress
      );
      member.assertEntity();
      assert.entityCount('TokenVotingMember', 2);
    });

    test('it should create a member for `delegator`, `fromDelegate` and `toDelegate`, and set delegatee as `toDelegate`.', () => {
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberId,
        pluginEntityId
      );
      const oldDelegateeId = ADDRESS_TWO;
      const newDelegateeAddress = Address.fromString(ADDRESS_THREE);
      const newDelegateeId = generateEntityIdFromAddress(newDelegateeAddress);

      let event = member.createEvent_DelegateChanged(
        memberId,
        oldDelegateeId,
        newDelegateeId
      );

      handleDelegateChanged(event);

      // assert
      // expected changes
      member.delegatee = generateMemberEntityId(
        newDelegateeAddress,
        pluginAddress
      );
      member.assertEntity();
      assert.entityCount('TokenVotingMember', 3);
    });

    test('it should update delegatee of an existing member', () => {
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberId,
        pluginEntityId
      );

      member.buildOrUpdate();
      // there should be one member in the store
      assert.entityCount('TokenVotingMember', 1);

      let fromDelegate = memberId;
      let delegateeAddress = Address.fromString(ADDRESS_TWO);
      let delegateeId = generateEntityIdFromAddress(delegateeAddress);
      let event = member.createEvent_DelegateChanged(
        memberId,
        fromDelegate,
        delegateeId
      );

      handleDelegateChanged(event);

      // assert
      // expected changes
      member.delegatee = generateMemberEntityId(
        delegateeAddress,
        pluginAddress
      );
      member.assertEntity();
      // there must be the second member in the store for the delegatee
      assert.entityCount('TokenVotingMember', 2);
    });
  });

  describe('handleDelegatevotesChanged', () => {
    test('it should create member for delegate address', () => {
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberId,
        pluginEntityId
      );
      member.votingPower = BigInt.fromString('100');
      let event = member.createEvent_DelegateVotesChanged('100', '0');

      handleDelegateVotesChanged(event);

      member.assertEntity();
      assert.entityCount('TokenVotingMember', 1);
    });

    test('it should update delegateVotes of members', () => {
      let member = new ExtendedTokenVotingMember().withDefaultValues(
        memberId,
        pluginEntityId
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

    test('it should delete a member without voting power and balance and not delegating to another address', () => {
      const memberTwoAddress = Address.fromString(ADDRESS_TWO);
      const memberTwoId = generateEntityIdFromAddress(memberTwoAddress);

      let memberOne = new ExtendedTokenVotingMember().withDefaultValues(
        memberId,
        pluginEntityId
      );
      let memberTwo = new ExtendedTokenVotingMember().withDefaultValues(
        memberTwoId,
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
        memberTwoId,
        memberTwoId
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
      const memberTwoId = generateEntityIdFromAddress(memberTwoAddress);
      let memberOne = new ExtendedTokenVotingMember().withDefaultValues(
        memberId,
        pluginEntityId
      );
      let memberTwo = new ExtendedTokenVotingMember().withDefaultValues(
        memberTwoId,
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
        memberTwoId,
        memberId
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
  });
});
