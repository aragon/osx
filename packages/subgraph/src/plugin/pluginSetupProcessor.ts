import {Address, Bytes} from '@graphprotocol/graph-ts';
import {
  InstallationApplied,
  InstallationPrepared,
  UninstallationApplied,
  UninstallationPrepared,
  UpdateApplied,
  UpdatePrepared
} from '../../generated/PluginSetupProcessor/PluginSetupProcessor';
import {Plugin, PluginHelper} from '../../generated/schema';

export function handleInstallationPrepared(event: InstallationPrepared): void {
  let pluginId = event.params.plugin.toHexString();

  let pluginEntity = new Plugin(pluginId);
  pluginEntity.sender = event.params.sender.toHexString();
  pluginEntity.dao = event.params.dao.toHexString();
  pluginEntity.pluginSetup = event.params.pluginSetup.toHexString();
  pluginEntity.data = event.params.data;
  pluginEntity.state = 'InstallationPending';

  handleHelperIds(event.params.helpers, pluginId);
  pluginEntity.save();
}

export function handleInstallationApplied(event: InstallationApplied): void {
  let pluginId = event.params.plugin.toHexString();
  let pluginEntity = Plugin.load(pluginId);
  if (!pluginEntity) {
    pluginEntity = createEmptyPlugin(pluginId);
    pluginEntity.dao = event.params.dao.toHexString();
  }
  pluginEntity.state = 'Installed';
  pluginEntity.save();
}

export function handleUpdatePrepared(event: UpdatePrepared): void {
  let pluginId = event.params.plugin.toHexString();

  let pluginEntity = Plugin.load(pluginId);
  if (!pluginEntity) {
    pluginEntity = createEmptyPlugin(pluginId);
  }
  pluginEntity.sender = event.params.sender.toHexString();
  pluginEntity.dao = event.params.dao.toHexString();
  pluginEntity.pluginSetup = event.params.pluginSetup.toHexString();
  pluginEntity.data = event.params.data;
  pluginEntity.state = 'UpdatePending';
  pluginEntity.save();

  handleHelperIds(event.params.updatedHelpers, pluginId);
}

export function handleUpdateApplied(event: UpdateApplied): void {
  let pluginId = event.params.plugin.toHexString();

  let pluginEntity = Plugin.load(pluginId);
  if (!pluginEntity) {
    pluginEntity = createEmptyPlugin(pluginId);
    pluginEntity.dao = event.params.dao.toHexString();
  }

  pluginEntity.state = 'Installed';
  pluginEntity.save();
}

export function handleUninstallationPrepared(
  event: UninstallationPrepared
): void {
  let pluginId = event.params.plugin.toHexString();

  let pluginEntity = Plugin.load(pluginId);
  if (!pluginEntity) {
    pluginEntity = createEmptyPlugin(pluginId);
  }

  pluginEntity.sender = event.params.sender.toHexString();
  pluginEntity.dao = event.params.dao.toHexString();
  pluginEntity.pluginSetup = event.params.pluginSetup.toHexString();
  pluginEntity.data = event.params.data;
  pluginEntity.state = 'UninstallPending';
  pluginEntity.save();

  handleHelperIds(event.params.currentHelpers, pluginId);
}

export function handleUninstallationApplied(
  event: UninstallationApplied
): void {
  let pluginId = event.params.plugin.toHexString();

  let pluginEntity = Plugin.load(pluginId);
  if (!pluginEntity) {
    pluginEntity = createEmptyPlugin(pluginId);
    pluginEntity.dao = event.params.dao.toHexString();
  }

  pluginEntity.state = 'Uninstalled';
  pluginEntity.save();
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

function createEmptyPlugin(pluginId: string): Plugin {
  let pluginEntity = new Plugin(pluginId) as Plugin;
  pluginEntity.sender = '0x0000000000000000000000000000000000000000';
  pluginEntity.dao = '0x0000000000000000000000000000000000000000';
  pluginEntity.pluginSetup = '0x0000000000000000000000000000000000000000';
  pluginEntity.data = Bytes.fromHexString('0x00');
  return pluginEntity;
}
