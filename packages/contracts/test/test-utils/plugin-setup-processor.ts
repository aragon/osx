import {decodeEvent} from './event';

export async function prepareInstallation(
  pluginSetupProcessorContract: any,
  daoAddress: any,
  pluginSetup: any,
  pluginRepo: any,
  data: any
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
