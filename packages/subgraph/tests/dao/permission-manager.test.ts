import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, ByteArray, Bytes, crypto} from '@graphprotocol/graph-ts';

import {handleFrozen, handleGranted, handleRevoked} from '../../src/dao/dao';
import {Permission, ContractPermissionId} from '../../generated/schema';
import {
  DAO_ADDRESS,
  ADDRESS_ONE,
  CONTRACT_ADDRESS,
  ADDRESS_TWO
} from '../constants';
import {
  createNewFrozenEvent,
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
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'frozen',
    'false'
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
  contractPermissionIdEntity.frozen = false;
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
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'frozen',
    'false'
  );

  assert.notInStore('Permission', permissionEntityID);

  clearStore();
});

test('Run dao (handleFrozen) mappings with mock event', () => {
  // create state
  let contractPermissionIdEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    contractPermissionId.toHexString();

  let contractPermissionIdEntity = new ContractPermissionId(
    contractPermissionIdEntityID
  );
  contractPermissionIdEntity.dao = Address.fromString(
    DAO_ADDRESS
  ).toHexString();
  contractPermissionIdEntity.where = Address.fromString(DAO_ADDRESS);
  contractPermissionIdEntity.permissionId = contractPermissionId;
  contractPermissionIdEntity.frozen = false;
  contractPermissionIdEntity.save();

  // check state exist
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'id',
    contractPermissionIdEntityID
  );
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'frozen',
    'false'
  );

  // create event and run it's handler
  let frozenEvent = createNewFrozenEvent(
    contractPermissionId,
    ADDRESS_ONE,
    DAO_ADDRESS,
    DAO_ADDRESS
  );

  // handle event
  handleFrozen(frozenEvent);

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
  assert.fieldEquals(
    'ContractPermissionId',
    contractPermissionIdEntityID,
    'frozen',
    'true'
  );

  clearStore();
});
