import {assert, clearStore, test, logStore} from 'matchstick-as/assembly/index';
import {Address, ByteArray, Bytes} from '@graphprotocol/graph-ts';
import {
  createNewFrozenEvent,
  createNewGrantedEvent,
  createNewRevokedEvent,
  getEXEC_ROLE,
  getEXEC_ROLEreverted
} from './utils';
import {
  daoAddress,
  addressOne,
  daiAddress,
  oneEth,
  dataString,
  halfEth,
  addressZero,
  votingAddress,
  addressTwo
} from '../constants';
import {handleFrozen, handleGranted, handleRevoked} from '../../src/dao/dao';
import {crypto} from '@graphprotocol/graph-ts';

test('Run dao (handleGranted) mappings with mock event', () => {
  // create event and run it's handler
  let role = Bytes.fromByteArray(
    crypto.keccak256(ByteArray.fromUTF8('EXEC_ROLE'))
  );
  let grantedEvent = createNewGrantedEvent(
    role,
    addressOne,
    votingAddress,
    daoAddress,
    addressTwo,
    daoAddress
  );

  // launch calls
  getEXEC_ROLE(daoAddress, role);

  // handle event
  handleGranted(grantedEvent);

  // checks
  // role
  let roleEntityID =
    Address.fromString(daoAddress).toHexString() + '_' + role.toHexString();

  assert.fieldEquals('Role', roleEntityID, 'id', roleEntityID);
  assert.fieldEquals(
    'Role',
    roleEntityID,
    'dao',
    Address.fromString(daoAddress).toHexString()
  );
  assert.fieldEquals(
    'Role',
    roleEntityID,
    'where',
    Address.fromString(daoAddress).toHexString()
  );
  assert.fieldEquals('Role', roleEntityID, 'role', role.toHexString());
  assert.fieldEquals('Role', roleEntityID, 'frozen', 'false');

  // permission
  let permissionEntityID =
    roleEntityID + '_' + Address.fromString(votingAddress).toHexString();

  assert.fieldEquals(
    'Permission',
    permissionEntityID,
    'id',
    permissionEntityID
  );

  // governance
  let daoPackageEntityID =
    Address.fromString(daoAddress).toHexString() +
    '_' +
    Address.fromString(votingAddress).toHexString();

  assert.fieldEquals(
    'DaoPackage',
    daoPackageEntityID,
    'id',
    daoPackageEntityID
  );

  clearStore();
});

test('Run dao (handleGranted) mappings with reverted mocke call', () => {
  // create event and run it's handler
  let role = Bytes.fromByteArray(
    crypto.keccak256(ByteArray.fromUTF8('EXEC_ROLE'))
  );
  let grantedEvent = createNewGrantedEvent(
    role,
    addressOne,
    votingAddress,
    daoAddress,
    addressTwo,
    daoAddress
  );

  // launch calls
  getEXEC_ROLEreverted(daoAddress);

  // handle event
  handleGranted(grantedEvent);

  // checks
  // role
  let roleEntityID =
    Address.fromString(daoAddress).toHexString() + '_' + role.toHexString();

  assert.fieldEquals('Role', roleEntityID, 'id', roleEntityID);

  // governance
  let daoPackageEntityID =
    Address.fromString(daoAddress).toHexString() +
    '_' +
    Address.fromString(votingAddress).toHexString();

  assert.notInStore('DaoPackage', daoPackageEntityID);

  clearStore();
});

test('Run dao (handleRevoked) mappings with mock event', () => {
  let role = Bytes.fromByteArray(
    crypto.keccak256(ByteArray.fromUTF8('EXEC_ROLE'))
  );

  // first Grant a permission
  let grantedEvent = createNewGrantedEvent(
    role,
    addressOne,
    votingAddress,
    daoAddress,
    addressTwo,
    daoAddress
  );
  // launch calls
  getEXEC_ROLE(daoAddress, role);
  // handle event
  handleGranted(grantedEvent);

  // checks
  // role
  let roleEntityID =
    Address.fromString(daoAddress).toHexString() + '_' + role.toHexString();
  // permission
  let permissionEntityID =
    roleEntityID + '_' + Address.fromString(votingAddress).toHexString();

  assert.fieldEquals(
    'Permission',
    permissionEntityID,
    'id',
    permissionEntityID
  );

  // create event and run it's handler
  let revokedEvent = createNewRevokedEvent(
    role,
    addressOne,
    votingAddress,
    daoAddress,
    daoAddress
  );

  // handle event
  handleRevoked(revokedEvent);

  // checks
  // permission
  assert.notInStore('Permission', permissionEntityID);

  clearStore();
});

test('Run dao (handleFrozen) mappings with mock event', () => {
  let role = Bytes.fromByteArray(
    crypto.keccak256(ByteArray.fromUTF8('EXEC_ROLE'))
  );

  // first Grant a permission
  let grantedEvent = createNewGrantedEvent(
    role,
    addressOne,
    votingAddress,
    daoAddress,
    addressTwo,
    daoAddress
  );
  // launch calls
  getEXEC_ROLE(daoAddress, role);
  // handle event
  handleGranted(grantedEvent);

  // checks
  // role
  let roleEntityID =
    Address.fromString(daoAddress).toHexString() + '_' + role.toHexString();

  assert.fieldEquals('Role', roleEntityID, 'id', roleEntityID);
  assert.fieldEquals('Role', roleEntityID, 'frozen', 'false');

  // create event and run it's handler
  let frozenEvent = createNewFrozenEvent(
    role,
    addressOne,
    daoAddress,
    daoAddress
  );

  // handle event
  handleFrozen(frozenEvent);

  // checks
  assert.fieldEquals('Role', roleEntityID, 'frozen', 'true');

  clearStore();
});
