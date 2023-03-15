import {Bytes, log} from '@graphprotocol/graph-ts';
import {
  InstallationApplied,
  InstallationPrepared,
  UninstallationApplied,
  UninstallationPrepared,
  UpdateApplied,
  UpdatePrepared
} from '../../generated/PluginSetupProcessor/PluginSetupProcessor';
import {
  PluginInstallation,
  PluginPermission,
  PluginPreparation
} from '../../generated/schema';
import {
  addPlugin,
  getPluginInstallationId,
  getPluginVersionId,
  PERMISSION_OPERATIONS
} from './utils';

export function handleInstallationPrepared(event: InstallationPrepared): void {
  let dao = event.params.dao.toHexString();
  let plugin = event.params.plugin.toHexString();
  let setupId = event.params.preparedSetupId.toHexString();
  let pluginRepo = event.params.pluginSetupRepo.toHexString();
  let pluginVersionId = getPluginVersionId(
    pluginRepo,
    event.params.versionTag.release,
    event.params.versionTag.build
  );

  let installationId = getPluginInstallationId(dao, plugin);
  if (!installationId) {
    log.error('Failed to get installationId', [dao, plugin]);
    return;
  }

  let preparationId = `${installationId.toHexString()}_${setupId}`;

  let helpers: Bytes[] = [];
  for (let i = 0; i < event.params.preparedSetupData.helpers.length; i++) {
    helpers.push(event.params.preparedSetupData.helpers[i]);
  }

  let preparationEntity = new PluginPreparation(preparationId);
  preparationEntity.installation = installationId.toHexString();
  preparationEntity.creator = event.params.sender;
  preparationEntity.dao = dao;
  preparationEntity.preparedSetupId = event.params.preparedSetupId;
  preparationEntity.pluginRepo = event.params.pluginSetupRepo.toHexString();
  preparationEntity.pluginVersion = pluginVersionId;
  preparationEntity.data = event.params.data;
  preparationEntity.pluginAddress = event.params.plugin;
  preparationEntity.helpers = helpers;
  preparationEntity.type = 'Installation';
  preparationEntity.save();

  for (let i = 0; i < event.params.preparedSetupData.permissions.length; i++) {
    let permission = event.params.preparedSetupData.permissions[i];
    let operation = PERMISSION_OPERATIONS.get(permission.operation);
    let permissionId = `${preparationId}_${operation}_${permission.where.toHexString()}_${permission.who.toHexString()}_${permission.permissionId.toHexString()}`;
    let permissionEntity = new PluginPermission(permissionId);
    permissionEntity.pluginPreparation = preparationId;
    permissionEntity.operation = operation;
    permissionEntity.where = permission.where;
    permissionEntity.who = permission.who;
    permissionEntity.permissionId = permission.permissionId;
    if (permission.condition) {
      permissionEntity.condition = permission.condition;
    }
    permissionEntity.save();
  }

  let pluginEntity = PluginInstallation.load(installationId.toHexString());
  if (!pluginEntity) {
    pluginEntity = new PluginInstallation(installationId.toHexString());
  }
  pluginEntity.state = 'InstallationPrepared';
  pluginEntity.dao = dao;
  pluginEntity.save();

  addPlugin(dao, event.params.plugin);
}

export function handleInstallationApplied(event: InstallationApplied): void {
  let dao = event.params.dao.toHexString();
  let plugin = event.params.plugin.toHexString();
  let installationId = getPluginInstallationId(dao, plugin);
  if (!installationId) {
    log.error('Failed to get installationId', [dao, plugin]);
    return;
  }
  let preparationId = `${installationId.toHexString()}_${event.params.preparedSetupId.toHexString()}`;

  let pluginEntity = PluginInstallation.load(installationId.toHexString());
  if (!pluginEntity) {
    pluginEntity = new PluginInstallation(installationId.toHexString());
    pluginEntity.dao = dao;
  }

  let pluginPreparationEntity = PluginPreparation.load(preparationId);
  if (pluginPreparationEntity) {
    pluginEntity.appliedPluginRepo = pluginPreparationEntity.pluginRepo;
    pluginEntity.appliedVersion = pluginPreparationEntity.pluginVersion;
  }
  pluginEntity.plugin = plugin;
  pluginEntity.appliedPreparation = preparationId;
  pluginEntity.appliedSetupId = event.params.appliedSetupId;
  pluginEntity.state = 'Installed';
  pluginEntity.save();
}

