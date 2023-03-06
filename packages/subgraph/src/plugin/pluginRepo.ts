import {
  ReleaseMetadataUpdated,
  VersionCreated
} from '../../generated/templates/PluginRepoTemplate/PluginRepo';
import {
  PluginVersion,
  PluginSetup,
  PluginRelease
} from '../../generated/schema';
import {getPluginVersionId} from './utils';
import {log} from '@graphprotocol/graph-ts';

export function handleVersionCreated(event: VersionCreated): void {
  // PluginSetup
  let pluginSetupId = event.params.pluginSetup.toHexString();

  let pluginSetupEntity = PluginSetup.load(pluginSetupId);
  if (!pluginSetupEntity) {
    pluginSetupEntity = new PluginSetup(pluginSetupId);
    pluginSetupEntity.save();
  }

  // PluginVersion
  let pluginRepoId = event.address.toHexString();
  let pluginReleaseId = pluginRepoId
    .concat('_')
    .concat(event.params.release.toString());

  let pluginVersionId = getPluginVersionId(
    pluginRepoId,
    event.params.release,
    event.params.build
  );

  let entity = new PluginVersion(pluginVersionId);
  entity.pluginRepo = event.address.toHexString();
  entity.pluginSetup = pluginSetupId;

  entity.release = pluginReleaseId;
  entity.build = event.params.build;

  entity.metadata = event.params.buildMetadata.toString();
  entity.save();
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
