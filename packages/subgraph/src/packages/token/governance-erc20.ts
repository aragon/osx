import {Address, BigInt, dataSource} from '@graphprotocol/graph-ts';

import {TokenVotingMember} from '../../../generated/schema';
import {Transfer} from '../../../generated/templates/TokenVoting/ERC20';
import {
  DelegateChanged,
  DelegateVotesChanged
} from '../../../generated/templates/GovernanceERC20/GovernanceERC20';

function getOrCreateMember(user: Address, pluginId: string): TokenVotingMember {
  let id = user
    .toHexString()
    .concat('_')
    .concat(pluginId);
  let member = TokenVotingMember.load(id);
  if (!member) {
    member = new TokenVotingMember(id);
    member.address = user;
    member.balance = BigInt.zero();
    member.plugin = pluginId;

    member.delegatee = id; // we assume by default member delegates itself
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

  // make sure `fromDelegate` &  `toDelegate`are members
  if (event.params.fromDelegate != Address.zero()) {
    let fromMember = getOrCreateMember(event.params.fromDelegate, pluginId);
    fromMember.save();
  }
  if (event.params.toDelegate != Address.zero()) {
    let toMember = getOrCreateMember(event.params.toDelegate, pluginId);
    toMember.save();
  }

  // make sure `delegator` is member and set delegatee
  if (event.params.delegator != Address.zero()) {
    let delegator = getOrCreateMember(event.params.delegator, pluginId);

    // set delegatee
    let delegatee = event.params.toDelegate
      .toHexString()
      .concat('_')
      .concat(pluginId);

    delegator.delegatee = delegatee;

    delegator.save();
  }
}

export function handleDelegateVotesChanged(event: DelegateVotesChanged): void {
  let context = dataSource.context();
  let pluginId = context.getString('pluginId');

  if (event.params.delegate != Address.zero()) {
    let member = getOrCreateMember(event.params.delegate, pluginId);
    // Assign the cumulative delegated votes to this member from all their delegators.
    member.votingPower = event.params.newBalance;
    member.save();
  }
}
