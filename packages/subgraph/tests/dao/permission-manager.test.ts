import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address} from '@graphprotocol/graph-ts';

import {handleGranted, handleRevoked} from '../../src/dao/dao_v1_0_0';

import {DAO_ADDRESS} from '../constants';
import {getEXECUTE_PERMISSION_ID} from './utils';
import {ExtendedPermission} from '../helpers/extended-schema';

const daoId = Address.fromString(DAO_ADDRESS).toHexString();

test('Run dao (handleGranted) mappings with mock event', () => {
  let permission = new ExtendedPermission().withDefaultValues(daoId);
  permission.dao = daoId;

  let grantedEvent = permission.createEvent_Granted(daoId);

  // handle event
  handleGranted(grantedEvent);

  // checks
  permission.assertEntity();

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
