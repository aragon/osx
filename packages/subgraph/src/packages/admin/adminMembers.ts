import {dataSource, store} from '@graphprotocol/graph-ts';
import {
  Administrator,
  AdministratorAdminPlugin
} from '../../../generated/schema';
import {Granted, Revoked} from '../../../generated/templates/Admin/DAO';

export function handleGranted(event: Granted): void {
  if (
    isCorrectEvent(
      event.params.permissionId.toHexString(),
      event.params.where.toHexString()
    )
  ) {
    let pluginAddress = event.params.where.toHexString();
    let administratorAddress = event.params.who.toHexString();
    let administrator = Administrator.load(administratorAddress);
    if (!administrator) {
      administrator = new Administrator(administratorAddress);
      administrator.address = administratorAddress;
      administrator.save();
    }

    let administratorMappingId = `${pluginAddress}_${administratorAddress}`;
    let administratorPluginMapping = AdministratorAdminPlugin.load(
      administratorMappingId
    );
    if (!administratorPluginMapping) {
      administratorPluginMapping = new AdministratorAdminPlugin(
        administratorMappingId
      );
      administratorPluginMapping.administrator = administratorAddress;
      administratorPluginMapping.plugin = pluginAddress;
      administratorPluginMapping.save();
    }
  }
}

export function handleRevoked(event: Revoked): void {
  if (
    isCorrectEvent(
      event.params.permissionId.toHexString(),
      event.params.where.toHexString()
    )
  ) {
    let mappingId = `${event.params.where.toHexString()}_${event.params.who.toHexString()}`;
    if (AdministratorAdminPlugin.load(mappingId)) {
      store.remove('AdministratorAdminPlugin', mappingId);
    }
  }
}

function isCorrectEvent(permissionId: string, where: string): boolean {
  let context = dataSource.context();
  let requiredPermissionId = context.getString('permissionId');
  if (permissionId == requiredPermissionId) {
    let pluginAddress = context.getString('pluginAddress');
    if (where == pluginAddress) {
      return true;
    }
  }
  return false;
}
