import {handlePluginRepoRegistered} from '../../src/registries/pluginRepoRegistry';
import {ADDRESS_ONE} from '../constants';
import {createPluginRepoRegisteredEvent} from './utils';
import {Address} from '@graphprotocol/graph-ts';
import {assert, clearStore, test} from 'matchstick-as/assembly/index';

test('Run plugin repo registry mappings with mock event', () => {
  let id = Address.fromString(ADDRESS_ONE).toHexString();
  let newRepoRegisteredEvent = createPluginRepoRegisteredEvent(
    'plugin-repo',
    ADDRESS_ONE
  );

  handlePluginRepoRegistered(newRepoRegisteredEvent);

  assert.fieldEquals('PluginRepo', id, 'subdomain', 'plugin-repo');

  clearStore();
});