export function handleUpdatePrepared(event: UpdatePrepared): void {
  let dao = event.params.dao.toHexString();
  let plugin = event.params.setupPayload.plugin.toHexString();
  let setupId = event.params.preparedSetupId.toHexString();
  let pluginRepo = event.params.pluginSetupRepo.toHexString();

  let pluginVersionId = getPluginVersionId(
    pluginRepo,
    event.params.versionTag.release,
    event.params.versionTag.build
  );

  let installationId = getPluginInstallationId(dao, plugin);
  if (!installationId) {
    log.error('Failed to get installationId', [dao, plugin]);
    return;
  }

  let preparationId = `${installationId.toHexString()}_${setupId}`;

  let helpers: Bytes[] = [];
  for (let i = 0; i < event.params.preparedSetupData.helpers.length; i++) {
    helpers.push(event.params.preparedSetupData.helpers[i]);
  }

  let preparationEntity = new PluginPreparation(preparationId);
  preparationEntity.installation = installationId.toHexString();
  preparationEntity.creator = event.params.sender;
  preparationEntity.dao = dao;
  preparationEntity.preparedSetupId = event.params.preparedSetupId;
  preparationEntity.pluginRepo = event.params.pluginSetupRepo.toHexString();
  preparationEntity.pluginVersion = pluginVersionId;
  preparationEntity.data = event.params.initData;
  preparationEntity.pluginAddress = event.params.setupPayload.plugin;
  preparationEntity.helpers = helpers;
  preparationEntity.type = 'Update';
  preparationEntity.save();

  for (let i = 0; i < event.params.preparedSetupData.permissions.length; i++) {
    let permission = event.params.preparedSetupData.permissions[i];
    let operation = PERMISSION_OPERATIONS.get(permission.operation);
    let permissionId = `${preparationId}_${operation}_${permission.where.toHexString()}_${permission.who.toHexString()}_${permission.permissionId.toHexString()}`;
    let permissionEntity = new PluginPermission(permissionId);
    permissionEntity.pluginPreparation = preparationId;
    permissionEntity.operation = operation;
    permissionEntity.where = permission.where;
    permissionEntity.who = permission.who;
    permissionEntity.permissionId = permission.permissionId;
    if (permission.condition) {
      permissionEntity.condition = permission.condition;
    }
    permissionEntity.save();
  }

  let pluginEntity = PluginInstallation.load(installationId.toHexString());
  if (!pluginEntity) {
    pluginEntity = new PluginInstallation(installationId.toHexString());
    pluginEntity.dao = dao;
  }

  pluginEntity.state = 'UpdatePrepared';
  pluginEntity.save();
}

export function handleUpdateApplied(event: UpdateApplied): void {
  let dao = event.params.dao.toHexString();
  let plugin = event.params.plugin.toHexString();
  let installationId = getPluginInstallationId(dao, plugin);
  if (!installationId) {
    log.error('Failed to get installationId', [dao, plugin]);
    return;
  }
  let preparationId = `${installationId.toHexString()}_${event.params.preparedSetupId.toHexString()}`;

  let pluginEntity = PluginInstallation.load(installationId.toHexString());
  if (!pluginEntity) {
    pluginEntity = new PluginInstallation(installationId.toHexString());
    pluginEntity.dao = dao;
  }

  let pluginPreparationEntity = PluginPreparation.load(preparationId);
  if (pluginPreparationEntity) {
    pluginEntity.appliedPluginRepo = pluginPreparationEntity.pluginRepo;
    pluginEntity.appliedVersion = pluginPreparationEntity.pluginVersion;
  }
  pluginEntity.plugin = plugin;
  pluginEntity.appliedPreparation = preparationId;
  pluginEntity.appliedSetupId = event.params.appliedSetupId;
  pluginEntity.state = 'Installed';
  pluginEntity.save();

  addPlugin(dao, event.params.plugin);
}

export function handleUninstallationPrepared(
  event: UninstallationPrepared
): void {
  let dao = event.params.dao.toHexString();
  let plugin = event.params.setupPayload.plugin.toHexString();
  let setupId = event.params.preparedSetupId.toHexString();
  let pluginRepo = event.params.pluginSetupRepo.toHexString();

  let pluginVersionId = getPluginVersionId(
    pluginRepo,
    event.params.versionTag.release,
    event.params.versionTag.build
  );

  let installationId = getPluginInstallationId(dao, plugin);
  if (!installationId) {
    log.error('Failed to get installationId', [dao, plugin]);
    return;
  }

  let preparationId = `${installationId.toHexString()}_${setupId}`;

  let preparationEntity = new PluginPreparation(preparationId);
  preparationEntity.installation = installationId.toHexString();
  preparationEntity.creator = event.params.sender;
  preparationEntity.dao = dao;
  preparationEntity.preparedSetupId = event.params.preparedSetupId;
  preparationEntity.pluginRepo = event.params.pluginSetupRepo.toHexString();
  preparationEntity.pluginVersion = pluginVersionId;
  preparationEntity.pluginAddress = event.params.setupPayload.plugin;
  preparationEntity.helpers = [];
  preparationEntity.type = 'Uninstallation';
  preparationEntity.save();

  for (let i = 0; i < event.params.permissions.length; i++) {
    let permission = event.params.permissions[i];
    let operation = PERMISSION_OPERATIONS.get(permission.operation);
    let permissionId = `${preparationId}_${operation}_${permission.where.toHexString()}_${permission.who.toHexString()}_${permission.permissionId.toHexString()}`;
    let permissionEntity = new PluginPermission(permissionId);
    permissionEntity.pluginPreparation = preparationId;
    permissionEntity.operation = operation;
    permissionEntity.where = permission.where;
    permissionEntity.who = permission.who;
    permissionEntity.permissionId = permission.permissionId;
    if (permission.condition) {
      permissionEntity.condition = permission.condition;
    }
    permissionEntity.save();
  }

  let pluginEntity = PluginInstallation.load(installationId.toHexString());
  if (!pluginEntity) {
    pluginEntity = new PluginInstallation(installationId.toHexString());
    pluginEntity.dao = dao;
  }
  pluginEntity.state = 'UninstallPrepared';
  pluginEntity.save();
}

export function handleUninstallationApplied(
  event: UninstallationApplied
): void {
  let dao = event.params.dao.toHexString();
  let plugin = event.params.plugin.toHexString();
  let installationId = getPluginInstallationId(dao, plugin);
  if (!installationId) {
    log.error('Failed to get installationId', [dao, plugin]);
    return;
  }
  let preparationId = `${installationId.toHexString()}_${event.params.preparedSetupId.toHexString()}`;

  let pluginEntity = PluginInstallation.load(installationId.toHexString());
  if (!pluginEntity) {
    pluginEntity = new PluginInstallation(installationId.toHexString());
    pluginEntity.dao = dao;
  }
  pluginEntity.appliedPreparation = preparationId;
  pluginEntity.state = 'Uninstalled';
  pluginEntity.save();
}
