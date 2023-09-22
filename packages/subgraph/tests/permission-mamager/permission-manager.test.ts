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
  Granted as RepoGrantedEvent,
  Revoked as RepoRevokedEvent
} from '../../generated/templates/PluginRepoTemplate/PluginRepo';
import {
  Granted as DaoGrantedEvent,
  Revoked as DaoRevokedEvent
} from '../../generated/templates/DaoTemplateV1_0_0/DAO';

const daoId = Address.fromString(DAO_ADDRESS).toHexString();
const pluginRepoId = Address.fromString(CONTRACT_ADDRESS).toHexString();

// DAO
test('Run dao (handleGranted) mappings with mock event', () => {
  let permission = new ExtendedPermission().withDefaultValues(daoId);
  permission.dao = daoId;

  let grantedEvent = permission.createEvent_Granted<DaoGrantedEvent>(daoId);

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
  let revokedEvent = permission.createEvent_Revoked<DaoRevokedEvent>(daoId);

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

  let grantedEvent = permission.createEvent_Granted<RepoGrantedEvent>(
    pluginRepoId
  );

  // handle event
  repoHandleGranted(grantedEvent);

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
  let revokedEvent = permission.createEvent_Revoked<RepoRevokedEvent>(
    pluginRepoId
  );

  // handle event
  repoHandleRevoked(revokedEvent);

  // checks
  assert.notInStore('Permission', permission.id);

  clearStore();
});
