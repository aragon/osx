import {Address, DataSourceContext, store} from '@graphprotocol/graph-ts';

import {TokenVoting as TokenVotingContract} from '../../generated/templates/TokenVoting/TokenVoting';
import {Addresslist as AddresslistContract} from '../../generated/templates/Addresslist/Addresslist';
import {ERC165 as ERC165Contract} from '../../generated/templates/DaoTemplate/ERC165';
import {TokenVoting, Addresslist} from '../../generated/templates';
import {
  DaoPlugin,
  TokenVotingPlugin,
  AddresslistPlugin
} from '../../generated/schema';
import {handleERC20Token} from '../utils/tokens';
import {
  TOKEN_VOTING_INTERFACE,
  ADDRESSLIST_VOTING_INTERFACE
} from '../utils/constants';
import {supportsInterface} from '../utils/erc165';

function createTokenVotingPlugin(who: Address, daoId: string): void {
  let packageEntity = TokenVotingPlugin.load(who.toHexString());
  if (!packageEntity) {
    packageEntity = new TokenVotingPlugin(who.toHexString());
    let contract = TokenVotingContract.bind(who);
    let relativeSupportThresholdPct = contract.try_relativeSupportThresholdPct();
    let participationThresholdPct = contract.try_participationThresholdPct();
    let minDuration = contract.try_minDuration();
    let token = contract.try_getVotingToken();

    packageEntity.relativeSupportThresholdPct = relativeSupportThresholdPct.reverted
      ? null
      : relativeSupportThresholdPct.value;
    packageEntity.participationThresholdPct = participationThresholdPct.reverted
      ? null
      : participationThresholdPct.value;
    packageEntity.minDuration = minDuration.reverted ? null : minDuration.value;

    packageEntity.token = token.reverted ? null : handleERC20Token(token.value);

    // Create template
    let context = new DataSourceContext();
    context.setString('daoAddress', daoId);
    TokenVoting.createWithContext(who, context);

    packageEntity.save();
  }
}

function createAddresslistPlugin(who: Address, daoId: string): void {
  let packageEntity = AddresslistPlugin.load(who.toHexString());
  if (!packageEntity) {
    packageEntity = new AddresslistPlugin(who.toHexString());
    let contract = AddresslistContract.bind(who);
    let relativeSupportThresholdPct = contract.try_relativeSupportThresholdPct();
    let participationThresholdPct = contract.try_participationThresholdPct();
    let minDuration = contract.try_minDuration();

    packageEntity.relativeSupportThresholdPct = relativeSupportThresholdPct.reverted
      ? null
      : relativeSupportThresholdPct.value;
    packageEntity.participationThresholdPct = participationThresholdPct.reverted
      ? null
      : participationThresholdPct.value;
    packageEntity.minDuration = minDuration.reverted ? null : minDuration.value;

    // Create template
    let context = new DataSourceContext();
    context.setString('daoAddress', daoId);
    Addresslist.createWithContext(who, context);

    packageEntity.save();
  }
}

export function addPlugin(daoId: string, who: Address): void {
  // package
  // TODO: rethink this once the market place is ready
  let contract = ERC165Contract.bind(who);

  let TokenVotingInterfaceSuppoted = supportsInterface(
    contract,
    TOKEN_VOTING_INTERFACE
  );
  let addresslistInterfaceSuppoted = supportsInterface(
    contract,
    ADDRESSLIST_VOTING_INTERFACE
  );

  if (TokenVotingInterfaceSuppoted) {
    createTokenVotingPlugin(who, daoId);
  } else if (addresslistInterfaceSuppoted) {
    createAddresslistPlugin(who, daoId);
  }

  if (TokenVotingInterfaceSuppoted || addresslistInterfaceSuppoted) {
    let daoPluginEntityId = daoId + '_' + who.toHexString();
    let daoPluginEntity = new DaoPlugin(daoPluginEntityId);
    daoPluginEntity.plugin = who.toHexString();
    daoPluginEntity.dao = daoId;
    daoPluginEntity.save();
  }
}

export function removePlugin(daoId: string, who: string): void {
  let daoPluginEntityId = daoId + '_' + who;
  let daoPluginEntity = DaoPlugin.load(daoPluginEntityId);
  if (daoPluginEntity) {
    store.remove('DaoPlugin', daoPluginEntityId);
  }
}
