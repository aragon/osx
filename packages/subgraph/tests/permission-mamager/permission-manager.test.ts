import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address} from '@graphprotocol/graph-ts';

import {handleGranted, handleRevoked} from '../../src/dao/dao_v1_0_0';

import {CONTRACT_ADDRESS, DAO_ADDRESS} from '../constants';
import {ExtendedPermission} from '../helpers/extended-schema';

const daoId = Address.fromString(DAO_ADDRESS).toHexString();
const pluginRepoId = Address.fromString(CONTRACT_ADDRESS).toHexString();

// DAO
test('Run dao (handleGranted) mappings with mock event', () => {
  let permission = new ExtendedPermission().withDefaultValues(daoId);
  permission.dao = daoId;

  let grantedEvent = permission.createEvent_Granted(daoId);

  // handle event
  handleGranted(grantedEvent);

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
  handleRevoked(revokedEvent);

  // checks
  assert.notInStore('Permission', permission.id);

  clearStore();
});
