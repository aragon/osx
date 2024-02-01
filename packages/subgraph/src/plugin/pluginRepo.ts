import {
  PluginVersion,
  PluginSetup,
  PluginRelease,
  Permission,
} from '../../generated/schema';
import {
  ReleaseMetadataUpdated,
  VersionCreated,
  Granted,
  Revoked,
} from '../../generated/templates/PluginRepoTemplate/PluginRepo';
import {
  generatePermissionEntityId,
  generatePluginReleaseEntityId,
  generatePluginRepoEntityId,
  generatePluginSetupEntityId,
  generatePluginVersionEntityId,
} from '@aragon/osx-commons-subgraph';
import {store} from '@graphprotocol/graph-ts';

export function handleVersionCreated(event: VersionCreated): void {
  // PluginSetup
  let pluginSetupId = generatePluginSetupEntityId(event.params.pluginSetup);

  let pluginSetupEntity = PluginSetup.load(pluginSetupId);
  if (!pluginSetupEntity) {
    pluginSetupEntity = new PluginSetup(pluginSetupId);
    pluginSetupEntity.save();
  }

  // PluginVersion
  const pluginRepoAddress = event.address;
  const build = event.params.build;
  const release = event.params.release;
  let pluginReleaseId = generatePluginReleaseEntityId(
    pluginRepoAddress,
    release
  );
  let pluginVersionId = generatePluginVersionEntityId(
    pluginRepoAddress,
    release,
    build
  );

  let entity = new PluginVersion(pluginVersionId);
  entity.pluginRepo = pluginRepoAddress.toHexString();
  entity.pluginSetup = pluginSetupId;

  entity.release = pluginReleaseId;
  entity.build = build;

  entity.metadata = event.params.buildMetadata.toString();
  entity.save();
}

export function handleReleaseMetadataUpdated(
  event: ReleaseMetadataUpdated
): void {
  let pluginRepoAddress = event.address;
  let pluginRepoId = generatePluginRepoEntityId(pluginRepoAddress);
  let pluginRelease = event.params.release;
  let releaseMetadata = event.params.releaseMetadata.toString();

  let pluginReleaseEntityId = generatePluginReleaseEntityId(
    pluginRepoAddress,
    pluginRelease
  );

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
  const contractAddress = event.address;
  const where = event.params.where;
  const permissionId = event.params.permissionId;
  const who = event.params.who;

  const permissionEntityId = generatePermissionEntityId(
    contractAddress,
    permissionId,
    where,
    who
  );

  // Permission
  let permissionEntity = Permission.load(permissionEntityId);
  if (!permissionEntity) {
    permissionEntity = new Permission(permissionEntityId);
    permissionEntity.where = where;
    permissionEntity.permissionId = permissionId;
    permissionEntity.who = who;
    permissionEntity.actor = event.params.here;
    permissionEntity.condition = event.params.condition;

    permissionEntity.pluginRepo = contractAddress.toHexString();

    permissionEntity.save();
  }
}

export function handleRevoked(event: Revoked): void {
  // permission
  const contractAddress = event.address;
  const where = event.params.where;
  const permissionId = event.params.permissionId;
  const who = event.params.who;

  const permissionEntityId = generatePermissionEntityId(
    contractAddress,
    permissionId,
    where,
    who
  );

  const permissionEntity = Permission.load(permissionEntityId);
  if (permissionEntity) {
    store.remove('Permission', permissionEntityId);
  }
}
