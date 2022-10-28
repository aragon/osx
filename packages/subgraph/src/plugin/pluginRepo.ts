import {VersionCreated} from '../../generated/templates/PluginRepoTemplate/PluginRepo';
import {PluginVersion} from '../../generated/schema';
import {BigInt} from '@graphprotocol/graph-ts';

export function handleVersionCreated(event: VersionCreated): void {
  let id = `${event.address.toHexString()}_${event.params.versionId.toString()}`;
  let entity = new PluginVersion(id);
  entity.pluginRepo = event.address.toHexString();
  entity.semanticVersion = event.params.semanticVersion.map<BigInt>(version =>
    BigInt.fromI32(version)
  );
  entity.pluginSetup = event.params.pluginSetup.toHexString();
  entity.contentURI = event.params.contentURI;

  entity.save();
}
