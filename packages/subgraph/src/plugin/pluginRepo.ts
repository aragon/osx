import {VersionCreated} from '../../generated/templates/PluginRepoTemplate/PluginRepo';
import {PluginVersion, PluginSetup} from '../../generated/schema';

export function handleVersionCreated(event: VersionCreated): void {
  let id = `${event.address.toHexString()}_${event.params.release.toString()}_${event.params.build.toString()}`;
  let pluginSetupId = event.params.pluginSetup.toHexString();
  let entity = new PluginVersion(id);
  entity.pluginRepo = event.address.toHexString();
  entity.release = event.params.release;
  entity.build = event.params.build;
  entity.pluginSetup = pluginSetupId;
  entity.metadata = event.params.buildMetadata;
  entity.save();

  let pluginSetupEntity = PluginSetup.load(pluginSetupId);
  if (!pluginSetupEntity) {
    pluginSetupEntity = new PluginSetup(pluginSetupId);
    pluginSetupEntity.save();
  }
}
