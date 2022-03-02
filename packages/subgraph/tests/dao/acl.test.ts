import {assert, clearStore, test, logStore} from 'matchstick-as/assembly/index';
import {Address, BigInt, ByteArray, Bytes} from '@graphprotocol/graph-ts';
import {
  createNewFrozenEvent,
  createNewGrantedEvent,
  createNewRevokedEvent,
  getEXEC_ROLE,
  getEXEC_ROLEreverted,
  getParticipationRequiredPct,
  getSupportRequiredPct,
  getSVToken,
  getVotesLength,
  getMinDuration,
  getWhiteListed,
  getWhitelistedLength
} from './utils';
import {
  DAO_ADDRESS,
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  ONE_ETH,
  STRING_DATA,
  HALF_ETH,
  ADDRESS_ZERO,
  VOTING_ADDRESS,
  ADDRESS_TWO
} from '../constants';
import {handleFrozen, handleGranted, handleRevoked} from '../../src/dao/dao';
import {crypto} from '@graphprotocol/graph-ts';
import {createTokenCalls} from '../utils';

test('Run dao (handleGranted) mappings with mock event', () => {
  // create event and run it's handler
  let role = Bytes.fromByteArray(
    crypto.keccak256(ByteArray.fromUTF8('EXEC_ROLE'))
  );
  let grantedEvent = createNewGrantedEvent(
    role,
    ADDRESS_ONE,
    VOTING_ADDRESS,
    DAO_ADDRESS,
    ADDRESS_TWO,
    DAO_ADDRESS
  );

  // launch calls
  createTokenCalls(DAO_TOKEN_ADDRESS, 'DAO Token', 'DAOT', '6');
  getEXEC_ROLE(DAO_ADDRESS, role);
  getSupportRequiredPct(VOTING_ADDRESS, BigInt.fromString(ONE_ETH));
  getParticipationRequiredPct(VOTING_ADDRESS, BigInt.fromString(ONE_ETH));
  getMinDuration(VOTING_ADDRESS, BigInt.fromString(ONE_ETH));
  getVotesLength(VOTING_ADDRESS, BigInt.fromString(ONE_ETH));
  getSVToken(VOTING_ADDRESS, DAO_TOKEN_ADDRESS);
  getWhiteListed(VOTING_ADDRESS, ADDRESS_ZERO, false);
  getWhitelistedLength(VOTING_ADDRESS, '1');

  // handle event
  handleGranted(grantedEvent);

  // checks
  // role
  let roleEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() + '_' + role.toHexString();

  assert.fieldEquals('Role', roleEntityID, 'id', roleEntityID);
  assert.fieldEquals(
    'Role',
    roleEntityID,
    'dao',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals(
    'Role',
    roleEntityID,
    'where',
    Address.fromString(DAO_ADDRESS).toHexString()
  );
  assert.fieldEquals('Role', roleEntityID, 'role', role.toHexString());
  assert.fieldEquals('Role', roleEntityID, 'frozen', 'false');

  // permission
  let permissionEntityID =
    roleEntityID + '_' + Address.fromString(VOTING_ADDRESS).toHexString();

  assert.fieldEquals(
    'Permission',
    permissionEntityID,
    'id',
    permissionEntityID
  );

  // governance
  let daoPackageEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    Address.fromString(VOTING_ADDRESS).toHexString();

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
    ADDRESS_ONE,
    VOTING_ADDRESS,
    DAO_ADDRESS,
    ADDRESS_TWO,
    DAO_ADDRESS
  );

  // launch calls
  createTokenCalls(DAO_TOKEN_ADDRESS, 'DAO Token', 'DAOT', '6');
  getEXEC_ROLEreverted(DAO_ADDRESS);
  getWhiteListed(VOTING_ADDRESS, ADDRESS_ZERO, false);
  getWhitelistedLength(VOTING_ADDRESS, '1');

  // handle event
  handleGranted(grantedEvent);

  // checks
  // role
  let roleEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() + '_' + role.toHexString();

  assert.fieldEquals('Role', roleEntityID, 'id', roleEntityID);

  // governance
  let daoPackageEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() +
    '_' +
    Address.fromString(VOTING_ADDRESS).toHexString();

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
    ADDRESS_ONE,
    VOTING_ADDRESS,
    DAO_ADDRESS,
    ADDRESS_TWO,
    DAO_ADDRESS
  );
  // launch calls
  createTokenCalls(DAO_TOKEN_ADDRESS, 'DAO Token', 'DAOT', '6');
  getEXEC_ROLE(DAO_ADDRESS, role);

  // handle event
  handleGranted(grantedEvent);

  // checks
  // role
  let roleEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() + '_' + role.toHexString();
  // permission
  let permissionEntityID =
    roleEntityID + '_' + Address.fromString(VOTING_ADDRESS).toHexString();

  assert.fieldEquals(
    'Permission',
    permissionEntityID,
    'id',
    permissionEntityID
  );

  // create event and run it's handler
  let revokedEvent = createNewRevokedEvent(
    role,
    ADDRESS_ONE,
    VOTING_ADDRESS,
    DAO_ADDRESS,
    DAO_ADDRESS
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
    ADDRESS_ONE,
    VOTING_ADDRESS,
    DAO_ADDRESS,
    ADDRESS_TWO,
    DAO_ADDRESS
  );
  // launch calls
  createTokenCalls(DAO_TOKEN_ADDRESS, 'DAO Token', 'DAOT', '6');
  getEXEC_ROLE(DAO_ADDRESS, role);

  // handle event
  handleGranted(grantedEvent);

  // checks
  // role
  let roleEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() + '_' + role.toHexString();

  assert.fieldEquals('Role', roleEntityID, 'id', roleEntityID);
  assert.fieldEquals('Role', roleEntityID, 'frozen', 'false');

  // create event and run it's handler
  let frozenEvent = createNewFrozenEvent(
    role,
    ADDRESS_ONE,
    DAO_ADDRESS,
    DAO_ADDRESS
  );

  // handle event
  handleFrozen(frozenEvent);

  // checks
  assert.fieldEquals('Role', roleEntityID, 'frozen', 'true');

  clearStore();
});
