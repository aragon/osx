import {Address, BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts';
import {newMockEvent} from 'matchstick-as';
import {VersionCreated} from '../../generated/templates/PluginRepoTemplate/PluginRepo';

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
      semanticVersion.map<BigInt>(version =>
        BigInt.fromString(version)
      )
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
