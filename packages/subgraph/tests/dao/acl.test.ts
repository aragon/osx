import {assert, clearStore, test} from 'matchstick-as/assembly/index';
import {Address, BigInt, ByteArray, Bytes} from '@graphprotocol/graph-ts';
import {
  createNewFrozenEvent,
  createNewGrantedEvent,
  createNewRevokedEvent,
  getEXEC_ROLE,
  getEXEC_ROLEreverted,
  getParticipationRequiredPct,
  getSupportRequiredPct,
  getVotingToken,
  getVotesLength,
  getMinDuration,
  getSupportsInterface
} from './utils';
import {
  DAO_ADDRESS,
  ADDRESS_ONE,
  DAO_TOKEN_ADDRESS,
  ONE_ETH,
  VOTING_ADDRESS,
  ADDRESS_TWO
} from '../constants';
import {handleFrozen, handleGranted, handleRevoked} from '../../src/dao/dao';
import {crypto} from '@graphprotocol/graph-ts';
import {createTokenCalls} from '../utils';
import {Permission, Role} from '../../generated/schema';
import {
  ERC20_VOTING_INTERFACE,
  WHITELIST_VOTING_INTERFACE
} from '../../src/utils/constants';

let role = Bytes.fromByteArray(
  crypto.keccak256(ByteArray.fromUTF8('EXEC_ROLE'))
);

function testPackages(supportsErc20VotingInterface: boolean): void {
  // create event and run it's handler
  let grantedEvent = createNewGrantedEvent(
    role,
    ADDRESS_ONE,
    VOTING_ADDRESS,
    DAO_ADDRESS,
    ADDRESS_TWO,
    DAO_ADDRESS
  );

  // launch calls
  getEXEC_ROLE(DAO_ADDRESS, role);
  getSupportRequiredPct(VOTING_ADDRESS, BigInt.fromString(ONE_ETH));
  getParticipationRequiredPct(VOTING_ADDRESS, BigInt.fromString(ONE_ETH));
  getMinDuration(VOTING_ADDRESS, BigInt.fromString(ONE_ETH));
  getVotesLength(VOTING_ADDRESS, BigInt.fromString(ONE_ETH));

  if (supportsErc20VotingInterface) {
    createTokenCalls(DAO_TOKEN_ADDRESS, 'DAO Token', 'DAOT', '6');
    getVotingToken(VOTING_ADDRESS, DAO_TOKEN_ADDRESS);
    getSupportsInterface(
      VOTING_ADDRESS,
      ERC20_VOTING_INTERFACE,
      supportsErc20VotingInterface
    );
    getSupportsInterface(VOTING_ADDRESS, WHITELIST_VOTING_INTERFACE, false);
  } else {
    getSupportsInterface(
      VOTING_ADDRESS,
      ERC20_VOTING_INTERFACE,
      supportsErc20VotingInterface
    );
    getSupportsInterface(VOTING_ADDRESS, WHITELIST_VOTING_INTERFACE, true);
  }

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

  // packages
  if (supportsErc20VotingInterface) {
    assert.fieldEquals(
      'ERC20VotingPackage',
      Address.fromString(VOTING_ADDRESS).toHexString(),
      'id',
      Address.fromString(VOTING_ADDRESS).toHexString()
    );
  } else {
    assert.fieldEquals(
      'WhitelistPackage',
      Address.fromString(VOTING_ADDRESS).toHexString(),
      'id',
      Address.fromString(VOTING_ADDRESS).toHexString()
    );
  }

  clearStore();
}

test('Run dao (handleGranted) mappings with mock event for ERC20 Voting', () => {
  testPackages(true);
});

test('Run dao (handleGranted) mappings with mock event for Whitelist Voting', () => {
  testPackages(false);
});

test('Run dao (handleGranted) mappings with reverted mocke call', () => {
  // create event and run it's handler
  let grantedEvent = createNewGrantedEvent(
    role,
    ADDRESS_ONE,
    VOTING_ADDRESS,
    DAO_ADDRESS,
    ADDRESS_TWO,
    DAO_ADDRESS
  );

  // launch calls
  getEXEC_ROLEreverted(DAO_ADDRESS);

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
  // create state
  let roleEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() + '_' + role.toHexString();
  // permission
  let permissionEntityID =
    roleEntityID + '_' + Address.fromString(VOTING_ADDRESS).toHexString();

  let roleEntity = new Role(roleEntityID);
  roleEntity.dao = Address.fromString(DAO_ADDRESS).toHexString();
  roleEntity.where = Address.fromString(DAO_ADDRESS);
  roleEntity.role = role;
  roleEntity.frozen = false;
  roleEntity.save();

  let permissionEntity = new Permission(permissionEntityID);
  permissionEntity.role = roleEntity.id;
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
    role,
    ADDRESS_ONE,
    VOTING_ADDRESS,
    DAO_ADDRESS,
    DAO_ADDRESS
  );

  getEXEC_ROLE(DAO_ADDRESS, role);

  // handle event
  handleRevoked(revokedEvent);

  // checks
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

  assert.notInStore('Permission', permissionEntityID);

  clearStore();
});

test('Run dao (handleFrozen) mappings with mock event', () => {
  // create state
  let roleEntityID =
    Address.fromString(DAO_ADDRESS).toHexString() + '_' + role.toHexString();

  let roleEntity = new Role(roleEntityID);
  roleEntity.dao = Address.fromString(DAO_ADDRESS).toHexString();
  roleEntity.where = Address.fromString(DAO_ADDRESS);
  roleEntity.role = role;
  roleEntity.frozen = false;
  roleEntity.save();

  // check state exist
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
  assert.fieldEquals('Role', roleEntityID, 'frozen', 'true');

  clearStore();
});
