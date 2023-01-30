import {VersionCreated} from '../../generated/templates/PluginRepoTemplate/PluginRepo';
import {PluginVersion, PluginSetup} from '../../generated/schema';
import {BigInt} from '@graphprotocol/graph-ts';

export function handleVersionCreated(event: VersionCreated): void {
  let id = `${event.address.toHexString()}_${event.params.release.toString()}_${event.params.build.toString()}`;
  let pluginSetupId = event.params.pluginSetup.toHexString();
  let entity = new PluginVersion(id);
  entity.pluginRepo = event.address.toHexString();
  // TODO: SARKAWT
  // entity.semanticVersion = event.params.semanticVersion.map<BigInt>(version =>
  //   BigInt.fromI32(version)
  // );
  entity.pluginSetup = pluginSetupId;
  entity.contentURI = event.params.buildMetadata;

  entity.save();

  let pluginSetupEntity = PluginSetup.load(pluginSetupId);
  if (!pluginSetupEntity) {
    pluginSetupEntity = new PluginSetup(pluginSetupId);
    pluginSetupEntity.save();
  }
}
