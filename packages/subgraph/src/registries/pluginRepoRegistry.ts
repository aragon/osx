import {PluginRepoRegistered} from '../../generated/PluginRepoRegistry/PluginRepoRegistry';
import {PluginRepo} from '../../generated/schema';
import {PluginRepoTemplate} from '../../generated/templates';

export function handlePluginRepoRegistered(event: PluginRepoRegistered): void {
  let id = event.params.pluginRepo.toHexString();
  let entity = new PluginRepo(id);

  entity.subdomain = event.params.subdomain;

  // subscribe to templates
  PluginRepoTemplate.create(event.params.pluginRepo);

  entity.save();
}
