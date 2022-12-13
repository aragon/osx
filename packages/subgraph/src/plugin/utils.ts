import {Address, DataSourceContext, store} from '@graphprotocol/graph-ts';

import {TokenVoting as TokenVotingContract} from '../../generated/templates/TokenVoting/TokenVoting';
import {AddresslistVoting as AddresslistVotingContract} from '../../generated/templates/AddresslistVoting/AddresslistVoting';
import {ERC165 as ERC165Contract} from '../../generated/templates/DaoTemplate/ERC165';
import {TokenVoting, AddresslistVoting, Admin} from '../../generated/templates';
import {
  DaoPlugin,
  TokenVotingPlugin,
  AddresslistVotingPlugin,
  AdminPlugin
} from '../../generated/schema';
import {handleERC20Token} from '../utils/tokens';
import {
  TOKEN_VOTING_INTERFACE,
  ADDRESSLIST_VOTING_INTERFACE,
  ADMIN_INTERFACE
} from '../utils/constants';
import {supportsInterface} from '../utils/erc165';

function createTokenVotingPlugin(plugin: Address, daoId: string): void {
  let packageEntity = TokenVotingPlugin.load(plugin.toHexString());
  if (!packageEntity) {
    packageEntity = new TokenVotingPlugin(plugin.toHexString());
    let contract = TokenVotingContract.bind(plugin);
    let supportThreshold = contract.try_supportThreshold();
    let minParticipation = contract.try_minParticipation();
    let minDuration = contract.try_minDuration();
    let token = contract.try_getVotingToken();

    packageEntity.supportThreshold = supportThreshold.reverted
      ? null
      : supportThreshold.value;
    packageEntity.minParticipation = minParticipation.reverted
      ? null
      : minParticipation.value;
    packageEntity.minDuration = minDuration.reverted ? null : minDuration.value;

    packageEntity.token = token.reverted ? null : handleERC20Token(token.value);

    // Create template
    let context = new DataSourceContext();
    context.setString('daoAddress', daoId);
    TokenVoting.createWithContext(plugin, context);

    packageEntity.save();
  }
}

function createAddresslistVotingPlugin(plugin: Address, daoId: string): void {
  let packageEntity = AddresslistVotingPlugin.load(plugin.toHexString());
  if (!packageEntity) {
    packageEntity = new AddresslistVotingPlugin(plugin.toHexString());
    let contract = AddresslistVotingContract.bind(plugin);

    let earlyExecution = contract.try_earlyExecution();
    let voteReplacement = contract.try_voteReplacement();

    let supportThreshold = contract.try_supportThreshold();
    let minParticipation = contract.try_minParticipation();
    let minDuration = contract.try_minDuration();
    let minProposerVotingPower = contract.try_minProposerVotingPower();

    packageEntity.earlyExecution = earlyExecution.reverted
      ? false
      : earlyExecution.value;
    packageEntity.voteReplacement = voteReplacement.reverted
      ? false
      : voteReplacement.value;

    packageEntity.supportThreshold = supportThreshold.reverted
      ? null
      : supportThreshold.value;
    packageEntity.minParticipation = minParticipation.reverted
      ? null
      : minParticipation.value;
    packageEntity.minDuration = minDuration.reverted ? null : minDuration.value;

    packageEntity.minProposerVotingPower = minProposerVotingPower.reverted
      ? null
      : minProposerVotingPower.value;

    // Create template
    let context = new DataSourceContext();
    context.setString('daoAddress', daoId);
    AddresslistVoting.createWithContext(plugin, context);

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

  let TokenVotingInterfaceSuppoted = supportsInterface(
    contract,
    TOKEN_VOTING_INTERFACE
  );
  let addresslistInterfaceSuppoted = supportsInterface(
    contract,
    ADDRESSLIST_VOTING_INTERFACE
  );

  let adminInterfaceSupported = supportsInterface(contract, ADMIN_INTERFACE);

  if (TokenVotingInterfaceSuppoted) {
    createTokenVotingPlugin(plugin, daoId);
  } else if (addresslistInterfaceSuppoted) {
    createAddresslistVotingPlugin(plugin, daoId);
  } else if (adminInterfaceSupported) {
    createAdminPlugin(plugin, daoId);
  }

  if (
    TokenVotingInterfaceSuppoted ||
    addresslistInterfaceSuppoted ||
    adminInterfaceSupported
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
