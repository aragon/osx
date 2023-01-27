import {PluginRepoRegistered} from '../../generated/PluginRepoRegistry/PluginRepoRegistry';
import {PluginRepoTemplate} from '../../generated/templates';
import {PluginRepo} from '../../generated/schema';

export function handlePluginRepoRegistered(event: PluginRepoRegistered): void {
  let id = event.params.pluginRepo.toHexString();
  let entity = new PluginRepo(id);

  entity.subdomain = event.params.subdomain;

  // subscribe to templates
  PluginRepoTemplate.create(event.params.pluginRepo);

  entity.save();
}
