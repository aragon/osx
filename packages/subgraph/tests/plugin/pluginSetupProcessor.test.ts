import {
  ADDRESS_ONE,
  ADDRESS_TWO,
  ADDRESS_THREE,
  DAO_ADDRESS,
  ADDRESS_FOUR,
  ADDRESS_FIVE,
  ADDRESS_ZERO
} from '../constants';
import {
  createInstallationAppliedEvent,
  createInstallationPreparedEvent,
  createUninstallationAppliedEvent,
  createUninstallationPreparedEvent,
  createUpdateAppliedEvent,
  createUpdatePreparedEvent
} from './utils';
import {
  handleInstallationApplied,
  handleInstallationPrepared,
  handleUninstallationApplied,
  handleUninstallationPrepared,
  handleUpdateApplied,
  handleUpdatePrepared
} from '../../src/plugin/pluginSetupProcessor';
import {assert, clearStore, test} from 'matchstick-as';
import {Plugin} from '../../generated/schema';
import {Address, Bytes} from '@graphprotocol/graph-ts';

test('InstallationPrepared event', function() {
  let pluginId = ADDRESS_THREE;
  let helperIds = [ADDRESS_FOUR, ADDRESS_FIVE];

  let event = createInstallationPreparedEvent(
    ADDRESS_ONE,
    DAO_ADDRESS,
    ADDRESS_TWO,
    Bytes.fromHexString('0x00'),
    pluginId,
    helperIds
  );

  handleInstallationPrepared(event);

  assert.fieldEquals('Plugin', pluginId, 'sender', ADDRESS_ONE);
  assert.fieldEquals(
    'Plugin',
    pluginId,
    'dao',
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals('Plugin', pluginId, 'pluginSetup', ADDRESS_TWO);
  assert.fieldEquals('Plugin', pluginId, 'state', 'InstallationPrepared');

  // Plugin Entity exists. previous tests would have failed if not
  let pluginEntity = Plugin.load(pluginId) as Plugin;
  assert.bytesEquals(pluginEntity.data, Bytes.fromHexString('0x00'));

  // check if helpers exists
  for (let i = 0; i < helperIds.length; i++) {
    assert.fieldEquals('PluginHelper', helperIds[i], 'plugin', pluginId);
  }

  clearStore();
});

test('InstallationApplied event (existent plugin)', function() {
  let pluginId = ADDRESS_THREE;
  let preparedEvent = createInstallationPreparedEvent(
    ADDRESS_ONE,
    DAO_ADDRESS,
    ADDRESS_TWO,
    Bytes.fromHexString('0x00'),
    pluginId,
    [ADDRESS_FOUR, ADDRESS_FIVE]
  );

  handleInstallationPrepared(preparedEvent);
  let appliedEvent = createInstallationAppliedEvent(DAO_ADDRESS, pluginId);

  handleInstallationApplied(appliedEvent);

  assert.fieldEquals('Plugin', pluginId, 'sender', ADDRESS_ONE);
  assert.fieldEquals(
    'Plugin',
    pluginId,
    'dao',
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals('Plugin', pluginId, 'pluginSetup', ADDRESS_TWO);
  assert.fieldEquals('Plugin', pluginId, 'state', 'Installed');

  clearStore();
});

test('InstallationApplied event (non existent plugin)', function() {
  let pluginId = ADDRESS_ONE;
  let event = createInstallationAppliedEvent(DAO_ADDRESS, pluginId);

  handleInstallationApplied(event);

  assert.fieldEquals('Plugin', pluginId, 'sender', ADDRESS_ZERO);
  assert.fieldEquals(
    'Plugin',
    pluginId,
    'dao',
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals('Plugin', pluginId, 'state', 'Installed');

  clearStore();
});

test('UpdatePrepared event (existent plugin)', function() {
  let pluginId = ADDRESS_THREE;
  let helperIds = [ADDRESS_THREE, ADDRESS_FOUR];
  let preparedEvent = createInstallationPreparedEvent(
    ADDRESS_ONE,
    DAO_ADDRESS,
    ADDRESS_TWO,
    Bytes.fromHexString('0x00'),
    pluginId,
    [ADDRESS_FOUR, ADDRESS_FIVE]
  );

  handleInstallationPrepared(preparedEvent);
  let updateEvent = createUpdatePreparedEvent(
    ADDRESS_ZERO,
    DAO_ADDRESS,
    ADDRESS_ONE,
    Bytes.fromHexString('0x00'),
    pluginId,
    helperIds,
    Bytes.fromHexString('0x00')
  );

  handleUpdatePrepared(updateEvent);

  assert.fieldEquals('Plugin', pluginId, 'sender', ADDRESS_ZERO);
  assert.fieldEquals(
    'Plugin',
    pluginId,
    'dao',
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals('Plugin', pluginId, 'pluginSetup', ADDRESS_ONE);
  assert.fieldEquals('Plugin', pluginId, 'state', 'UpdatePrepared');

  // Plugin Entity exists. previous tests would have failed if not
  let pluginEntity = Plugin.load(pluginId) as Plugin;
  assert.bytesEquals(pluginEntity.data, Bytes.fromHexString('0x00'));

  // check if helpers exists
  for (let i = 0; i < helperIds.length; i++) {
    assert.fieldEquals('PluginHelper', helperIds[i], 'plugin', pluginId);
  }

  clearStore();
});

test('UpdatePrepared event (non existent plugin)', function() {
  let pluginId = ADDRESS_ONE;
  let helperIds = [ADDRESS_FOUR, ADDRESS_FIVE];
  let event = createUpdatePreparedEvent(
    ADDRESS_ONE,
    DAO_ADDRESS,
    ADDRESS_TWO,
    Bytes.fromHexString('0x00'),
    pluginId,
    helperIds,
    Bytes.fromHexString('0x00')
  );

  handleUpdatePrepared(event);

  assert.fieldEquals('Plugin', pluginId, 'sender', ADDRESS_ONE);
  assert.fieldEquals(
    'Plugin',
    pluginId,
    'dao',
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals('Plugin', pluginId, 'pluginSetup', ADDRESS_TWO);
  assert.fieldEquals('Plugin', pluginId, 'state', 'UpdatePrepared');

  // Plugin Entity exists. previous tests would have failed if not
  let pluginEntity = Plugin.load(pluginId) as Plugin;
  assert.bytesEquals(pluginEntity.data, Bytes.fromHexString('0x00'));

  // check if helpers exists
  for (let i = 0; i < helperIds.length; i++) {
    assert.fieldEquals('PluginHelper', helperIds[i], 'plugin', pluginId);
  }

  clearStore();
});

test('UpdateApplied event (existent plugin)', function() {
  let pluginId = ADDRESS_THREE;
  let preparedEvent = createInstallationPreparedEvent(
    ADDRESS_ONE,
    DAO_ADDRESS,
    ADDRESS_TWO,
    Bytes.fromHexString('0x00'),
    pluginId,
    [ADDRESS_FOUR, ADDRESS_FIVE]
  );

  handleInstallationPrepared(preparedEvent);
  let appliedEvent = createUpdateAppliedEvent(DAO_ADDRESS, pluginId);

  handleUpdateApplied(appliedEvent);

  assert.fieldEquals('Plugin', pluginId, 'sender', ADDRESS_ONE);
  assert.fieldEquals(
    'Plugin',
    pluginId,
    'dao',
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals('Plugin', pluginId, 'pluginSetup', ADDRESS_TWO);
  assert.fieldEquals('Plugin', pluginId, 'state', 'Installed');

  clearStore();
});

test('UpdateApplied event (non existent plugin)', function() {
  let pluginId = ADDRESS_ONE;
  let event = createUpdateAppliedEvent(DAO_ADDRESS, pluginId);

  handleUpdateApplied(event);

  assert.fieldEquals('Plugin', pluginId, 'sender', ADDRESS_ZERO);
  assert.fieldEquals(
    'Plugin',
    pluginId,
    'dao',
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals('Plugin', pluginId, 'state', 'Installed');

  clearStore();
});

test('UninstallationPrepared event (existent plugin)', function() {
  let pluginId = ADDRESS_THREE;
  let helperIds = [ADDRESS_THREE, ADDRESS_FOUR];
  let preparedEvent = createInstallationPreparedEvent(
    ADDRESS_ONE,
    DAO_ADDRESS,
    ADDRESS_TWO,
    Bytes.fromHexString('0x00'),
    pluginId,
    [ADDRESS_FOUR, ADDRESS_FIVE]
  );

  handleInstallationPrepared(preparedEvent);
  let updateEvent = createUninstallationPreparedEvent(
    ADDRESS_ZERO,
    DAO_ADDRESS,
    ADDRESS_ONE,
    Bytes.fromHexString('0x00'),
    pluginId,
    helperIds
  );

  handleUninstallationPrepared(updateEvent);

  assert.fieldEquals('Plugin', pluginId, 'sender', ADDRESS_ZERO);
  assert.fieldEquals(
    'Plugin',
    pluginId,
    'dao',
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals('Plugin', pluginId, 'pluginSetup', ADDRESS_ONE);
  assert.fieldEquals('Plugin', pluginId, 'state', 'UninstallPrepared');

  // Plugin Entity exists. previous tests would have failed if not
  let pluginEntity = Plugin.load(pluginId) as Plugin;
  assert.bytesEquals(pluginEntity.data, Bytes.fromHexString('0x00'));

  // check if helpers exists
  for (let i = 0; i < helperIds.length; i++) {
    assert.fieldEquals('PluginHelper', helperIds[i], 'plugin', pluginId);
  }

  clearStore();
});

test('UninstallationPrepared event (non existent plugin)', function() {
  let pluginId = ADDRESS_ONE;
  let helperIds = [ADDRESS_FOUR, ADDRESS_FIVE];
  let event = createUninstallationPreparedEvent(
    ADDRESS_ONE,
    DAO_ADDRESS,
    ADDRESS_TWO,
    Bytes.fromHexString('0x00'),
    pluginId,
    helperIds
  );

  handleUninstallationPrepared(event);

  assert.fieldEquals('Plugin', pluginId, 'sender', ADDRESS_ONE);
  assert.fieldEquals(
    'Plugin',
    pluginId,
    'dao',
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals('Plugin', pluginId, 'pluginSetup', ADDRESS_TWO);
  assert.fieldEquals('Plugin', pluginId, 'state', 'UninstallPrepared');

  // Plugin Entity exists. previous tests would have failed if not
  let pluginEntity = Plugin.load(pluginId) as Plugin;
  assert.bytesEquals(pluginEntity.data, Bytes.fromHexString('0x00'));

  // check if helpers exists
  for (let i = 0; i < helperIds.length; i++) {
    assert.fieldEquals('PluginHelper', helperIds[i], 'plugin', pluginId);
  }

  clearStore();
});

test('UninstallationApplied event (existent plugin)', function() {
  let pluginId = ADDRESS_THREE;
  let preparedEvent = createInstallationPreparedEvent(
    ADDRESS_ONE,
    DAO_ADDRESS,
    ADDRESS_TWO,
    Bytes.fromHexString('0x00'),
    pluginId,
    [ADDRESS_FOUR, ADDRESS_FIVE]
  );

  handleInstallationPrepared(preparedEvent);
  let appliedEvent = createUninstallationAppliedEvent(DAO_ADDRESS, pluginId);

  handleUninstallationApplied(appliedEvent);

  assert.fieldEquals('Plugin', pluginId, 'sender', ADDRESS_ONE);
  assert.fieldEquals(
    'Plugin',
    pluginId,
    'dao',
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals('Plugin', pluginId, 'pluginSetup', ADDRESS_TWO);
  assert.fieldEquals('Plugin', pluginId, 'state', 'Uninstalled');

  clearStore();
});

test('UninstallationApplied event (non existent plugin)', function() {
  let pluginId = ADDRESS_ONE;
  let event = createUninstallationAppliedEvent(DAO_ADDRESS, pluginId);

  handleUninstallationApplied(event);

  assert.fieldEquals('Plugin', pluginId, 'sender', ADDRESS_ZERO);
  assert.fieldEquals(
    'Plugin',
    pluginId,
    'dao',
    Address.fromHexString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals('Plugin', pluginId, 'state', 'Uninstalled');

  clearStore();
});
