import {Address, DataSourceContext, store} from '@graphprotocol/graph-ts';

import {ERC20Voting as ERC20VotingContract} from '../../generated/templates/ERC20Voting/ERC20Voting';
import {Addresslist as AddresslistContract} from '../../generated/templates/Addresslist/Addresslist';
import {ERC165 as ERC165Contract} from '../../generated/templates/DaoTemplate/ERC165';
import {ERC20Voting, Addresslist, Admin} from '../../generated/templates';
import {
  DaoPlugin,
  ERC20VotingPlugin,
  AddresslistPlugin,
  AdminPlugin
} from '../../generated/schema';
import {handleERC20Token} from '../utils/tokens';
import {
  ERC20_VOTING_INTERFACE,
  ADDRESSLIST_VOTING_INTERFACE,
  ADMIN_INTERFACE
} from '../utils/constants';
import {supportsInterface} from '../utils/erc165';

function createErc20VotingPlugin(plugin: Address, daoId: string): void {
  let packageEntity = ERC20VotingPlugin.load(plugin.toHexString());
  if (!packageEntity) {
    packageEntity = new ERC20VotingPlugin(plugin.toHexString());
    let contract = ERC20VotingContract.bind(plugin);
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
    ERC20Voting.createWithContext(plugin, context);

    packageEntity.save();
  }
}

function createAddresslistPlugin(plugin: Address, daoId: string): void {
  let packageEntity = AddresslistPlugin.load(plugin.toHexString());
  if (!packageEntity) {
    packageEntity = new AddresslistPlugin(plugin.toHexString());
    let contract = AddresslistContract.bind(plugin);
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
    Addresslist.createWithContext(plugin, context);

    packageEntity.save();
  }
}

function createAdminPlugin(plugin: Address, daoId: string): void {
  let packageEntity = AdminPlugin.load(plugin.toHexString());
  if (!packageEntity) {
    packageEntity = new AdminPlugin(plugin.toHexString());

    // Create template
    let context = new DataSourceContext();
    context.setString('daoAddress', daoId);
    Admin.createWithContext(plugin, context);

    packageEntity.save();
  }
}

export function addPlugin(daoId: string, plugin: Address): void {
  // package
  // TODO: rethink this once the market place is ready
  let contract = ERC165Contract.bind(plugin);

  let ERC20VotingInterfaceSuppoted = supportsInterface(
    contract,
    ERC20_VOTING_INTERFACE
  );
  let addresslistInterfaceSuppoted = supportsInterface(
    contract,
    ADDRESSLIST_VOTING_INTERFACE
  );

  let adminInterfaceSuppoted = supportsInterface(contract, ADMIN_INTERFACE);

  if (ERC20VotingInterfaceSuppoted) {
    createErc20VotingPlugin(plugin, daoId);
  } else if (addresslistInterfaceSuppoted) {
    createAddresslistPlugin(plugin, daoId);
  } else if (adminInterfaceSuppoted) {
    createAdminPlugin(plugin, daoId);
  }

  if (
    ERC20VotingInterfaceSuppoted ||
    addresslistInterfaceSuppoted ||
    adminInterfaceSuppoted
  ) {
    let daoPluginEntityId = daoId + '_' + plugin.toHexString();
    let daoPluginEntity = new DaoPlugin(daoPluginEntityId);
    daoPluginEntity.plugin = plugin.toHexString();
    daoPluginEntity.dao = daoId;
    daoPluginEntity.save();
  }
}

export function removePlugin(daoId: string, plugin: string): void {
  let daoPluginEntityId = daoId + '_' + plugin;
  let daoPluginEntity = DaoPlugin.load(daoPluginEntityId);
  if (daoPluginEntity) {
    store.remove('DaoPlugin', daoPluginEntityId);
  }
}
