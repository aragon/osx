import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {newMockEvent} from 'matchstick-as';
import {
  ReleaseMetadataUpdated,
  VersionCreated
} from '../../generated/templates/PluginRepoTemplate/PluginRepo';
import {
  InstallationApplied,
  InstallationPrepared,
  InstallationPreparedPreparedSetupDataStruct,
  UninstallationApplied,
  UninstallationPrepared,
  UpdateApplied,
  UpdatePrepared,
  UpdatePreparedPreparedSetupDataStruct,
  UpdatePreparedSetupPayloadStruct
} from '../../generated/PluginSetupProcessor/PluginSetupProcessor';

export function createReleaseMetadataUpdatedEvent(
  release: string,
  buildMetadata: Bytes
): ReleaseMetadataUpdated {
  let newEvent = changetype<ReleaseMetadataUpdated>(newMockEvent());

  newEvent.parameters = [];

  let releaseParam = new ethereum.EventParam(
    'release',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(release))
  );
  let buildMetadataParam = new ethereum.EventParam(
    'buildMetadata',
    ethereum.Value.fromBytes(buildMetadata)
  );

  newEvent.parameters.push(releaseParam);
  newEvent.parameters.push(buildMetadataParam);

  return newEvent;
}

export function createVersionCreated(
  release: string,
  build: string,
  pluginSetup: string,
  buildMetadata: Bytes
): VersionCreated {
  let newEvent = changetype<VersionCreated>(newMockEvent());

  newEvent.parameters = [];

  let releaseParam = new ethereum.EventParam(
    'release',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(release))
  );

  let buildParam = new ethereum.EventParam(
    'build',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(build))
  );
  let pluginSetupParam = new ethereum.EventParam(
    'pluginSetup',
    ethereum.Value.fromAddress(Address.fromString(pluginSetup))
  );

  let buildMetadataParam = new ethereum.EventParam(
    'buildMetadata',
    ethereum.Value.fromBytes(buildMetadata)
  );

  newEvent.parameters.push(releaseParam);
  newEvent.parameters.push(buildParam);
  newEvent.parameters.push(pluginSetupParam);
  newEvent.parameters.push(buildMetadataParam);

  return newEvent;
}

