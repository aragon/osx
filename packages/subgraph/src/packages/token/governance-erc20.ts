import {TokenVotingMember} from '../../../generated/schema';
import {GovernanceERC20 as GovernanceERC20Contract} from '../../../generated/templates/GovernanceERC20/GovernanceERC20';
import {
  DelegateChanged,
  DelegateVotesChanged,
} from '../../../generated/templates/GovernanceERC20/GovernanceERC20';
import {Transfer} from '../../../generated/templates/TokenVoting/ERC20';
import {generateMemberEntityId} from '../../utils/ids';
import {
  TokenVotingMemberResult,
  getDelegateeId,
  getERC20Balance,
  getVotingPower,
} from './utils';
import {Address, BigInt, dataSource, store} from '@graphprotocol/graph-ts';

function getOrCreateMember(
  user: Address,
  pluginId: string,
  tokenAddress: Address
): TokenVotingMemberResult {
  let memberEntityId = generateMemberEntityId(
    Address.fromString(pluginId),
    user
  );
  let createdNew = false;
  let member = TokenVotingMember.load(memberEntityId);

  if (!member) {
    createdNew = true;
    member = new TokenVotingMember(memberEntityId);
    member.address = user;
    member.balance = getERC20Balance(user, tokenAddress);
    member.plugin = pluginId;

    member.delegatee = getDelegateeId(user, tokenAddress, pluginId);
    member.votingPower = getVotingPower(user, tokenAddress);
  }

  return new TokenVotingMemberResult(member, createdNew);
}

export function handleTransfer(event: Transfer): void {
  let context = dataSource.context();
  let pluginId = context.getString('pluginId');
  let tokenAddress = event.address;

  if (event.params.from != Address.zero()) {
    let result = getOrCreateMember(event.params.from, pluginId, tokenAddress);
    let fromMember = result.entity;

    // in the case of an existing member, update the balance
    if (!result.createdNew) {
      fromMember.balance = fromMember.balance.minus(event.params.value);
    }
    fromMember.save();
  }

  if (event.params.to != Address.zero()) {
    let result = getOrCreateMember(event.params.to, pluginId, tokenAddress);
    let toMember = result.entity;

    // in the case of an existing member, update the balance
    if (!result.createdNew) {
      toMember.balance = toMember.balance.plus(event.params.value);
    }
    toMember.save();
  }
}

export function handleDelegateChanged(event: DelegateChanged): void {
  let context = dataSource.context();
  let pluginId = context.getString('pluginId');
  let tokenAddress = event.address;

  const toDelegate = event.params.toDelegate;

  // make sure `fromDelegate` &  `toDelegate`are members
  if (event.params.fromDelegate != Address.zero()) {
    let resultFromDelegate = getOrCreateMember(
      event.params.fromDelegate,
      pluginId,
      tokenAddress
    );
    resultFromDelegate.entity.save();
  }

  // make sure `delegator` is member and set delegatee
  if (event.params.delegator != Address.zero()) {
    let resultDelegator = getOrCreateMember(
      event.params.delegator,
      pluginId,
      tokenAddress
    );
    let delegator = resultDelegator.entity;

    // set delegatee
    if (toDelegate != Address.zero()) {
      const resultDelegatee = getOrCreateMember(
        toDelegate,
        pluginId,
        tokenAddress
      );
      const delegatee = resultDelegatee.entity;
      const delegateeId = generateMemberEntityId(
        Address.fromString(pluginId),
        Address.fromBytes(delegatee.address)
      );
      delegatee.save();
      delegator.delegatee = delegateeId;
    }
    delegator.save();
  }
}

export function handleDelegateVotesChanged(event: DelegateVotesChanged): void {
  const delegate = event.params.delegate;
  if (delegate == Address.zero()) return;
  const newVotingPower = event.params.newBalance;

  const context = dataSource.context();
  const pluginId = context.getString('pluginId');
  const tokenAddress = event.address;

  let result = getOrCreateMember(delegate, pluginId, tokenAddress);
  let member = result.entity;

  if (isZeroBalanceAndVotingPower(member.balance, newVotingPower)) {
    if (shouldRemoveMember(event.address, delegate)) {
      store.remove('TokenVotingMember', member.id);
      return;
    }
  }
  member.votingPower = newVotingPower;
  member.save();
}

function isZeroBalanceAndVotingPower(
  memberBalance: BigInt,
  votingPower: BigInt
): boolean {
  return (
    memberBalance.equals(BigInt.zero()) && votingPower.equals(BigInt.zero())
  );
}

function shouldRemoveMember(
  contractAddress: Address,
  delegate: Address
): boolean {
  const governanceERC20Contract = GovernanceERC20Contract.bind(contractAddress);
  const delegates = governanceERC20Contract.try_delegates(delegate);
  if (!delegates.reverted) {
    return delegates.value == delegate || delegates.value == Address.zero();
  }
  return false;
}
