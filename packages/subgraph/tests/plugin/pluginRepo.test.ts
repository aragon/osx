import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {ADDRESS_ONE, ADDRESS_TWO} from '../constants';
import {createVersionCreated} from './utils';
import {handleVersionCreated} from '../../src/plugin/pluginRepo';
import {Address, Bytes} from '@graphprotocol/graph-ts';

test('versionCreated event', () => {
  let event = createVersionCreated(
    '1',
    '1',
    ADDRESS_ONE,
    Bytes.fromHexString('0x1234')
  );
  handleVersionCreated(event);
  let id = `${event.address.toHexString()}_1_1`;

  assert.entityCount('PluginVersion', 1);
  assert.fieldEquals('PluginVersion', id, 'id', id);
  assert.fieldEquals(
    'PluginVersion',
    id,
    'pluginRepo',
    event.address.toHexString()
  );
  assert.fieldEquals('PluginVersion', id, 'release', '1');
  assert.fieldEquals('PluginVersion', id, 'build', '1');
  assert.fieldEquals('PluginVersion', id, 'pluginSetup', ADDRESS_ONE);
  assert.fieldEquals('PluginVersion', id, 'metadata', '0x1234');

  assert.entityCount('PluginSetup', 1);
  assert.fieldEquals('PluginSetup', ADDRESS_ONE, 'id', ADDRESS_ONE);

  clearStore();
});
