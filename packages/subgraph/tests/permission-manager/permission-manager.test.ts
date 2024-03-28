import {
  Granted as DaoGrantedEvent,
  Revoked as DaoRevokedEvent,
} from '../../generated/templates/DaoTemplateV1_0_0/DAO';
import {
  Granted as RepoGrantedEvent,
  Revoked as RepoRevokedEvent,
} from '../../generated/templates/PluginRepoTemplate/PluginRepo';
import {
  handleGranted as daoHandleGranted,
  handleRevoked as daoHandleRevoked,
} from '../../src/dao/dao_v1_0_0';
import {
  handleGranted as repoHandleGranted,
  handleRevoked as repoHandleRevoked,
} from '../../src/plugin/pluginRepo';
import {CONTRACT_ADDRESS, DAO_ADDRESS} from '../constants';
import {ExtendedPermission} from '../helpers/extended-schema';
import {generateDaoEntityId} from '@aragon/osx-commons-subgraph';
import {Address} from '@graphprotocol/graph-ts';
import {assert, clearStore, test} from 'matchstick-as/assembly/index';

const daoAddress = Address.fromString(DAO_ADDRESS);
const pluginRepoAddress = Address.fromString(CONTRACT_ADDRESS);
const daoEntityId = generateDaoEntityId(daoAddress);
const pluginRepoEntityId = generateDaoEntityId(pluginRepoAddress);

// DAO
test('Run dao (handleGranted) mappings with mock event', () => {
  let permission = new ExtendedPermission().withDefaultValues(daoEntityId);
  permission.dao = daoEntityId;

  let grantedEvent =
    permission.createEvent_Granted<DaoGrantedEvent>(daoEntityId);

  // handle event
  daoHandleGranted(grantedEvent);

  // checks
  permission.assertEntity();

  clearStore();
});

test('Run dao (handleRevoked) mappings with mock event', () => {
  let permission = new ExtendedPermission().withDefaultValues(daoEntityId);
  permission.dao = daoEntityId;

  permission.save();

  // check state exist
  permission.assertEntity();

  // create event and run it's handler
  let revokedEvent =
    permission.createEvent_Revoked<DaoRevokedEvent>(daoEntityId);

  // handle event
  daoHandleRevoked(revokedEvent);

  // checks
  assert.notInStore('Permission', permission.id);

  clearStore();
});

// PluginRepo
test('Run PluginRepo (handleGranted) mappings with mock event', () => {
  let permission = new ExtendedPermission().withDefaultValues(
    pluginRepoEntityId
  );
  permission.pluginRepo = pluginRepoEntityId;

  let grantedEvent =
    permission.createEvent_Granted<RepoGrantedEvent>(pluginRepoEntityId);

  // handle event
  repoHandleGranted(grantedEvent);

  // checks
  permission.assertEntity();

  clearStore();
});

test('Run PluginRepo (handleRevoked) mappings with mock event', () => {
  let permission = new ExtendedPermission().withDefaultValues(
    pluginRepoEntityId
  );
  permission.pluginRepo = pluginRepoEntityId;

  permission.save();

  // check state exist
  permission.assertEntity();

  // create event and run it's handler
  let revokedEvent =
    permission.createEvent_Revoked<RepoRevokedEvent>(pluginRepoEntityId);

  // handle event
  repoHandleRevoked(revokedEvent);

  // checks
  assert.notInStore('Permission', permission.id);

  clearStore();
});
