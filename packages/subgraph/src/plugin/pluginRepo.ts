import {store} from '@graphprotocol/graph-ts';
import {
  ReleaseMetadataUpdated,
  VersionCreated,
  Granted,
  Revoked
} from '../../generated/templates/PluginRepoTemplate/PluginRepo';
import {
  PluginVersion,
  PluginSetup,
  PluginRelease,
  Permission
} from '../../generated/schema';
import {getPluginVersionId} from './utils';

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

export function handleGranted(event: Granted): void {
  let contractAddress = event.address.toHexString();
  let where = event.params.where;
  let contractPermissionId = event.params.permissionId;
  let who = event.params.who;

  let permissionEntityId = [
    contractAddress,
    where.toHexString(),
    contractPermissionId.toHexString(),
    who.toHexString()
  ].join('_');

  let pluginRepo = contractAddress;

  // Permission
  let permissionEntity = new Permission(permissionEntityId);
  permissionEntity.where = event.params.where;
  permissionEntity.who = event.params.who;
  permissionEntity.actor = event.params.here;
  permissionEntity.condition = event.params.condition;

  permissionEntity.pluginRepo = pluginRepo;
  permissionEntity.save();
}

export function handleRevoked(event: Revoked): void {
  // permission
  let contractAddress = event.address.toHexString();
  let where = event.params.where;
  let contractPermissionId = event.params.permissionId;
  let who = event.params.who;

  let permissionEntityId = [
    contractAddress,
    where.toHexString(),
    contractPermissionId.toHexString(),
    who.toHexString()
  ].join('_');

  let permissionEntity = Permission.load(permissionEntityId);
  if (permissionEntity) {
    store.remove('Permission', permissionEntityId);
  }
}
