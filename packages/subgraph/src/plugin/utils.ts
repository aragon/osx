import {
  Address,
  Bytes,
  DataSourceContext,
  ethereum,
  crypto,
  ByteArray,
  BigInt
} from '@graphprotocol/graph-ts';

import {TokenVoting as TokenVotingContract} from '../../generated/templates/TokenVoting/TokenVoting';
import {AddresslistVoting as AddresslistVotingContract} from '../../generated/templates/AddresslistVoting/AddresslistVoting';
import {ERC165 as ERC165Contract} from '../../generated/PluginSetupProcessor/ERC165';
import {
  TokenVoting,
  AddresslistVoting,
  Admin,
  Multisig
} from '../../generated/templates';
import {
  TokenVotingPlugin,
  AddresslistVotingPlugin,
  AdminPlugin,
  MultisigPlugin
} from '../../generated/schema';
import {
  TOKEN_VOTING_INTERFACE,
  ADDRESSLIST_VOTING_INTERFACE,
  ADMIN_INTERFACE,
  VOTING_MODES,
  MULTISIG_INTERFACE
} from '../utils/constants';
import {supportsInterface} from '../utils/erc165';
import {fetchERC20} from '../utils/tokens/erc20';

export const PERMISSION_OPERATIONS = new Map<number, string>()
  .set(0, 'Grant')
  .set(1, 'Revoke')
  .set(2, 'GrantWithCondition');

function createTokenVotingPlugin(plugin: Address, daoId: string): void {
  let pluginId = plugin.toHexString();
  let packageEntity = TokenVotingPlugin.load(pluginId);
  if (!packageEntity) {
    packageEntity = new TokenVotingPlugin(pluginId);
    packageEntity.pluginAddress = plugin;
    packageEntity.dao = daoId;
    packageEntity.proposalCount = BigInt.zero();
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

    if (!token.reverted) {
      let contract = fetchERC20(token.value);
      if (contract) {
        packageEntity.token = contract.id;
      }
    }

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
    packageEntity.pluginAddress = plugin;
    packageEntity.dao = daoId;
    packageEntity.proposalCount = BigInt.zero();

    let contract = AddresslistVotingContract.bind(plugin);

    let votingMode = contract.try_votingMode();
    let supportThreshold = contract.try_supportThreshold();
    let minParticipation = contract.try_minParticipation();
    let minDuration = contract.try_minDuration();
    let minProposerVotingPower = contract.try_minProposerVotingPower();

    packageEntity.votingMode = votingMode.reverted
      ? null
      : VOTING_MODES.get(votingMode.value);
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
    packageEntity.pluginAddress = plugin;
    packageEntity.dao = daoId;

    // Create template
    let context = new DataSourceContext();
    context.setString('daoAddress', daoId);
    Admin.createWithContext(plugin, context);

    packageEntity.save();
  }
}

function createMultisigPlugin(plugin: Address, daoId: string): void {
  let packageEntity = MultisigPlugin.load(plugin.toHexString());
  if (!packageEntity) {
    packageEntity = new MultisigPlugin(plugin.toHexString());
    packageEntity.onlyListed = false;
    packageEntity.pluginAddress = plugin;
    packageEntity.dao = daoId;
    packageEntity.proposalCount = BigInt.zero();

    // Create template
    let context = new DataSourceContext();
    context.setString('daoAddress', daoId);
    Multisig.createWithContext(plugin, context);

    packageEntity.save();
  }
}

export function addPlugin(daoId: string, plugin: Address): void {
  // package
  // TODO: rethink this once the market place is ready
  let contract = ERC165Contract.bind(plugin);

  let tokenVotingInterfaceSupported = supportsInterface(
    contract,
    TOKEN_VOTING_INTERFACE
  );
  let addresslistInterfaceSupported = supportsInterface(
    contract,
    ADDRESSLIST_VOTING_INTERFACE
  );
  let adminInterfaceSupported = supportsInterface(contract, ADMIN_INTERFACE);
  let multisigInterfaceSupported = supportsInterface(
    contract,
    MULTISIG_INTERFACE
  );

  if (tokenVotingInterfaceSupported) {
    createTokenVotingPlugin(plugin, daoId);
  } else if (addresslistInterfaceSupported) {
    createAddresslistVotingPlugin(plugin, daoId);
  } else if (adminInterfaceSupported) {
    createAdminPlugin(plugin, daoId);
  } else if (multisigInterfaceSupported) {
    createMultisigPlugin(plugin, daoId);
  }
}

export function getPluginInstallationId(
  dao: string,
  plugin: string
): Bytes | null {
  let installationIdTupleArray = new ethereum.Tuple();
  installationIdTupleArray.push(
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  installationIdTupleArray.push(
    ethereum.Value.fromAddress(Address.fromString(plugin))
  );

  let installationIdTuple = installationIdTupleArray as ethereum.Tuple;
  let installationIdTupleEncoded = ethereum.encode(
    ethereum.Value.fromTuple(installationIdTuple)
  );

  if (installationIdTupleEncoded) {
    return Bytes.fromHexString(
      crypto
        .keccak256(
          ByteArray.fromHexString(installationIdTupleEncoded.toHexString())
        )
        .toHexString()
    );
  }
  return null;
}

export function getPluginVersionId(
  pluginRepo: string,
  release: i32,
  build: i32
): string {
  return pluginRepo
    .concat('_')
    .concat(release.toString())
    .concat('_')
    .concat(build.toString());
}
