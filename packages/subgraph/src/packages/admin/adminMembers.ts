import {
  Administrator,
  AdministratorAdminPlugin,
} from '../../../generated/schema';
import {Granted, Revoked} from '../../../generated/templates/Admin/DAO';
import {generateAdministratorAdminPluginEntityId} from '../../utils/ids';
import {
  generateEntityIdFromAddress,
  generatePluginEntityId,
} from '@aragon/osx-commons-subgraph';
import {dataSource, store} from '@graphprotocol/graph-ts';

export function handleGranted(event: Granted): void {
  if (
    isCorrectEvent(
      event.params.permissionId.toHexString(),
      event.params.where.toHexString()
    )
  ) {
    let pluginAddress = event.params.where;
    let administratorAddress = event.params.who;
    let pluginEntityId = generatePluginEntityId(pluginAddress);
    let administratorEntityId =
      generateEntityIdFromAddress(administratorAddress);
    let administrator = Administrator.load(administratorEntityId);
    if (!administrator) {
      administrator = new Administrator(administratorEntityId);
      administrator.address = administratorEntityId;
      administrator.save();
    }

    let administratorMappingId = generateAdministratorAdminPluginEntityId(
      pluginAddress,
      administratorAddress
    );
    let administratorPluginMapping = AdministratorAdminPlugin.load(
      administratorMappingId
    );
    if (!administratorPluginMapping) {
      administratorPluginMapping = new AdministratorAdminPlugin(
        administratorMappingId
      );
      administratorPluginMapping.administrator = administratorEntityId;
      administratorPluginMapping.plugin = pluginEntityId;
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
    // where is the plugin address
    // who is the administrator address
    let mappingId = generateAdministratorAdminPluginEntityId(
      event.params.where,
      event.params.who
    );
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
