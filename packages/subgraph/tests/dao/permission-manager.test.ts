import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, ByteArray, Bytes, crypto} from '@graphprotocol/graph-ts';

import {handleGranted, handleRevoked} from '../../src/dao/dao_v1_0_0';
import {Permission} from '../../generated/schema';
import {
  DAO_ADDRESS,
  ADDRESS_ONE,
  CONTRACT_ADDRESS,
  ADDRESS_TWO,
  ADDRESS_THREE
} from '../constants';
import {
  createNewGrantedEvent,
  createNewRevokedEvent,
  getEXECUTE_PERMISSION_ID,
  getEXECUTE_PERMISSION_IDreverted
} from './utils';

const contractPermissionId = Bytes.fromByteArray(
  crypto.keccak256(ByteArray.fromUTF8('EXECUTE_PERMISSION'))
);

const daoId = Address.fromString(DAO_ADDRESS).toHexString();
const where = Address.fromString(CONTRACT_ADDRESS);
const who = Address.fromString(ADDRESS_ONE);
const actor = Address.fromString(ADDRESS_TWO);
const conditionAddress = ADDRESS_THREE;

test('Run dao (handleGranted) mappings with mock event', () => {
  // create event and run it's handler
  let grantedEvent = createNewGrantedEvent(
    contractPermissionId,
    actor.toHexString(),
    where.toHexString(),
    who.toHexString(),
    conditionAddress,
    daoId
  );

  // handle event
  handleGranted(grantedEvent);

  // checks
  let permissionEntityID = [
    daoId,
    where.toHexString(),
    contractPermissionId.toHexString(),
    who.toHexString()
  ].join('_');

  assert.fieldEquals(
    'Permission',
    permissionEntityID,
    'id',
    permissionEntityID
  );

  clearStore();
});

test('Run dao (handleGranted) mappings with reverted mocke call', () => {
  // create event and run it's handler
  let grantedEvent = createNewGrantedEvent(
    contractPermissionId,
    ADDRESS_ONE,
    DAO_ADDRESS,
    CONTRACT_ADDRESS,
    ADDRESS_TWO,
    DAO_ADDRESS
  );

  // launch calls
  getEXECUTE_PERMISSION_IDreverted(DAO_ADDRESS);

  // handle event
  handleGranted(grantedEvent);

  // checks

  // governance
  let daoPluginEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    Address.fromString(CONTRACT_ADDRESS).toHexString();

  assert.notInStore('DaoPlugin', daoPluginEntityID);

  clearStore();
});

test('Run dao (handleRevoked) mappings with mock event', () => {
  // permission
  let permissionEntityID = [
    daoId,
    where.toHexString(),
    contractPermissionId.toHexString(),
    who.toHexString()
  ].join('_');

  let permissionEntity = new Permission(permissionEntityID);
  permissionEntity.where = Address.fromString(CONTRACT_ADDRESS);
  permissionEntity.permissionId = contractPermissionId;
  permissionEntity.who = Address.fromString(ADDRESS_ONE);
  permissionEntity.actor = Address.fromString(ADDRESS_ONE);

  permissionEntity.dao = Address.fromString(DAO_ADDRESS).toHexString();

  permissionEntity.save();

  // check state exist
  assert.fieldEquals(
    'Permission',
    permissionEntityID,
    'id',
    permissionEntityID
  );

  // create event and run it's handler
  let revokedEvent = createNewRevokedEvent(
    contractPermissionId,
    actor.toHexString(),
    where.toHexString(),
    who.toHexString(),
    daoId
  );

  getEXECUTE_PERMISSION_ID(DAO_ADDRESS, contractPermissionId);

  // handle event
  handleRevoked(revokedEvent);

  // checks

  assert.notInStore('Permission', permissionEntityID);

  clearStore();
});
