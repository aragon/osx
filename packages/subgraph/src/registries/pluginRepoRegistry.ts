import {PluginRepoRegistered} from '../../generated/PluginRepoRegistry/PluginRepoRegistry';
import {PluginRepoTemplate} from '../../generated/templates';
import {PluginRepo} from '../../generated/schema';

export function handlePluginRepoRegistered(event: PluginRepoRegistered): void {
  let id = event.params.pluginRepo.toHexString();
  let entity = new PluginRepo(id);

  entity.name = event.params.name;

  // subscribe to templates
  PluginRepoTemplate.create(event.params.pluginRepo);

  entity.save();
}
