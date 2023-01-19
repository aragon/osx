import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {ADDRESS_ONE, ADDRESS_TWO} from '../constants';
import {createVersionCreated} from './utils';
import {handleVersionCreated} from '../../src/plugin/pluginRepo';
import {Address} from '@graphprotocol/graph-ts';

test('versionCreated event', () => {
  let event = createVersionCreated('0', ['1', '0', '0'], ADDRESS_ONE, '0x42');

  handleVersionCreated(event);

  let entityId = `${event.address.toHexString()}_0`;
  assert.fieldEquals(
    'PluginVersion',
    entityId,
    'pluginRepo',
    event.address.toHexString()
  );
  assert.fieldEquals('PluginVersion', entityId, 'semanticVersion', '[1, 0, 0]');
  assert.fieldEquals(
    'PluginVersion',
    entityId,
    'pluginSetup',
    Address.fromString(ADDRESS_ONE).toHexString()
  );
  assert.fieldEquals('PluginVersion', entityId, 'contentURI', '0x42');

  event = createVersionCreated('1', ['1', '1', '0'], ADDRESS_TWO, '0x43');

  entityId = `${event.address.toHexString()}_1`;
  handleVersionCreated(event);

  assert.fieldEquals(
    'PluginVersion',
    entityId,
    'pluginRepo',
    event.address.toHexString()
  );
  assert.fieldEquals('PluginVersion', entityId, 'semanticVersion', '[1, 1, 0]');
  assert.fieldEquals(
    'PluginVersion',
    entityId,
    'pluginSetup',
    Address.fromString(ADDRESS_TWO).toHexString()
  );
  assert.fieldEquals('PluginVersion', entityId, 'contentURI', '0x43');

  clearStore();
});
