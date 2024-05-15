import {
  InstallationApplied,
  InstallationPrepared,
  UninstallationApplied,
  UninstallationPrepared,
  UpdateApplied,
  UpdatePrepared,
} from '../../generated/PluginSetupProcessor/PluginSetupProcessor';
import {
  PluginInstallation,
  PluginPermission,
  PluginPreparation,
} from '../../generated/schema';
import {addPlugin, PERMISSION_OPERATIONS} from './utils';
import {
  generateDaoEntityId,
  generatePluginEntityId,
  generatePluginInstallationEntityId,
  generatePluginPermissionEntityId,
  generatePluginPreparationEntityId,
  generatePluginRepoEntityId,
  generatePluginVersionEntityId,
} from '@aragon/osx-commons-subgraph';
import {Bytes, log} from '@graphprotocol/graph-ts';

export function handleInstallationPrepared(event: InstallationPrepared): void {
  let daoAddress = event.params.dao;
  let pluginAddress = event.params.plugin;
  let pluginRepoAddress = event.params.pluginSetupRepo;
  let daoEntityId = generateDaoEntityId(daoAddress);
  let pluginEntityId = generatePluginEntityId(pluginAddress);
  let pluginRepoEntityId = generatePluginRepoEntityId(pluginRepoAddress);
  let preparedSetupId = event.params.preparedSetupId;

  let pluginVersionId = generatePluginVersionEntityId(
    pluginRepoAddress,
    event.params.versionTag.release,
    event.params.versionTag.build
  );

  let installationId = generatePluginInstallationEntityId(
    daoAddress,
    pluginAddress
  );
  if (!installationId) {
    log.error('Failed to get installationId', [daoEntityId, pluginEntityId]);
    return;
  }
  installationId = installationId as string;
  let preparationId = generatePluginPreparationEntityId(
    installationId,
    preparedSetupId
  );

  let helpers: Bytes[] = [];
  for (let i = 0; i < event.params.preparedSetupData.helpers.length; i++) {
    helpers.push(event.params.preparedSetupData.helpers[i]);
  }

  let preparationEntity = new PluginPreparation(preparationId);
  preparationEntity.installation = installationId;
  preparationEntity.creator = event.params.sender;
  preparationEntity.dao = daoEntityId;
  preparationEntity.preparedSetupId = event.params.preparedSetupId;
  preparationEntity.pluginRepo = pluginRepoEntityId;
  preparationEntity.pluginVersion = pluginVersionId;
  preparationEntity.data = event.params.data;
  preparationEntity.pluginAddress = event.params.plugin;
  preparationEntity.helpers = helpers;
  preparationEntity.type = 'Installation';
  preparationEntity.save();

  for (let i = 0; i < event.params.preparedSetupData.permissions.length; i++) {
    let permission = event.params.preparedSetupData.permissions[i];
    let permissionId = generatePluginPermissionEntityId(
      preparationId,
      permission.operation,
      permission.where,
      permission.who,
      permission.permissionId
    );
    let operation = PERMISSION_OPERATIONS.get(permission.operation);
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

  let pluginEntity = PluginInstallation.load(installationId);
  if (!pluginEntity) {
    pluginEntity = new PluginInstallation(installationId);
  }
  pluginEntity.state = 'InstallationPrepared';
  pluginEntity.dao = daoEntityId;
  pluginEntity.save();

  addPlugin(daoEntityId, event.params.plugin);
}

export function handleInstallationApplied(event: InstallationApplied): void {
  let daoAddress = event.params.dao;
  let pluginAddress = event.params.plugin;
  let daoEntityId = generateDaoEntityId(daoAddress);
  let pluginEntityId = generatePluginEntityId(pluginAddress);
  let installationId = generatePluginInstallationEntityId(
    daoAddress,
    pluginAddress
  );
  if (!installationId) {
    log.error('Failed to get installationId', [daoEntityId, pluginEntityId]);
    return;
  }

  installationId = installationId as string;
  let preparationId = generatePluginPreparationEntityId(
    installationId,
    event.params.preparedSetupId
  );

  let pluginEntity = PluginInstallation.load(installationId);
  if (!pluginEntity) {
    pluginEntity = new PluginInstallation(installationId);
    pluginEntity.dao = daoEntityId;
  }

  let pluginPreparationEntity = PluginPreparation.load(preparationId);
  if (pluginPreparationEntity) {
    pluginEntity.appliedPluginRepo = pluginPreparationEntity.pluginRepo;
    pluginEntity.appliedVersion = pluginPreparationEntity.pluginVersion;
  }
  pluginEntity.plugin = pluginEntityId;
  pluginEntity.appliedPreparation = preparationId;
  pluginEntity.appliedSetupId = event.params.appliedSetupId;
  pluginEntity.state = 'Installed';
  pluginEntity.save();
}

export function handleUpdatePrepared(event: UpdatePrepared): void {
  let daoAddress = event.params.dao;
  let pluginAddress = event.params.setupPayload.plugin;
  let pluginRepoAddress = event.params.pluginSetupRepo;
  let setupId = event.params.preparedSetupId;
  let daoEntityId = generateDaoEntityId(daoAddress);
  let pluginEntityId = generatePluginEntityId(pluginAddress);
  let pluginVersionId = generatePluginVersionEntityId(
    pluginRepoAddress,
    event.params.versionTag.release,
    event.params.versionTag.build
  );

  let installationId = generatePluginInstallationEntityId(
    daoAddress,
    pluginAddress
  );
  if (!installationId) {
    log.error('Failed to get installationId', [daoEntityId, pluginEntityId]);
    return;
  }

  installationId = installationId as string;

  let preparationId = generatePluginPreparationEntityId(
    installationId,
    setupId
  );

  let helpers: Bytes[] = [];
  for (let i = 0; i < event.params.preparedSetupData.helpers.length; i++) {
    helpers.push(event.params.preparedSetupData.helpers[i]);
  }

  let preparationEntity = new PluginPreparation(preparationId);
  preparationEntity.installation = installationId;
  preparationEntity.creator = event.params.sender;
  preparationEntity.dao = daoEntityId;
  preparationEntity.preparedSetupId = event.params.preparedSetupId;
  preparationEntity.pluginRepo = generatePluginEntityId(
    event.params.pluginSetupRepo
  );
  preparationEntity.pluginVersion = pluginVersionId;
  preparationEntity.data = event.params.initData;
  preparationEntity.pluginAddress = event.params.setupPayload.plugin;
  preparationEntity.helpers = helpers;
  preparationEntity.type = 'Update';
  preparationEntity.save();

  for (let i = 0; i < event.params.preparedSetupData.permissions.length; i++) {
    let permission = event.params.preparedSetupData.permissions[i];
    let operation = PERMISSION_OPERATIONS.get(permission.operation);
    let permissionId = generatePluginPermissionEntityId(
      preparationId,
      permission.operation,
      permission.where,
      permission.who,
      permission.permissionId
    );
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

  let pluginEntity = PluginInstallation.load(installationId);
  if (!pluginEntity) {
    pluginEntity = new PluginInstallation(installationId);
    pluginEntity.dao = daoEntityId;
  }

  pluginEntity.state = 'UpdatePrepared';
  pluginEntity.save();
}

export function handleUpdateApplied(event: UpdateApplied): void {
  let daoAddress = event.params.dao;
  let pluginAddress = event.params.plugin;
  let daoEntityId = generateDaoEntityId(daoAddress);
  let pluginEntityId = generatePluginEntityId(pluginAddress);
  let installationId = generatePluginInstallationEntityId(
    daoAddress,
    pluginAddress
  );
  if (!installationId) {
    log.error('Failed to get installationId', [daoEntityId, pluginEntityId]);
    return;
  }
  installationId = installationId as string;
  let preparationId = generatePluginPreparationEntityId(
    installationId,
    event.params.preparedSetupId
  );

  let pluginEntity = PluginInstallation.load(installationId);
  if (!pluginEntity) {
    pluginEntity = new PluginInstallation(installationId);
    pluginEntity.dao = daoEntityId;
  }

  let pluginPreparationEntity = PluginPreparation.load(preparationId);
  if (pluginPreparationEntity) {
    pluginEntity.appliedPluginRepo = pluginPreparationEntity.pluginRepo;
    pluginEntity.appliedVersion = pluginPreparationEntity.pluginVersion;
  }
  pluginEntity.plugin = pluginEntityId;
  pluginEntity.appliedPreparation = preparationId;
  pluginEntity.appliedSetupId = event.params.appliedSetupId;
  pluginEntity.state = 'Installed';
  pluginEntity.save();

  addPlugin(daoEntityId, pluginAddress);
}

export function handleUninstallationPrepared(
  event: UninstallationPrepared
): void {
  let daoAddress = event.params.dao;
  let pluginAddress = event.params.setupPayload.plugin;
  let setupId = event.params.preparedSetupId;
  let pluginRepoAddress = event.params.pluginSetupRepo;
  let daoEntityId = generateDaoEntityId(daoAddress);
  let pluginEntityId = generatePluginEntityId(pluginAddress);
  let pluginRepoEntityId = generatePluginRepoEntityId(pluginRepoAddress);

  let pluginVersionId = generatePluginVersionEntityId(
    pluginRepoAddress,
    event.params.versionTag.release,
    event.params.versionTag.build
  );

  let installationId = generatePluginInstallationEntityId(
    daoAddress,
    pluginAddress
  );
  if (!installationId) {
    log.error('Failed to get installationId', [daoEntityId, pluginEntityId]);
    return;
  }
  installationId = installationId as string;

  let preparationId = generatePluginPreparationEntityId(
    installationId,
    setupId
  );

  let preparationEntity = new PluginPreparation(preparationId);
  preparationEntity.installation = installationId;
  preparationEntity.creator = event.params.sender;
  preparationEntity.dao = daoEntityId;
  preparationEntity.preparedSetupId = event.params.preparedSetupId;
  preparationEntity.pluginRepo = pluginRepoEntityId;
  preparationEntity.pluginVersion = pluginVersionId;
  preparationEntity.pluginAddress = event.params.setupPayload.plugin;
  preparationEntity.helpers = [];
  preparationEntity.type = 'Uninstallation';
  preparationEntity.save();

  for (let i = 0; i < event.params.permissions.length; i++) {
    let permission = event.params.permissions[i];
    let operation = PERMISSION_OPERATIONS.get(permission.operation);
    let permissionId = generatePluginPermissionEntityId(
      preparationId,
      permission.operation,
      permission.where,
      permission.who,
      permission.permissionId
    );
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

  let pluginEntity = PluginInstallation.load(installationId);
  if (!pluginEntity) {
    pluginEntity = new PluginInstallation(installationId);
    pluginEntity.dao = daoEntityId;
  }
  pluginEntity.state = 'UninstallPrepared';
  pluginEntity.save();
}

export function handleUninstallationApplied(
  event: UninstallationApplied
): void {
  let daoAddress = event.params.dao;
  let pluginAddress = event.params.plugin;
  let daoEntityId = generateDaoEntityId(daoAddress);
  let pluginEntityId = generatePluginEntityId(pluginAddress);
  let installationId = generatePluginInstallationEntityId(
    daoAddress,
    pluginAddress
  );
  if (!installationId) {
    log.error('Failed to get installationId', [daoEntityId, pluginEntityId]);
    return;
  }

  installationId = installationId as string;

  let preparationId = generatePluginPreparationEntityId(
    installationId,
    event.params.preparedSetupId
  );

  let pluginEntity = PluginInstallation.load(installationId);
  if (!pluginEntity) {
    pluginEntity = new PluginInstallation(installationId);
    pluginEntity.dao = daoEntityId;
  }
  pluginEntity.appliedPreparation = preparationId;
  pluginEntity.state = 'Uninstalled';
  pluginEntity.save();
}
