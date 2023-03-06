import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {ADDRESS_ONE, ONE} from '../constants';
import {createReleaseMetadataUpdatedEvent, createVersionCreated} from './utils';
import {
  handleReleaseMetadataUpdated,
  handleVersionCreated
} from '../../src/plugin/pluginRepo';
import {Bytes} from '@graphprotocol/graph-ts';

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

  let pluginRepoId = event.address.toHexString();

  let pluginVersionId = pluginRepoId
    .concat('_')
    .concat(release)
    .concat('_')
    .concat(build);

  let pluginReleaseId = pluginRepoId.concat('_').concat(release);

  assert.entityCount('PluginVersion', 1);
  assert.fieldEquals('PluginVersion', pluginVersionId, 'id', pluginVersionId);
  assert.fieldEquals(
    'PluginVersion',
    pluginVersionId,
    'pluginRepo',
    event.address.toHexString()
  );
  assert.fieldEquals(
    'PluginVersion',
    pluginVersionId,
    'release',
    pluginReleaseId
  );
  assert.fieldEquals('PluginVersion', pluginVersionId, 'build', build);
  assert.fieldEquals(
    'PluginVersion',
    pluginVersionId,
    'pluginSetup',
    pluginSetup
  );
  assert.fieldEquals(
    'PluginVersion',
    pluginVersionId,
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

  let pluginRepoId = event.address.toHexString();
  let pluginReleaseEntityId = pluginRepoId.concat('_').concat(release);

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
    pluginRepoId
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
