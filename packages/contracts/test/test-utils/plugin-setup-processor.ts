import {PluginSetupProcessor} from '../../typechain';
import {decodeEvent} from './event';

export async function prepareInstallation(
  pluginSetupProcessorContract: PluginSetupProcessor,
  daoAddress: string,
  pluginSetup: string,
  pluginRepo: string,
  data: string
) {
  const tx = await pluginSetupProcessorContract.prepareInstallation(
    daoAddress,
    pluginSetup,
    pluginRepo,
    data
  );
  const event = await decodeEvent(tx, 'InstallationPrepared');
  const {plugin, helpers, permissions} = event.args;
  return {
    plugin: plugin,
    helpers: helpers,
    prepareInstallpermissions: permissions,
  };
}
