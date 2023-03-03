import {
  ReleaseMetadataUpdated,
  VersionCreated
} from '../../generated/templates/PluginRepoTemplate/PluginRepo';
import {
  PluginVersion,
  PluginSetup,
  PluginRelease
} from '../../generated/schema';

export function handleVersionCreated(event: VersionCreated): void {
  let pluginRepoId = event.address.toHexString();
  let pluginSetupId = event.params.pluginSetup.toHexString();
  let pluginRelease = event.params.release.toString();

  let pluginVersionId = pluginRepoId
    .concat('_')
    .concat(pluginRelease)
    .concat('_')
    .concat(event.params.build.toString());

  let pluginReleaseId = pluginRepoId.concat('_').concat(pluginRelease);

  let entity = new PluginVersion(pluginVersionId);
  entity.pluginRepo = event.address.toHexString();
  entity.release = pluginReleaseId;
  entity.build = event.params.build;
  entity.pluginSetup = pluginSetupId;
  entity.metadata = event.params.buildMetadata.toString();
  entity.save();

  let pluginSetupEntity = PluginSetup.load(pluginSetupId);
  if (!pluginSetupEntity) {
    pluginSetupEntity = new PluginSetup(pluginSetupId);
    pluginSetupEntity.save();
  }
}

export function handleReleaseMetadataUpdated(
  event: ReleaseMetadataUpdated
): void {
  let pluginRepoId = event.address.toHexString();
  let pluginRelease = event.params.release;
  let releaseMetadata = event.params.releaseMetadata.toString();

  let pluginReleaseEntityId = pluginRepoId
    .concat('_')
    .concat(pluginRelease.toString());

  let pluginReleaseEntity = PluginRelease.load(pluginReleaseEntityId);
  if (!pluginReleaseEntity) {
    pluginReleaseEntity = new PluginRelease(pluginReleaseEntityId);
    pluginReleaseEntity.pluginRepo = pluginRepoId;
    pluginReleaseEntity.release = pluginRelease;
  }

  pluginReleaseEntity.metadata = releaseMetadata;
  pluginReleaseEntity.save();
}
