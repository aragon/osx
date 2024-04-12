import {handlePluginRepoRegistered} from '../../src/registries/pluginRepoRegistry';
import {ADDRESS_ONE} from '../constants';
import {createPluginRepoRegisteredEvent} from './utils';
import {generatePluginRepoEntityId} from '@aragon/osx-commons-subgraph';
import {Address} from '@graphprotocol/graph-ts';
import {assert, clearStore, test} from 'matchstick-as/assembly/index';

test('Run plugin repo registry mappings with mock event', () => {
  const pluginRepoAddress = Address.fromString(ADDRESS_ONE);
  const pluginRepoEntityId = generatePluginRepoEntityId(pluginRepoAddress);
  let newRepoRegisteredEvent = createPluginRepoRegisteredEvent(
    'plugin-repo',
    pluginRepoEntityId
  );

  handlePluginRepoRegistered(newRepoRegisteredEvent);

  assert.fieldEquals(
    'PluginRepo',
    pluginRepoEntityId,
    'subdomain',
    'plugin-repo'
  );

  clearStore();
});
