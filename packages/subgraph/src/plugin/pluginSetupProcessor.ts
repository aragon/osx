import {Address, log} from '@graphprotocol/graph-ts';
import {
  InstallationApplied,
  InstallationPrepared,
  UninstallationApplied,
  UninstallationPrepared,
  UpdateApplied,
  UpdatePrepared
} from '../../generated/PluginSetupProcessor/PluginSetupProcessor';
import {Plugin, PluginHelper} from '../../generated/schema';
import {addPlugin} from './utils';

export function handleInstallationPrepared(event: InstallationPrepared): void {
  let pluginId = event.params.plugin.toHexString();

  let pluginEntity = new Plugin(pluginId);
  pluginEntity.sender = event.params.sender.toHexString();
  pluginEntity.dao = event.params.dao.toHexString();
  // TODO: SARKAWT
  // pluginEntity.pluginSetup = event.params.pluginSetup.toHexString();
  pluginEntity.data = event.params.data;
  pluginEntity.state = 'InstallationPrepared';

  handleHelperIds(event.params.preparedDependency.helpers, pluginId);
  pluginEntity.save();
}

export function handleInstallationApplied(event: InstallationApplied): void {
  let pluginId = event.params.plugin.toHexString();

  let pluginEntity = Plugin.load(pluginId);
  if (pluginEntity) {
    pluginEntity.state = 'Installed';
    pluginEntity.save();

    // TODO: to be removed once the we seperate plugin from core
    addPlugin(event.params.dao.toHexString(), event.params.plugin);
  } else {
    log.warning(
      'InstallationApplied event happened without being prepared, for DAO: {}, plugin: {}',
      [event.params.dao.toHexString(), pluginId]
    );
  }
}

export function handleUpdatePrepared(event: UpdatePrepared): void {
  // TODO: SARKAWT
  let pluginId = event.params.setupPayload.plugin.toHexString();

  let pluginEntity = Plugin.load(pluginId);
  if (pluginEntity) {
    pluginEntity.sender = event.params.sender.toHexString();
    pluginEntity.dao = event.params.dao.toHexString();
    // TODO: SARKAWT
    // pluginEntity.pluginSetup = event.params.pluginSetup.toHexString();
    pluginEntity.data = event.params.setupPayload.data;
    pluginEntity.state = 'UpdatePrepared';
    pluginEntity.save();

    handleHelperIds(event.params.preparedDependency.helpers, pluginId);
  } else {
    log.warning(
      'UpdatePrepared event happened without being installed, for DAO: {}, plugin: {}',
      [event.params.dao.toHexString(), pluginId]
    );
  }
}

export function handleUpdateApplied(event: UpdateApplied): void {
  let pluginId = event.params.plugin.toHexString();

  let pluginEntity = Plugin.load(pluginId);
  if (pluginEntity) {
    pluginEntity.state = 'Installed';
    pluginEntity.save();
  } else {
    log.warning(
      'UpdateApplied event happened without being prepared, for DAO: {}, plugin: {}',
      [event.params.dao.toHexString(), pluginId]
    );
  }
}

export function handleUninstallationPrepared(
  event: UninstallationPrepared
): void {
  let pluginId = event.params.setupPayload.plugin.toHexString();

  let pluginEntity = Plugin.load(pluginId);
  if (pluginEntity) {
    pluginEntity.sender = event.params.sender.toHexString();
    pluginEntity.dao = event.params.dao.toHexString();
    // TODO: SARKAWT
    // pluginEntity.pluginSetup = event.params.pluginSetup.toHexString();
    pluginEntity.data = event.params.setupPayload.data;
    pluginEntity.state = 'UninstallPrepared';
    pluginEntity.save();

    handleHelperIds(event.params.setupPayload.currentHelpers, pluginId);
  } else {
    log.warning(
      'UninstallationPrepared event happened without being installed, for DAO: {}, plugin: {}',
      [event.params.dao.toHexString(), pluginId]
    );
  }
}

export function handleUninstallationApplied(
  event: UninstallationApplied
): void {
  let pluginId = event.params.plugin.toHexString();

  let pluginEntity = Plugin.load(pluginId);
  if (pluginEntity) {
    pluginEntity.state = 'Uninstalled';
    pluginEntity.save();
  } else {
    log.warning(
      'UninstallationApplied event happened without being prepared, for DAO: {}, plugin: {}',
      [event.params.dao.toHexString(), pluginId]
    );
  }
}

export function handleHelperIds(helperIds: Address[], plugin: string): void {
  for (let i = 0; i < helperIds.length; ++i) {
    let helperId = helperIds[i].toHexString();
    let helper = PluginHelper.load(helperId);
    if (!helper) {
      helper = new PluginHelper(helperId);
      helper.plugin = plugin;
      helper.save();
    }
  }
}
