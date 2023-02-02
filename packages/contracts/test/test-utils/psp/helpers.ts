import {BytesLike} from 'ethers';
import {DAO, PluginSetupProcessor} from '../../../typechain';
import {PermissionOperation, PluginRepoPointer, VersionTag} from './types';
import {
  applyInstallation,
  applyUninstallation,
  applyUpdate,
  prepareInstallation,
  prepareUninstallation,
  prepareUpdate,
} from './wrappers';
import {UPGRADE_PERMISSIONS} from "../permissions";

const {UPGRADE_PLUGIN_PERMISSION_ID} = UPGRADE_PERMISSIONS;

// TODO: put in common or something.
const EMPTY_DATA = '0x'

export async function installPlugin(
  psp: PluginSetupProcessor,
  targetDao: string,
  pluginRepoPointer: PluginRepoPointer,
  data: BytesLike = EMPTY_DATA
): Promise<{
  plugin: string;
  helpers: string[];
  permissions: PermissionOperation[];
  preparedSetupId: string;
  appliedSetupId: string;
}> {
  let plugin: string;
  let helpers: string[];
  let permissions: PermissionOperation[];
  let preparedSetupId: string;
  ({
    plugin: plugin,
    preparedSetupData: {helpers, permissions},
    preparedSetupId: preparedSetupId,
  } = await prepareInstallation(psp, targetDao, pluginRepoPointer, data));

  const {appliedSetupId: appliedSetupId} = await applyInstallation(
    psp,
    targetDao,
    plugin,
    pluginRepoPointer,
    permissions,
    helpers
  );

  return {plugin, helpers, permissions, appliedSetupId, preparedSetupId};
}

export async function uninstallPlugin(
  psp: PluginSetupProcessor,
  targetDao: string,
  plugin: string,
  helpers: string[],
  pluginRepoPointer: PluginRepoPointer,
  data: BytesLike = EMPTY_DATA
) {
  const {permissions} = await prepareUninstallation(
    psp,
    targetDao,
    plugin,
    pluginRepoPointer,
    helpers,
    data
  );

  await applyUninstallation(
    psp,
    targetDao,
    plugin,
    pluginRepoPointer,
    permissions
  );
}

// TODO: Giorgi Continue Later
// async function updatePlugin(
//     psp: PluginSetupProcessor,
//     targetDao: DAO,
//     proxy: string,
//     currentVersion: VersionTag,
//     newVersion: VersionTag,
//     pluginSetupRepo: string,
//     helpers: string[],
//     data: BytesLike
//   ): Promise<{
//     updatedHelpers: string[];
//     permissions: PermissionOperation[];
//     initData: BytesLike;
//   }> {
    
//     const {preparedSetupData: {permissions, helpers}, initData } = await prepareUpdate(
//         psp,
//         targetDao.address,
//         proxy,
//         currentVersion,
//         newVersion,
//         pluginSetupRepo,
//         helpers,
//         data
//     )
  
//     // Grant the `UPGRADE_PLUGIN_PERMISSION_ID` permission to the plugin setup processor
//     await targetDao.grant(proxy, psp.address, UPGRADE_PLUGIN_PERMISSION_ID);
  
//     await applyUpdate(
//     psp,
//       targetDao.address,
//       proxy,
//       [pluginSetupRepo, ...newVersion],
//       initData,
//       permissions,
//       helpers
//     );
  
//     // Revoke the `UPGRADE_PLUGIN_PERMISSION_ID` permission to the plugin setup processor
//     await targetDao.revoke(proxy, psp.address, UPGRADE_PLUGIN_PERMISSION_ID);
  

//     // If the base contracts don't change from current and new plugin setups,
//     // PluginSetupProcessor shouldn't call `upgradeTo` or `upgradeToAndCall`
//     // on the plugin. The below check for this still is not 100% ensuring,
//     // As function `upgradeTo` might be called but event `Upgraded`
//     // not thrown(OZ changed the logic or name) which will trick the test to pass..
//     const currentImpl = await currentVersionSetup.getImplementationAddress();
//     const newImpl = await newVersionSetup.getImplementationAddress();
  
//     const upgradedEvent = await findEvent(applyUpdateTx, EVENTS.Upgraded);
//     if (currentImpl == newImpl) {
//       expect(upgradedEvent).to.equal(undefined);
//     } else {
//       expect(upgradedEvent).to.not.equal(undefined);
//       expect(newImpl).to.equal(upgradedEvent.args.implementation);
  
//       // ensure that the logic address was also correctly modified on the proxy.
//       const proxyContract = await ethers.getContractAt(
//         'PluginUUPSUpgradeable',
//         proxy
//       );
//       expect(await proxyContract.getImplementationAddress()).to.equal(newImpl);
//     }
  
//     return {updatedHelpers, permissions, initData};
//   }