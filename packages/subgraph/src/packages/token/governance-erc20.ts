import {TokenVotingMember} from '../../../generated/schema';
import {GovernanceERC20 as GovernanceERC20Contract} from '../../../generated/templates/GovernanceERC20/GovernanceERC20';
import {
  DelegateChanged,
  DelegateVotesChanged,
} from '../../../generated/templates/GovernanceERC20/GovernanceERC20';
import {Transfer} from '../../../generated/templates/TokenVoting/ERC20';
import {Address, BigInt, dataSource, store} from '@graphprotocol/graph-ts';
import { generateMemberEntityId } from '../../utils/ids';

function getOrCreateMember(user: Address, pluginId: string): TokenVotingMember {
  let memberEntityId = generateMemberEntityId(
    user,
    Address.fromString(pluginId)
  );
  let member = TokenVotingMember.load(memberEntityId);
  if (!member) {
    member = new TokenVotingMember(memberEntityId);
    member.address = user;
    member.balance = BigInt.zero();
    member.plugin = pluginId;

    member.delegatee = null;
    member.votingPower = BigInt.zero();
  }

  return member;
}

export function handleTransfer(event: Transfer): void {
  let context = dataSource.context();
  let pluginId = context.getString('pluginId');

  if (event.params.from != Address.zero()) {
    let fromMember = getOrCreateMember(event.params.from, pluginId);
    fromMember.balance = fromMember.balance.minus(event.params.value);
    fromMember.save();
  }

  if (event.params.to != Address.zero()) {
    let toMember = getOrCreateMember(event.params.to, pluginId);
    toMember.balance = toMember.balance.plus(event.params.value);
    toMember.save();
  }
}

export function handleDelegateChanged(event: DelegateChanged): void {
  let context = dataSource.context();
  let pluginId = context.getString('pluginId');
  const toDelegate = event.params.toDelegate;

  // make sure `fromDelegate` &  `toDelegate`are members
  if (event.params.fromDelegate != Address.zero()) {
    let fromMember = getOrCreateMember(event.params.fromDelegate, pluginId);
    fromMember.save();
  }
  if (toDelegate != Address.zero()) {
    let toMember = getOrCreateMember(toDelegate, pluginId);
    toMember.save();
  }

  // make sure `delegator` is member and set delegatee
  if (event.params.delegator != Address.zero()) {
    let delegator = getOrCreateMember(event.params.delegator, pluginId);

    // set delegatee
    let delegatee: string | null = null;
    if (toDelegate != Address.zero()) {
      delegatee = [toDelegate.toHexString(), pluginId].join('_');

      delegator.delegatee = delegatee;
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
  let member = getOrCreateMember(delegate, pluginId);

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
