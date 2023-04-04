import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, ByteArray, Bytes, crypto} from '@graphprotocol/graph-ts';

import {handleGranted, handleRevoked} from '../../src/dao/dao_v1_0_0';
import {Permission, ContractPermissionId} from '../../generated/schema';
import {
  DAO_ADDRESS,
  ADDRESS_ONE,
  CONTRACT_ADDRESS,
  ADDRESS_TWO
} from '../constants';
import {
  createNewGrantedEvent,
  createNewRevokedEvent,
  getEXECUTE_PERMISSION_ID,
  getEXECUTE_PERMISSION_IDreverted
} from './utils';

let contractPermissionId = Bytes.fromByteArray(
  crypto.keccak256(ByteArray.fromUTF8('EXECUTE_PERMISSION'))
);

test('Run dao (handleGranted) mappings with mock event', () => {
  // create event and run it's handler
  let grantedEvent = createNewGrantedEvent(
    contractPermissionId,
    ADDRESS_ONE,
    DAO_ADDRESS,
    CONTRACT_ADDRESS,
    ADDRESS_TWO,
    DAO_ADDRESS
  );

  // handle event
  handleGranted(grantedEvent);

  // checks
  // contractPermissionId
  let contractPermissionIdEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    contractPermissionId.toHexString();

  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'id',
    contractPermissionIdEntityID
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'dao',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'where',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'permissionId',
    contractPermissionId.toHexString()
  );

  // permission
  let permissionEntityID =
    contractPermissionIdEntityID +
    '_' +
    Address.fromString(CONTRACT_ADDRESS).toHexString();

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
  // contractPermissionId
  let contractPermissionIdEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    contractPermissionId.toHexString();

  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'id',
    contractPermissionIdEntityID
  );

  // governance
  let daoPluginEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    Address.fromString(CONTRACT_ADDRESS).toHexString();

  assert.notInStore('DaoPlugin', daoPluginEntityID);

  clearStore();
});

test('Run dao (handleRevoked) mappings with mock event', () => {
  // create state
  let contractPermissionIdEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    contractPermissionId.toHexString();
  // permission
  let permissionEntityID =
    contractPermissionIdEntityID +
    '_' +
    Address.fromString(CONTRACT_ADDRESS).toHexString();

  let contractPermissionIdEntity = new ContractPermissionId(
    contractPermissionIdEntityID
  );
  contractPermissionIdEntity.dao = Address.fromString(
    DAO_ADDRESS
  ).toHexString();
  contractPermissionIdEntity.where = Address.fromString(DAO_ADDRESS);
  contractPermissionIdEntity.permissionId = contractPermissionId;
  contractPermissionIdEntity.save();

  let permissionEntity = new Permission(permissionEntityID);
  permissionEntity.contractPermissionId = contractPermissionIdEntity.id;
  permissionEntity.dao = Address.fromString(DAO_ADDRESS).toHexString();
  permissionEntity.where = Address.fromString(CONTRACT_ADDRESS);
  permissionEntity.contractPermissionId = contractPermissionId.toHexString();
  permissionEntity.who = Address.fromString(ADDRESS_ONE);
  permissionEntity.actor = Address.fromString(ADDRESS_ONE);
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
    ADDRESS_ONE,
    DAO_ADDRESS,
    CONTRACT_ADDRESS,
    DAO_ADDRESS
  );

  getEXECUTE_PERMISSION_ID(DAO_ADDRESS, contractPermissionId);

  // handle event
  handleRevoked(revokedEvent);

  // checks
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'id',
    contractPermissionIdEntityID
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'dao',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'where',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'permissionId',
    contractPermissionId.toHexString()
  );

  assert.notInStore('Permission', permissionEntityID);

  clearStore();
});
