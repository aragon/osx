import {Address, BigInt, dataSource, log, store} from '@graphprotocol/graph-ts';

import {TokenVotingMember} from '../../../generated/schema';
import {ERC20, Transfer} from '../../../generated/templates/DaoTemplate/ERC20';

function getOrCreateMember(user: Address, plugin: Address): TokenVotingMember {
  let id = user
    .toHexString()
    .concat('_')
    .concat(plugin.toHexString());
  let member = TokenVotingMember.load(id);
  if (!member) {
    member = new TokenVotingMember(id);
    member.address = user;
    member.plugin = plugin.toHexString(); // TODO: why hexString()
    member.balance = BigInt.zero();
  }

  return member;
}

export function handleTransfer(event: Transfer): void {
  let context = dataSource.context();
  let pluginAddress = Address.fromString(context.getString('pluginAddress'));

  log.warning('giorgi {}', [context.getString('pluginAddress')]);
  let fromMember = getOrCreateMember(event.params.from, pluginAddress);
  let toMember = getOrCreateMember(event.params.to, pluginAddress);

  if (event.params.from != Address.zero()) {
    fromMember.balance = fromMember.balance.minus(event.params.value);
  }

  // TODO: if `to` is `dao`, then `dao` would become member. should we avoid it ?
  if (event.params.to != Address.zero()) {
    toMember.balance = toMember.balance.plus(event.params.value);
  }

  fromMember.save();
  toMember.save();
}
