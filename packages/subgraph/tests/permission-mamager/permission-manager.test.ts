import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address} from '@graphprotocol/graph-ts';

import {
  handleGranted as daoHandleGranted,
  handleRevoked as daoHandleRevoked
} from '../../src/dao/dao_v1_0_0';
import {
  handleGranted as repoHandleGranted,
  handleRevoked as repoHandleRevoked
} from '../../src/plugin/pluginRepo';

import {CONTRACT_ADDRESS, DAO_ADDRESS} from '../constants';
import {ExtendedPermission} from '../helpers/extended-schema';
import {
  Granted as RepoGranted,
  Revoked as RepoRevoked
} from '../../generated/templates/PluginRepoTemplate/PluginRepo';

const daoId = Address.fromString(DAO_ADDRESS).toHexString();
const pluginRepoId = Address.fromString(CONTRACT_ADDRESS).toHexString();

// DAO
test('Run dao (handleGranted) mappings with mock event', () => {
  let permission = new ExtendedPermission().withDefaultValues(daoId);
  permission.dao = daoId;

  let grantedEvent = permission.createEvent_Granted(daoId);

  // handle event
  daoHandleGranted(grantedEvent);

  // checks
  permission.assertEntity(true);

  clearStore();
});

test('Run dao (handleRevoked) mappings with mock event', () => {
  let permission = new ExtendedPermission().withDefaultValues(daoId);
  permission.dao = daoId;

  permission.save();

  // check state exist
  permission.assertEntity();

  // create event and run it's handler
  let revokedEvent = permission.createEvent_Revoked(daoId);

  // handle event
  daoHandleRevoked(revokedEvent);

  // checks
  assert.notInStore('Permission', permission.id);

  clearStore();
});

// PluginRepo
test('Run PluginRepo (handleGranted) mappings with mock event', () => {
  let permission = new ExtendedPermission().withDefaultValues(pluginRepoId);
  permission.pluginRepo = pluginRepoId;

  let grantedEvent = permission.createEvent_Granted(pluginRepoId);

  // handle event
  repoHandleGranted(changetype<RepoGranted>(grantedEvent));

  // checks
  permission.assertEntity(true);

  clearStore();
});

test('Run PluginRepo (handleRevoked) mappings with mock event', () => {
  let permission = new ExtendedPermission().withDefaultValues(pluginRepoId);
  permission.pluginRepo = pluginRepoId;

  permission.save();

  // check state exist
  permission.assertEntity();

  // create event and run it's handler
  let revokedEvent = permission.createEvent_Revoked(pluginRepoId);

  // handle event
  repoHandleRevoked(changetype<RepoRevoked>(revokedEvent));

  // checks
  assert.notInStore('Permission', permission.id);

  clearStore();
});
