import {Address, BigInt, dataSource} from '@graphprotocol/graph-ts';

import {TokenVotingMember} from '../../../generated/schema';
import {Transfer} from '../../../generated/templates/TokenVoting/ERC20';

function getOrCreateMember(user: Address, pluginId: string): TokenVotingMember {
  let id = user
    .toHexString()
    .concat('_')
    .concat(pluginId);
  let member = TokenVotingMember.load(id);
  if (!member) {
    member = new TokenVotingMember(id);
    member.address = user;
    member.plugin = pluginId;
    member.balance = BigInt.zero();
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
