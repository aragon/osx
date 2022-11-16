import {Address, DataSourceContext, store} from '@graphprotocol/graph-ts';

import {ERC20Voting as ERC20VotingContract} from '../../generated/templates/ERC20Voting/ERC20Voting';
import {Addresslist as AddresslistContract} from '../../generated/templates/Addresslist/Addresslist';
import {ERC165 as ERC165Contract} from '../../generated/templates/DaoTemplate/ERC165';
import {ERC20Voting, Addresslist} from '../../generated/templates';
import {
  DaoPlugin,
  ERC20VotingPlugin,
  AllowlistPlugin
} from '../../generated/schema';
import {handleERC20Token} from '../utils/tokens';
import {
  ERC20_VOTING_INTERFACE,
  ALLOWLIST_VOTING_INTERFACE
} from '../utils/constants';
import {supportsInterface} from '../utils/erc165';

function createErc20VotingPackage(who: Address, daoId: string): void {
  let packageEntity = ERC20VotingPlugin.load(who.toHexString());
  if (!packageEntity) {
    packageEntity = new ERC20VotingPlugin(who.toHexString());
    let contract = ERC20VotingContract.bind(who);
    let relativeSupportThresholdPct = contract.try_relativeSupportThresholdPct();
    let totalSupportThresholdPct = contract.try_totalSupportThresholdPct();
    let minDuration = contract.try_minDuration();
    let token = contract.try_getVotingToken();

    packageEntity.relativeSupportThresholdPct = relativeSupportThresholdPct.reverted
      ? null
      : relativeSupportThresholdPct.value;
    packageEntity.totalSupportThresholdPct = totalSupportThresholdPct.reverted
      ? null
      : totalSupportThresholdPct.value;
    packageEntity.minDuration = minDuration.reverted ? null : minDuration.value;

    packageEntity.token = token.reverted ? null : handleERC20Token(token.value);

    // Create template
    let context = new DataSourceContext();
    context.setString('daoAddress', daoId);
    ERC20Voting.createWithContext(who, context);

    packageEntity.save();
  }
}

function createAddresslistPackage(who: Address, daoId: string): void {
  let packageEntity = AllowlistPlugin.load(who.toHexString());
  if (!packageEntity) {
    packageEntity = new AllowlistPlugin(who.toHexString());
    let contract = AddresslistContract.bind(who);
    let relativeSupportThresholdPct = contract.try_relativeSupportThresholdPct();
    let totalSupportThresholdPct = contract.try_totalSupportThresholdPct();
    let minDuration = contract.try_minDuration();

    packageEntity.relativeSupportThresholdPct = relativeSupportThresholdPct.reverted
      ? null
      : relativeSupportThresholdPct.value;
    packageEntity.totalSupportThresholdPct = totalSupportThresholdPct.reverted
      ? null
      : totalSupportThresholdPct.value;
    packageEntity.minDuration = minDuration.reverted ? null : minDuration.value;

    // Create template
    let context = new DataSourceContext();
    context.setString('daoAddress', daoId);
    Addresslist.createWithContext(who, context);

    packageEntity.save();
  }
}

export function addPackage(daoId: string, who: Address): void {
  // package
  // TODO: rethink this once the market place is ready
  let contract = ERC165Contract.bind(who);

  let ERC20VotingInterfaceSuppoted = supportsInterface(
    contract,
    ERC20_VOTING_INTERFACE
  );
  let allowlistInterfaceSuppoted = supportsInterface(
    contract,
    ALLOWLIST_VOTING_INTERFACE
  );

  if (ERC20VotingInterfaceSuppoted) {
    createErc20VotingPackage(who, daoId);
  } else if (allowlistInterfaceSuppoted) {
    createAddresslistPackage(who, daoId);
  }

  if (ERC20VotingInterfaceSuppoted || allowlistInterfaceSuppoted) {
    let daoPluginEntityId = daoId + '_' + who.toHexString();
    let daoPluginEntity = new DaoPlugin(daoPluginEntityId);
    daoPluginEntity.plugin = who.toHexString();
    daoPluginEntity.dao = daoId;
    daoPluginEntity.save();
  }
}

export function removePackage(daoId: string, who: string): void {
  let daoPluginEntityId = daoId + '_' + who;
  let daoPluginEntity = DaoPlugin.load(daoPluginEntityId);
  if (daoPluginEntity) {
    store.remove('DaoPlugin', daoPluginEntityId);
  }
}
