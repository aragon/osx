import {
  handleReleaseMetadataUpdated,
  handleVersionCreated,
} from '../../src/plugin/pluginRepo';
import {ADDRESS_ONE, ONE} from '../constants';
import {createReleaseMetadataUpdatedEvent, createVersionCreated} from './utils';
import {
  generatePluginReleaseEntityId,
  generatePluginRepoEntityId,
  generatePluginVersionEntityId,
} from '@aragon/osx-commons-subgraph';
import {Bytes} from '@graphprotocol/graph-ts';
import {assert, clearStore, test} from 'matchstick-as/assembly/index';

test('PluginRepo (handleVersionCreated) mappings with mock event', () => {
  let release = ONE;
  let build = ONE;
  let pluginSetup = ADDRESS_ONE;
  let buildMetadata = 'Qm1234';

  let event = createVersionCreated(
    release,
    build,
    pluginSetup,
    Bytes.fromUTF8(buildMetadata)
  );

  handleVersionCreated(event);

  let pluginVersionEntityId = generatePluginVersionEntityId(
    event.address,
    parseInt(release) as i32,
    parseInt(build) as i32
  );

  let pluginReleaseEntityId = generatePluginReleaseEntityId(
    event.address,
    parseInt(release) as i32
  );

  assert.entityCount('PluginVersion', 1);
  assert.fieldEquals(
    'PluginVersion',
    pluginVersionEntityId,
    'id',
    pluginVersionEntityId
  );
  assert.fieldEquals(
    'PluginVersion',
    pluginVersionEntityId,
    'pluginRepo',
    event.address.toHexString()
  );
  assert.fieldEquals(
    'PluginVersion',
    pluginVersionEntityId,
    'release',
    pluginReleaseEntityId
  );
  assert.fieldEquals('PluginVersion', pluginVersionEntityId, 'build', build);
  assert.fieldEquals(
    'PluginVersion',
    pluginVersionEntityId,
    'pluginSetup',
    pluginSetup
  );
  assert.fieldEquals(
    'PluginVersion',
    pluginVersionEntityId,
    'metadata',
    buildMetadata
  );

  assert.entityCount('PluginSetup', 1);
  assert.fieldEquals('PluginSetup', pluginSetup, 'id', pluginSetup);

  clearStore();
});

test('PluginRepo (handleReleaseMetadataUpdated) mappings with mock event', () => {
  let release = ONE;
  let releaseMetadata = 'Qm1234';

  let event = createReleaseMetadataUpdatedEvent(
    release,
    Bytes.fromUTF8(releaseMetadata)
  );

  handleReleaseMetadataUpdated(event);

  assert.entityCount('PluginRelease', 1);

  let pluginRepoEntityId = generatePluginRepoEntityId(event.address);
  let pluginReleaseEntityId = generatePluginReleaseEntityId(
    event.address,
    parseInt(release) as i32
  );

  assert.fieldEquals(
    'PluginRelease',
    pluginReleaseEntityId,
    'id',
    pluginReleaseEntityId
  );
  assert.fieldEquals(
    'PluginRelease',
    pluginReleaseEntityId,
    'pluginRepo',
    pluginRepoEntityId
  );
  assert.fieldEquals(
    'PluginRelease',
    pluginReleaseEntityId,
    'release',
    release
  );
  assert.fieldEquals(
    'PluginRelease',
    pluginReleaseEntityId,
    'metadata',
    releaseMetadata
  );

  // simulated update of release metadata
  let updatedMetadata = 'Qm5678';
  let updatingMetadataEvent = createReleaseMetadataUpdatedEvent(
    release,
    Bytes.fromUTF8(updatedMetadata)
  );
  handleReleaseMetadataUpdated(updatingMetadataEvent);

  assert.entityCount('PluginRelease', 1);

  assert.fieldEquals(
    'PluginRelease',
    pluginReleaseEntityId,
    'metadata',
    updatedMetadata
  );
});
