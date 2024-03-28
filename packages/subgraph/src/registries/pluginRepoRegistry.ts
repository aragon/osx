import {PluginRepoRegistered} from '../../generated/PluginRepoRegistry/PluginRepoRegistry';
import {PluginRepo} from '../../generated/schema';
import {PluginRepoTemplate} from '../../generated/templates';
import {generatePluginRepoEntityId} from '@aragon/osx-commons-subgraph';

export function handlePluginRepoRegistered(event: PluginRepoRegistered): void {
  let pluginRepoAddress = event.params.pluginRepo;
  let pluginRepoEntityId = generatePluginRepoEntityId(pluginRepoAddress);
  let entity = new PluginRepo(pluginRepoEntityId);

  entity.subdomain = event.params.subdomain;

  // subscribe to templates
  PluginRepoTemplate.create(pluginRepoAddress);

  entity.save();
}