export function createInstallationPreparedEvent(
  sender: string,
  dao: string,
  plugin: string,
  preparedSetupId: Bytes,
  pluginSetupRepo: string,
  versionTag: ethereum.Tuple,
  data: Bytes,
  helpers: string[],
  requestedPermissions: ethereum.Value[][]
): InstallationPrepared {
  let newEvent = changetype<InstallationPrepared>(newMockEvent());
  newEvent.parameters = [];

  let permissions: ethereum.Tuple[] = [];
  for (let i = 0; i < requestedPermissions.length; i++) {
    let permissionTuple = new ethereum.Tuple();
    for (let a = 0; a < requestedPermissions[i].length; a++) {
      permissionTuple.push(requestedPermissions[i][a]);
    }
    permissions.push(permissionTuple);
  }

  let helpersArray: Address[] = [];
  for (let i = 0; i < helpers.length; i++) {
    helpersArray.push(Address.fromString(helpers[i]));
  }

  let preparedSetupData = new InstallationPreparedPreparedSetupDataStruct();
  preparedSetupData.push(ethereum.Value.fromAddressArray(helpersArray));
  preparedSetupData.push(ethereum.Value.fromTupleArray(permissions));

  let senderParam = new ethereum.EventParam(
    'sender',
    ethereum.Value.fromAddress(Address.fromString(sender))
  );
  let daoParam = new ethereum.EventParam(
    'dao',
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  let preparedSetupIdParam = new ethereum.EventParam(
    'preparedSetupId',
    ethereum.Value.fromBytes(preparedSetupId)
  );
  let pluginSetupRepoParam = new ethereum.EventParam(
    'pluginSetupRepo',
    ethereum.Value.fromAddress(Address.fromString(pluginSetupRepo))
  );
  let versionTagParam = new ethereum.EventParam(
    'versionTag',
    ethereum.Value.fromTuple(versionTag)
  );
  let dataParam = new ethereum.EventParam(
    'data',
    ethereum.Value.fromBytes(data)
  );
  let pluginParam = new ethereum.EventParam(
    'plugin',
    ethereum.Value.fromAddress(Address.fromString(plugin))
  );
  let preparedSetupDataParam = new ethereum.EventParam(
    'preparedSetupData',
    ethereum.Value.fromTuple(preparedSetupData)
  );

  newEvent.parameters.push(senderParam);
  newEvent.parameters.push(daoParam);
  newEvent.parameters.push(preparedSetupIdParam);
  newEvent.parameters.push(pluginSetupRepoParam);
  newEvent.parameters.push(versionTagParam);
  newEvent.parameters.push(dataParam);
  newEvent.parameters.push(pluginParam);
  newEvent.parameters.push(preparedSetupDataParam);
  return newEvent;
}

export function createInstallationAppliedEvent(
  dao: string,
  plugin: string,
  preparedSetupId: Bytes,
  appliedSetupId: Bytes
): InstallationApplied {
  let newEvent = changetype<InstallationApplied>(newMockEvent);
  newEvent.parameters = [];

  let daoParam = new ethereum.EventParam(
    'dao',
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  let pluginParam = new ethereum.EventParam(
    'plugin',
    ethereum.Value.fromAddress(Address.fromString(plugin))
  );
  let preparedSetupIdParam = new ethereum.EventParam(
    'preparedSetupId',
    ethereum.Value.fromBytes(preparedSetupId)
  );
  let appliedSetupIdParam = new ethereum.EventParam(
    'appliedSetupId',
    ethereum.Value.fromBytes(appliedSetupId)
  );

  newEvent.parameters.push(daoParam);
  newEvent.parameters.push(pluginParam);
  newEvent.parameters.push(preparedSetupIdParam);
  newEvent.parameters.push(appliedSetupIdParam);
  return newEvent;
}

export function createUpdatePreparedEvent(
  sender: string,
  dao: string,
  plugin: string,
  preparedSetupId: Bytes,
  pluginSetupRepo: string,
  versionTag: ethereum.Tuple,
  currentHelpers: string[],
  helpers: string[],
  requestedPermissions: ethereum.Value[][],
  data: Bytes,
  initData: Bytes
): UpdatePrepared {
  let newEvent = changetype<UpdatePrepared>(newMockEvent());
  newEvent.parameters = [];

  let permissions: ethereum.Tuple[] = [];
  for (let i = 0; i < requestedPermissions.length; i++) {
    let permissionTuple = new ethereum.Tuple();
    for (let a = 0; a < requestedPermissions[i].length; a++) {
      permissionTuple.push(requestedPermissions[i][a]);
    }
    permissions.push(permissionTuple);
  }

  let helpersArray: Address[] = [];
  for (let i = 0; i < helpers.length; i++) {
    helpersArray.push(Address.fromString(helpers[i]));
  }

  let preparedSetupData = new UpdatePreparedPreparedSetupDataStruct();
  preparedSetupData.push(ethereum.Value.fromAddressArray(helpersArray));
  preparedSetupData.push(ethereum.Value.fromTupleArray(permissions));

  let currentHelpersArray: Address[] = [];
  for (let i = 0; i < currentHelpers.length; i++) {
    currentHelpersArray.push(Address.fromString(currentHelpers[i]));
  }
  let setupPayload = new UpdatePreparedSetupPayloadStruct();
  setupPayload.push(ethereum.Value.fromAddress(Address.fromString(plugin)));
  setupPayload.push(ethereum.Value.fromAddressArray(currentHelpersArray));
  setupPayload.push(ethereum.Value.fromBytes(data));

  let senderParam = new ethereum.EventParam(
    'sender',
    ethereum.Value.fromAddress(Address.fromString(sender))
  );
  let daoParam = new ethereum.EventParam(
    'dao',
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  let preparedSetupIdParam = new ethereum.EventParam(
    'preparedSetupId',
    ethereum.Value.fromBytes(preparedSetupId)
  );
  let pluginSetupRepoParam = new ethereum.EventParam(
    'pluginSetupRepo',
    ethereum.Value.fromAddress(Address.fromString(pluginSetupRepo))
  );
  let versionTagParam = new ethereum.EventParam(
    'versionTag',
    ethereum.Value.fromTuple(versionTag)
  );
  let initDataParam = new ethereum.EventParam(
    'initData',
    ethereum.Value.fromBytes(initData)
  );
  let setupPayloadParam = new ethereum.EventParam(
    'setupPayload',
    ethereum.Value.fromTuple(setupPayload)
  );
  let preparedSetupDataParam = new ethereum.EventParam(
    'preparedSetupData',
    ethereum.Value.fromTuple(preparedSetupData)
  );

  newEvent.parameters.push(senderParam);
  newEvent.parameters.push(daoParam);
  newEvent.parameters.push(preparedSetupIdParam);
  newEvent.parameters.push(pluginSetupRepoParam);
  newEvent.parameters.push(versionTagParam);
  newEvent.parameters.push(setupPayloadParam);
  newEvent.parameters.push(preparedSetupDataParam);
  newEvent.parameters.push(initDataParam);
  return newEvent;
}

export function createUpdateAppliedEvent(
  dao: string,
  plugin: string,
  preparedSetupId: Bytes,
  appliedSetupId: Bytes
): UpdateApplied {
  let newEvent = changetype<UpdateApplied>(newMockEvent);
  newEvent.parameters = [];

  let daoParam = new ethereum.EventParam(
    'dao',
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  let pluginParam = new ethereum.EventParam(
    'plugin',
    ethereum.Value.fromAddress(Address.fromString(plugin))
  );
  let preparedSetupIdParam = new ethereum.EventParam(
    'preparedSetupId',
    ethereum.Value.fromBytes(preparedSetupId)
  );
  let appliedSetupIdParam = new ethereum.EventParam(
    'appliedSetupId',
    ethereum.Value.fromBytes(appliedSetupId)
  );

  newEvent.parameters.push(daoParam);
  newEvent.parameters.push(pluginParam);
  newEvent.parameters.push(preparedSetupIdParam);
  newEvent.parameters.push(appliedSetupIdParam);
  return newEvent;
}

export function createUninstallationPreparedEvent(
  sender: string,
  dao: string,
  preparedSetupId: Bytes,
  pluginSetupRepo: string,
  versionTag: ethereum.Tuple,
  plugin: string,
  currentHelpers: string[],
  data: Bytes,
  requestedPermissions: ethereum.Value[][]
): UninstallationPrepared {
  let newEvent = changetype<UninstallationPrepared>(newMockEvent());
  newEvent.parameters = [];

  let permissions: ethereum.Tuple[] = [];
  for (let i = 0; i < requestedPermissions.length; i++) {
    let permissionTuple = new ethereum.Tuple();
    for (let a = 0; a < requestedPermissions[i].length; a++) {
      permissionTuple.push(requestedPermissions[i][a]);
    }
    permissions.push(permissionTuple);
  }

  let currentHelpersArray: Address[] = [];
  for (let i = 0; i < currentHelpers.length; i++) {
    currentHelpersArray.push(Address.fromString(currentHelpers[i]));
  }
  let setupPayload = new UpdatePreparedSetupPayloadStruct();
  setupPayload.push(ethereum.Value.fromAddress(Address.fromString(plugin)));
  setupPayload.push(ethereum.Value.fromAddressArray(currentHelpersArray));
  setupPayload.push(ethereum.Value.fromBytes(data));

  let senderParam = new ethereum.EventParam(
    'sender',
    ethereum.Value.fromAddress(Address.fromString(sender))
  );
  let daoParam = new ethereum.EventParam(
    'dao',
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  let preparedSetupIdParam = new ethereum.EventParam(
    'preparedSetupId',
    ethereum.Value.fromBytes(preparedSetupId)
  );
  let pluginSetupRepoParam = new ethereum.EventParam(
    'pluginSetupRepo',
    ethereum.Value.fromAddress(Address.fromString(pluginSetupRepo))
  );
  let versionTagParam = new ethereum.EventParam(
    'versionTag',
    ethereum.Value.fromTuple(versionTag)
  );
  let setupPayloadParam = new ethereum.EventParam(
    'setupPayload',
    ethereum.Value.fromTuple(setupPayload)
  );
  let permissionsParam = new ethereum.EventParam(
    'permissions',
    ethereum.Value.fromTupleArray(permissions)
  );

  newEvent.parameters.push(senderParam);
  newEvent.parameters.push(daoParam);
  newEvent.parameters.push(preparedSetupIdParam);
  newEvent.parameters.push(pluginSetupRepoParam);
  newEvent.parameters.push(versionTagParam);
  newEvent.parameters.push(setupPayloadParam);
  newEvent.parameters.push(permissionsParam);

  return newEvent;
}

export function createUninstallationAppliedEvent(
  dao: string,
  plugin: string,
  preparedSetupId: string
): UninstallationApplied {
  let newEvent = changetype<UninstallationApplied>(newMockEvent);
  newEvent.parameters = [];

  let daoParam = new ethereum.EventParam(
    'dao',
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  let pluginParam = new ethereum.EventParam(
    'plugin',
    ethereum.Value.fromAddress(Address.fromString(plugin))
  );
  let preparedSetupIdParam = new ethereum.EventParam(
    'preparedSetupId',
    ethereum.Value.fromBytes(Bytes.fromHexString(preparedSetupId))
  );

  newEvent.parameters.push(daoParam);
  newEvent.parameters.push(pluginParam);
  newEvent.parameters.push(preparedSetupIdParam);
  return newEvent;
}
