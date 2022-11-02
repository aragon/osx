import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {newMockEvent} from 'matchstick-as';
import {VersionCreated} from '../../generated/templates/PluginRepoTemplate/PluginRepo';
import {
  InstallationApplied,
  InstallationPrepared,
  UninstallationApplied,
  UninstallationPrepared,
  UpdateApplied,
  UpdatePrepared
} from '../../generated/PluginSetupProcessor/PluginSetupProcessor';

export function createVersionCreated(
  versionId: string,
  semanticVersion: string[],
  pluginSetup: string,
  contentURI: string
): VersionCreated {
  let newEvent = changetype<VersionCreated>(newMockEvent());

  newEvent.parameters = [];

  let versionIdParam = new ethereum.EventParam(
    'versionId',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(versionId))
  );

  let semanticVersionParam = new ethereum.EventParam(
    'semanticVersion',
    ethereum.Value.fromUnsignedBigIntArray(
      semanticVersion.map<BigInt>(version => BigInt.fromString(version))
    )
  );

  let pluginSetupParam = new ethereum.EventParam(
    'pluginSetup',
    ethereum.Value.fromAddress(Address.fromString(pluginSetup))
  );

  let contentURIParam = new ethereum.EventParam(
    'contentURI',
    ethereum.Value.fromBytes(Bytes.fromHexString(contentURI))
  );

  newEvent.parameters.push(versionIdParam);
  newEvent.parameters.push(semanticVersionParam);
  newEvent.parameters.push(pluginSetupParam);
  newEvent.parameters.push(contentURIParam);

  return newEvent;
}

export function createInstallationPreparedEvent(
  sender: string,
  dao: string,
  pluginSetup: string,
  data: Bytes,
  plugin: string,
  helpers: string[]
): InstallationPrepared {
  let newEvent = changetype<InstallationPrepared>(newMockEvent());
  newEvent.parameters = [];

  let senderParam = new ethereum.EventParam(
    'sender',
    ethereum.Value.fromAddress(Address.fromString(sender))
  );
  let daoParam = new ethereum.EventParam(
    'dao',
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  let pluginSetupParam = new ethereum.EventParam(
    'pluginSetup',
    ethereum.Value.fromAddress(Address.fromString(pluginSetup))
  );
  let dataParam = new ethereum.EventParam(
    'data',
    ethereum.Value.fromBytes(data)
  );
  let pluginParam = new ethereum.EventParam(
    'plugin',
    ethereum.Value.fromAddress(Address.fromString(plugin))
  );
  let helpersParam = new ethereum.EventParam(
    'helpers',
    ethereum.Value.fromAddressArray(
      helpers.map<Address>(helper => Address.fromString(helper))
    )
  );
  let permissionsParam = new ethereum.EventParam(
    'permissions',
    ethereum.Value.fromArray([])
  );

  newEvent.parameters.push(senderParam);
  newEvent.parameters.push(daoParam);
  newEvent.parameters.push(pluginSetupParam);
  newEvent.parameters.push(dataParam);
  newEvent.parameters.push(pluginParam);
  newEvent.parameters.push(helpersParam);
  newEvent.parameters.push(permissionsParam);
  return newEvent;
}

export function createInstallationAppliedEvent(
  dao: string,
  plugin: string
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

  newEvent.parameters.push(daoParam);
  newEvent.parameters.push(pluginParam);
  return newEvent;
}

export function createUpdatePreparedEvent(
  sender: string,
  dao: string,
  pluginSetup: string,
  data: Bytes,
  plugin: string,
  updatedHelpers: string[],
  initData: Bytes,
): UpdatePrepared {
  let newEvent = changetype<UpdatePrepared>(newMockEvent());
  newEvent.parameters = [];

  let senderParam = new ethereum.EventParam(
    'sender',
    ethereum.Value.fromAddress(Address.fromString(sender))
  );
  let daoParam = new ethereum.EventParam(
    'dao',
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  let pluginSetupParam = new ethereum.EventParam(
    'pluginSetup',
    ethereum.Value.fromAddress(Address.fromString(pluginSetup))
  );
  let dataParam = new ethereum.EventParam(
    'data',
    ethereum.Value.fromBytes(data)
  );
  let pluginParam = new ethereum.EventParam(
    'plugin',
    ethereum.Value.fromAddress(Address.fromString(plugin))
  );
  let currentHelpers = new ethereum.EventParam(
    'currentHelpers',
    ethereum.Value.fromAddressArray(
      updatedHelpers.map<Address>(helper => Address.fromString(helper))
    )
  );
  let permissionsParam = new ethereum.EventParam(
    'permissions',
    ethereum.Value.fromArray([])
  );
  let initDataParam = new ethereum.EventParam(
    'initData',
    ethereum.Value.fromBytes(initData)
  );

  newEvent.parameters.push(senderParam);
  newEvent.parameters.push(daoParam);
  newEvent.parameters.push(pluginSetupParam);
  newEvent.parameters.push(dataParam);
  newEvent.parameters.push(pluginParam);
  newEvent.parameters.push(currentHelpers);
  newEvent.parameters.push(permissionsParam);
  newEvent.parameters.push(initDataParam);
  return newEvent;
}
export function createUpdateAppliedEvent(
  dao: string,
  plugin: string
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

  newEvent.parameters.push(daoParam);
  newEvent.parameters.push(pluginParam);
  return newEvent;
}

export function createUninstallationPreparedEvent(
  sender: string,
  dao: string,
  pluginSetup: string,
  data: Bytes,
  plugin: string,
  updatedHelpers: string[],
): UninstallationPrepared {
  let newEvent = changetype<UninstallationPrepared>(newMockEvent());
  newEvent.parameters = [];

  let senderParam = new ethereum.EventParam(
    'sender',
    ethereum.Value.fromAddress(Address.fromString(sender))
  );
  let daoParam = new ethereum.EventParam(
    'dao',
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  let pluginSetupParam = new ethereum.EventParam(
    'pluginSetup',
    ethereum.Value.fromAddress(Address.fromString(pluginSetup))
  );
  let dataParam = new ethereum.EventParam(
    'data',
    ethereum.Value.fromBytes(data)
  );
  let pluginParam = new ethereum.EventParam(
    'plugin',
    ethereum.Value.fromAddress(Address.fromString(plugin))
  );
  let updatedHelpersParam = new ethereum.EventParam(
    'updatedHelpers',
    ethereum.Value.fromAddressArray(
      updatedHelpers.map<Address>(helper => Address.fromString(helper))
    )
  );
  let permissionsParam = new ethereum.EventParam(
    'permissions',
    ethereum.Value.fromArray([])
  );

  newEvent.parameters.push(senderParam);
  newEvent.parameters.push(daoParam);
  newEvent.parameters.push(pluginSetupParam);
  newEvent.parameters.push(dataParam);
  newEvent.parameters.push(pluginParam);
  newEvent.parameters.push(updatedHelpersParam);
  newEvent.parameters.push(permissionsParam);
  return newEvent;
}

export function createUninstallationAppliedEvent(
  dao: string,
  plugin: string
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

  newEvent.parameters.push(daoParam);
  newEvent.parameters.push(pluginParam);
  return newEvent;
}
